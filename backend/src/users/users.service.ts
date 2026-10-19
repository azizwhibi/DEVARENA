import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountService } from '../auth/account.service';
import type { Json } from '../supabase/database.types';
import type { UpdateProfileDto } from './dto/update-profile.dto';

interface TechRow {
  technology_id: string;
  technologies: TechnologyItem | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  institution: string | null;
  technologies: { id: string; name: string }[];
  visibility: string;
  createdAt: string;
  devScore: number | null;
  tier: string | null;
}

export interface TechnologyItem {
  id: string;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly supabaseUrl: string;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly accountService: AccountService,
    config: ConfigService,
  ) {
    this.supabaseUrl = (config.get<string>('SUPABASE_URL') ?? '').replace(
      /\/$/,
      '',
    );
  }

  assertValidAvatarUrl(avatarUrl: string, userId: string): void {
    const storagePrefix = `${this.supabaseUrl}/storage/v1/object/public/avatars/${userId}/`;
    const isOwnStorage = avatarUrl.startsWith(storagePrefix);
    const isGithub = avatarUrl.startsWith(
      'https://avatars.githubusercontent.com/',
    );
    const isGoogle = avatarUrl.startsWith('https://lh3.googleusercontent.com/');

    if (!isOwnStorage && !isGithub && !isGoogle) {
      throw new BadRequestException([
        'avatarUrl must be from allowed providers or your own avatars folder',
      ]);
    }
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const { data: profile, error: profileErr } = await this.supabase.client
      .from('profiles')
      .select(
        'id,email,username,role,avatar_url,bio,country,institution,visibility,created_at',
      )
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      throw new InternalServerErrorException('Could not load profile');
    }
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const { data: techRows, error: techErr } = await this.supabase.client
      .from('profile_technologies')
      .select('technology_id, technologies (id, name)')
      .eq('profile_id', userId);

    if (techErr) {
      if ((techErr as { code?: string }).code !== 'PGRST205') {
        throw new InternalServerErrorException(
          'Could not load profile technologies',
        );
      }
    }

    const technologies: TechnologyItem[] = (
      (techRows as unknown as TechRow[]) ?? []
    )
      .map((row) => row.technologies)
      .filter((tech): tech is TechnologyItem =>
        Boolean(tech && tech.id && tech.name),
      );

    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      country: profile.country,
      institution: profile.institution,
      technologies,
      visibility: profile.visibility,
      createdAt: profile.created_at,
      devScore: null,
      tier: null,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    if (dto.avatarUrl) {
      this.assertValidAvatarUrl(dto.avatarUrl, userId);
    }

    const patch: { [key: string]: Json | undefined } = {};
    if (dto.username !== undefined) patch.username = dto.username;
    if (dto.bio !== undefined) patch.bio = dto.bio;
    if (dto.country !== undefined) patch.country = dto.country;
    if (dto.institution !== undefined) patch.institution = dto.institution;
    if (dto.visibility !== undefined) patch.visibility = dto.visibility;
    if (dto.avatarUrl !== undefined) patch.avatar_url = dto.avatarUrl;

    const techIds = dto.technologyIds !== undefined ? dto.technologyIds : null;

    const { error } = await this.supabase.client.rpc('update_profile', {
      p_id: userId,
      p_patch: patch,
      p_technology_ids: techIds,
    });

    if (error) {
      if (error.code === '23505' || /unique/i.test(error.message)) {
        throw new ConflictException({
          message: 'Username is already taken',
          code: 'username_taken',
        });
      }
      throw new InternalServerErrorException(error.message);
    }

    return this.getProfile(userId);
  }

  async deleteMe(userId: string, confirmUsername: string): Promise<void> {
    const { data: profile, error } = await this.supabase.client
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    if (error)
      throw new InternalServerErrorException('Could not verify account');
    if (!profile) throw new NotFoundException('Profile not found');

    if (profile.username !== confirmUsername) {
      throw new BadRequestException([
        'confirmUsername does not match current username',
      ]);
    }

    await this.accountService.delete(userId, userId);
  }

  async listTechnologies(): Promise<TechnologyItem[]> {
    const { data, error } = await this.supabase.client
      .from('technologies')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error)
      throw new InternalServerErrorException('Could not load technologies');
    return data ?? [];
  }
}
