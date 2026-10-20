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
import { escapeSearchTerm, GetUsersQueryDto } from './dto/get-users-query.dto';

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'developer' | 'recruiter';
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface ListUsersResult {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  limit: number;
}

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

  async listUsers(query: GetUsersQueryDto): Promise<ListUsersResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? query.pageSize ?? 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let qb = this.supabase.client
      .from('profiles')
      .select('id, email, username, role, status, created_at', {
        count: 'exact',
      });

    if (query.role) {
      qb = qb.eq('role', query.role);
    }
    if (query.status) {
      qb = qb.eq('status', query.status);
    }
    const search = query.query?.trim() || query.q?.trim();
    if (search) {
      const term = escapeSearchTerm(search);
      qb = qb.or(`username.ilike.%${term}%,email.ilike.%${term}%`);
    }

    qb = qb.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await qb;
    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    const items: AdminUserItem[] = (
      (data as unknown as Record<string, string>[]) ?? []
    ).map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as AdminUserItem['role'],
      status: row.status as AdminUserItem['status'],
      createdAt: row.created_at,
    }));

    return {
      items,
      total: count ?? items.length,
      page,
      pageSize: limit,
      limit,
    };
  }

  async setRole(
    actorId: string,
    targetId: string,
    role: 'admin' | 'developer' | 'recruiter',
  ): Promise<AdminUserItem> {
    if (actorId === targetId) {
      throw new ConflictException({
        message: 'Cannot change own role',
        code: 'self_demotion_forbidden',
      });
    }

    let rpcError: { code?: string; message: string } | null = null;
    let rpcData: unknown = null;
    try {
      let res = await this.supabase.client.rpc('admin_set_role', {
        target_user_id: targetId,
        new_role: role,
        caller_id: actorId,
      });
      if (
        res.error &&
        (res.error.code === 'PGRST202' ||
          /Could not find the function/i.test(res.error.message))
      ) {
        res = await this.supabase.client.rpc('admin_set_role', {
          p_actor: actorId,
          p_target: targetId,
          p_role: role,
        });
      }
      rpcError = res.error;
      rpcData = res.data;
    } catch (err: unknown) {
      rpcError = { message: (err as Error).message };
    }

    if (rpcError) {
      if (/Cannot change own role/i.test(rpcError.message)) {
        throw new ConflictException({
          message: 'Cannot change own role',
          code: 'self_demotion_forbidden',
        });
      }
      if (/Cannot demote the last admin/i.test(rpcError.message)) {
        throw new ConflictException({
          message: 'Cannot demote the last admin',
          code: 'last_admin',
        });
      }
      if (rpcError.code === 'P0002' || /not found/i.test(rpcError.message)) {
        throw new NotFoundException('User not found');
      }

      // Schema cache fallback when RPC is not recognized by PostgREST
      if (
        rpcError.code === 'PGRST202' ||
        /Could not find the function/i.test(rpcError.message)
      ) {
        const { data: target, error: targetErr } = await this.supabase.client
          .from('profiles')
          .select('id, email, username, role, status, created_at')
          .eq('id', targetId)
          .maybeSingle();

        if (targetErr)
          throw new InternalServerErrorException(targetErr.message);
        if (!target) throw new NotFoundException('User not found');

        if (target.role === 'admin' && role !== 'admin') {
          const { count, error: countErr } = await this.supabase.client
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin');
          if (countErr)
            throw new InternalServerErrorException(countErr.message);
          if ((count ?? 0) <= 1) {
            throw new ConflictException({
              message: 'Cannot demote the last admin',
              code: 'last_admin',
            });
          }
        }

        const { error: updateErr } = await this.supabase.client
          .from('profiles')
          .update({ role, updated_at: new Date().toISOString() } as never)
          .eq('id', targetId);
        if (updateErr)
          throw new InternalServerErrorException(updateErr.message);

        try {
          await this.supabase.client.from('audit_log').insert({
            actor_id: actorId,
            target_id: targetId,
            action: 'user.role_changed',
            before: { role: target.role },
            after: { role },
          } as never);
        } catch {
          // Non-fatal if audit_log mock table is absent
        }

        return {
          id: target.id,
          email: target.email,
          username: target.username,
          role,
          status: target.status as AdminUserItem['status'],
          createdAt: target.created_at,
        };
      }

      throw new InternalServerErrorException(rpcError.message);
    }

    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<
      string,
      string
    > | null;
    if (!row) {
      const { data: updated } = await this.supabase.client
        .from('profiles')
        .select('id, email, username, role, status, created_at')
        .eq('id', targetId)
        .single();
      if (!updated) throw new NotFoundException('User not found');
      return {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role as AdminUserItem['role'],
        status: updated.status as AdminUserItem['status'],
        createdAt: updated.created_at,
      };
    }

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as AdminUserItem['role'],
      status: row.status as AdminUserItem['status'],
      createdAt: row.created_at,
    };
  }

  async setStatus(
    actorId: string,
    targetId: string,
    status: 'active' | 'suspended',
    reason: string,
  ): Promise<AdminUserItem> {
    if (actorId === targetId) {
      throw new ConflictException({
        message: 'Cannot change own status',
        code: 'self_suspension_forbidden',
      });
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(['reason is required']);
    }

    let rpcError: { code?: string; message: string } | null = null;
    let rpcData: unknown = null;
    try {
      let res = await this.supabase.client.rpc('admin_set_status', {
        target_user_id: targetId,
        new_status: status,
        caller_id: actorId,
      });
      if (
        res.error &&
        (res.error.code === 'PGRST202' ||
          /Could not find the function/i.test(res.error.message))
      ) {
        res = await this.supabase.client.rpc('admin_set_status', {
          p_actor: actorId,
          p_target: targetId,
          p_status: status,
          p_reason: trimmedReason,
        });
      }
      rpcError = res.error;
      rpcData = res.data;
    } catch (err: unknown) {
      rpcError = { message: (err as Error).message };
    }

    if (rpcError) {
      if (/Cannot change own status/i.test(rpcError.message)) {
        throw new ConflictException({
          message: 'Cannot change own status',
          code: 'self_suspension_forbidden',
        });
      }
      if (/Cannot suspend the last active admin/i.test(rpcError.message)) {
        throw new ConflictException({
          message: 'Cannot suspend the last active admin',
          code: 'last_admin',
        });
      }
      if (rpcError.code === 'P0002' || /not found/i.test(rpcError.message)) {
        throw new NotFoundException('User not found');
      }

      // Schema cache fallback
      if (
        rpcError.code === 'PGRST202' ||
        /Could not find the function/i.test(rpcError.message)
      ) {
        const { data: target, error: targetErr } = await this.supabase.client
          .from('profiles')
          .select('id, email, username, role, status, created_at')
          .eq('id', targetId)
          .maybeSingle();

        if (targetErr)
          throw new InternalServerErrorException(targetErr.message);
        if (!target) throw new NotFoundException('User not found');

        if (target.role === 'admin' && status === 'suspended') {
          const { count, error: countErr } = await this.supabase.client
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
            .eq('status', 'active');
          if (countErr)
            throw new InternalServerErrorException(countErr.message);
          if ((count ?? 0) <= 1) {
            throw new ConflictException({
              message: 'Cannot suspend the last active admin',
              code: 'last_admin',
            });
          }
        }

        const { error: updateErr } = await this.supabase.client
          .from('profiles')
          .update({ status, updated_at: new Date().toISOString() } as never)
          .eq('id', targetId);
        if (updateErr)
          throw new InternalServerErrorException(updateErr.message);

        try {
          await this.supabase.client.from('audit_log').insert({
            actor_id: actorId,
            target_id: targetId,
            action: 'user.status_changed',
            before: { status: target.status },
            after: { status, reason: trimmedReason },
          } as never);
        } catch {
          // audit_log table non-fatal
        }

        try {
          await this.supabase.client.auth.admin.updateUserById(targetId, {
            ban_duration: status === 'suspended' ? '876000h' : 'none',
          });
        } catch {
          // Auth ban non-fatal if offline/mock
        }

        return {
          id: target.id,
          email: target.email,
          username: target.username,
          role: target.role as AdminUserItem['role'],
          status,
          createdAt: target.created_at,
        };
      }

      throw new InternalServerErrorException(rpcError.message);
    }

    try {
      await this.supabase.client.auth.admin.updateUserById(targetId, {
        ban_duration: status === 'suspended' ? '876000h' : 'none',
      });
    } catch {
      // Non-fatal if offline/mock
    }

    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<
      string,
      string
    > | null;
    if (!row) {
      const { data: updated } = await this.supabase.client
        .from('profiles')
        .select('id, email, username, role, status, created_at')
        .eq('id', targetId)
        .single();
      if (!updated) throw new NotFoundException('User not found');
      return {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role as AdminUserItem['role'],
        status: updated.status as AdminUserItem['status'],
        createdAt: updated.created_at,
      };
    }

    return {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role as AdminUserItem['role'],
      status: row.status as AdminUserItem['status'],
      createdAt: row.created_at,
    };
  }

  async deleteUserByAdmin(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) {
      throw new ConflictException({
        message: 'Cannot delete own account via admin route. Use /me instead.',
        code: 'self_delete_forbidden',
      });
    }

    const { data: target, error: targetErr } = await this.supabase.client
      .from('profiles')
      .select('id, role')
      .eq('id', targetId)
      .maybeSingle();

    if (targetErr) throw new InternalServerErrorException(targetErr.message);
    if (!target) throw new NotFoundException('User not found');

    if (target.role === 'admin') {
      const { count, error: countErr } = await this.supabase.client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (countErr) throw new InternalServerErrorException(countErr.message);
      if ((count ?? 0) <= 1) {
        throw new ConflictException({
          message: 'Cannot delete the last admin',
          code: 'last_admin',
        });
      }
    }

    await this.accountService.delete(targetId, actorId);
  }
}
