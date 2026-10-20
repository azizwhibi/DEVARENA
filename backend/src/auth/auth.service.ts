import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { assertSafeAuthConfig } from './auth-config';
import type { AuthUser } from './auth.types';

@Injectable()
export class AuthService {
  private readonly bypass: boolean;
  private readonly devUserId: string | undefined;

  constructor(
    private readonly supabase: SupabaseService,
    config: ConfigService,
  ) {
    const env = {
      NODE_ENV: config.get<string>('NODE_ENV'),
      DEV_BYPASS_AUTH: config.get<string>('DEV_BYPASS_AUTH'),
      DEV_USER_ID: config.get<string>('DEV_USER_ID'),
    };
    assertSafeAuthConfig(env);
    this.bypass = env.DEV_BYPASS_AUTH === 'true';
    this.devUserId = env.DEV_USER_ID;
  }

  async authenticate(authorizationHeader?: string): Promise<AuthUser> {
    let id = this.devUserId;
    let claims: Record<string, unknown> | undefined;
    if (!this.bypass) {
      const token = /^Bearer\s+(\S+)$/i.exec(authorizationHeader ?? '')?.[1];
      if (!token) throw new UnauthorizedException();
      try {
        const { data, error } =
          await this.supabase.client.auth.getClaims(token);
        if (error || !data?.claims.sub || !isUUID(data.claims.sub)) {
          throw new UnauthorizedException();
        }
        id = data.claims.sub;
        claims = data.claims;
      } catch {
        throw new UnauthorizedException();
      }
    }
    if (!id) throw new UnauthorizedException();
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id,email,role,status')
      .eq('id', id)
      .maybeSingle<AuthUser>();
    if (error) throw new InternalServerErrorException('Could not load account');
    if (!data) throw new UnauthorizedException();
    if (data.status === 'suspended') {
      throw new ForbiddenException({
        message: 'Account suspended',
        code: 'account_suspended',
      });
    }
    const userProfile: AuthUser = { ...data };
    const metaRole = (
      claims?.user_metadata as Record<string, unknown> | undefined
    )?.role;
    if (userProfile.role === 'developer' && metaRole === 'recruiter') {
      await this.supabase.client
        .from('profiles')
        .update({ role: 'recruiter' })
        .eq('id', id);
      userProfile.role = 'recruiter';
    }
    return userProfile;
  }
}
