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

    let rpcError: { code?: string; message: string } | null = null;
    try {
      const res = await this.supabase.client.rpc('update_profile', {
        p_id: userId,
        p_patch: patch,
        p_technology_ids: techIds,
      });
      rpcError = res.error;
    } catch (err: unknown) {
      rpcError = { message: (err as Error).message };
    }

    if (rpcError) {
      if (rpcError.code === '23505' || /unique/i.test(rpcError.message)) {
        throw new ConflictException({
          message: 'Username is already taken',
          code: 'username_taken',
        });
      }

      // If update_profile RPC function is not found in schema cache, fallback to direct table update
      if (
        rpcError.code === 'PGRST202' ||
        /Could not find the function/i.test(rpcError.message)
      ) {
        if (Object.keys(patch).length > 0) {
          const profilePatch: Record<string, unknown> = {
            ...patch,
            updated_at: new Date().toISOString(),
          };
          if (typeof profilePatch.username === 'string') {
            profilePatch.username = profilePatch.username.trim();
          }
          if (typeof profilePatch.country === 'string') {
            profilePatch.country = profilePatch.country.trim().toUpperCase();
          }
          if (typeof profilePatch.institution === 'string') {
            profilePatch.institution = profilePatch.institution.trim();
          }
          if (typeof profilePatch.bio === 'string') {
            profilePatch.bio = profilePatch.bio.trim();
          }

          const { error: updateError } = await this.supabase.client
            .from('profiles')
            .update(profilePatch as never)
            .eq('id', userId);

          if (updateError) {
            if (
              updateError.code === '23505' ||
              /unique/i.test(updateError.message)
            ) {
              throw new ConflictException({
                message: 'Username is already taken',
                code: 'username_taken',
              });
            }
            throw new InternalServerErrorException(updateError.message);
          }
        }

        // If technologies were provided and profile_technologies exists, sync them
        if (techIds !== null) {
          try {
            await this.supabase.client
              .from('profile_technologies' as never)
              .delete()
              .eq('profile_id', userId);

            if (techIds.length > 0) {
              const rows = Array.from(new Set(techIds)).map(
                (technology_id) => ({
                  profile_id: userId,
                  technology_id,
                }),
              );
              await this.supabase.client
                .from('profile_technologies' as never)
                .insert(rows as never);
            }
          } catch {
            // profile_technologies table may not exist yet in schema cache
          }
        }
      } else {
        throw new InternalServerErrorException(rpcError.message);
      }
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
