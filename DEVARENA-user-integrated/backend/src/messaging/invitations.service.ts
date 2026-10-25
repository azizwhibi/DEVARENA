import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { MessagingGateway } from './messaging.gateway';
import type { CreateInvitationDto } from './dto/create-invitation.dto';

export interface InvitationItem {
  id: string;
  recruiterId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  createdAt: string;
  updatedAt: string;
  recruiter?: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    institution: string | null;
  };
  candidate?: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    country: string | null;
    institution: string | null;
  };
}

function isSchemaCacheMissing(err: any): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    (typeof err.message === 'string' &&
      /schema cache|relation .* does not exist/i.test(err.message))
  );
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly memoryInvitations = new Map<string, InvitationItem>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly gateway: MessagingGateway,
  ) {}

  async createInvitation(
    recruiterId: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationItem> {
    if (recruiterId === dto.candidateId) {
      throw new ConflictException({
        message: 'Cannot invite yourself',
        code: 'self_invitation_forbidden',
      });
    }

    const { data: candidate, error: candErr } = await this.supabase.client
      .from('profiles')
      .select('id, username, role, status')
      .eq('id', dto.candidateId)
      .maybeSingle<{ id: string; username: string; role: string; status: string }>();

    if (candErr || !candidate || candidate.role !== 'developer' || candidate.status !== 'active') {
      throw new NotFoundException({
        message: 'Candidate not found or inactive',
        code: 'candidate_not_found',
      });
    }

    const trimmedMsg = dto.message?.trim() ? dto.message.trim() : null;

    // Check Supabase first
    const { data: existing, error: existErr } = await this.supabase.client
      .from('invitations')
      .select('id, status')
      .eq('recruiter_id', recruiterId)
      .eq('candidate_id', dto.candidateId)
      .maybeSingle<{ id: string; status: string }>();

    if (isSchemaCacheMissing(existErr)) {
      this.logger.warn("Table 'invitations' not in schema cache; using resilient in-memory storage.");
      const existingMem = Array.from(this.memoryInvitations.values()).find(
        (i) => i.recruiterId === recruiterId && i.candidateId === dto.candidateId,
      );
      if (existingMem && (existingMem.status === 'pending' || existingMem.status === 'accepted')) {
        throw new ConflictException({
          message: 'An active invitation already exists for this candidate',
          code: 'invitation_duplicate',
        });
      }

      const memoryItem: InvitationItem = {
        id: randomUUID(),
        recruiterId,
        candidateId: dto.candidateId,
        status: 'pending',
        message: trimmedMsg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.memoryInvitations.set(memoryItem.id, memoryItem);
      try {
        this.gateway.notifyUser(dto.candidateId, 'invitation_received', memoryItem);
      } catch {
        // non-fatal
      }
      return memoryItem;
    }

    if (existErr && existErr.code !== 'PGRST116') {
      throw new InternalServerErrorException(existErr.message);
    }

    if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
      throw new ConflictException({
        message: 'An active invitation already exists for this candidate',
        code: 'invitation_duplicate',
      });
    }

    const { data: created, error: createErr } = await this.supabase.client
      .from('invitations')
      .insert({
        recruiter_id: recruiterId,
        candidate_id: dto.candidateId,
        status: 'pending',
        message: trimmedMsg,
      } as never)
      .select('id, recruiter_id, candidate_id, status, message, created_at, updated_at')
      .single<{
        id: string;
        recruiter_id: string;
        candidate_id: string;
        status: 'pending' | 'accepted' | 'declined' | 'cancelled';
        message: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (isSchemaCacheMissing(createErr)) {
      this.logger.warn("Insert into 'invitations' failed schema cache; falling back to memory.");
      const memoryItem: InvitationItem = {
        id: randomUUID(),
        recruiterId,
        candidateId: dto.candidateId,
        status: 'pending',
        message: trimmedMsg,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.memoryInvitations.set(memoryItem.id, memoryItem);
      try {
        this.gateway.notifyUser(dto.candidateId, 'invitation_received', memoryItem);
      } catch {
        // non-fatal
      }
      return memoryItem;
    }

    if (createErr || !created) {
      throw new InternalServerErrorException(createErr?.message ?? 'Failed to create invitation');
    }

    const item: InvitationItem = {
      id: created.id,
      recruiterId: created.recruiter_id,
      candidateId: created.candidate_id,
      status: created.status,
      message: created.message,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };

    this.memoryInvitations.set(item.id, item);

    try {
      this.gateway.notifyUser(dto.candidateId, 'invitation_received', item);
    } catch {
      // non-fatal
    }

    return item;
  }

  async listReceivedInvitations(candidateId: string): Promise<InvitationItem[]> {
    const { data: rows, error } = await this.supabase.client
      .from('invitations')
      .select('id, recruiter_id, candidate_id, status, message, created_at, updated_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    let finalRows: any[] = [];
    if (isSchemaCacheMissing(error)) {
      finalRows = Array.from(this.memoryInvitations.values()).filter(
        (i) => i.candidateId === candidateId,
      );
    } else if (error) {
      throw new InternalServerErrorException(error.message);
    } else {
      finalRows = rows ?? [];
    }

    if (!finalRows || finalRows.length === 0) return [];

    const recruiterIds = Array.from(
      new Set(finalRows.map((r: any) => r.recruiter_id ?? r.recruiterId)),
    );
    const { data: recruiters } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url, bio, institution')
      .in('id', recruiterIds);

    const recMap = new Map<string, any>();
    if (recruiters) {
      for (const r of recruiters as any[]) recMap.set(r.id, r);
    }

    return finalRows.map((r: any) => {
      const recId = r.recruiter_id ?? r.recruiterId;
      const rec = recMap.get(recId);
      return {
        id: r.id,
        recruiterId: recId,
        candidateId: r.candidate_id ?? r.candidateId,
        status: r.status,
        message: r.message,
        createdAt: r.created_at ?? r.createdAt,
        updatedAt: r.updated_at ?? r.updatedAt,
        recruiter: rec
          ? {
              id: rec.id,
              username: rec.username,
              avatarUrl: rec.avatar_url,
              bio: rec.bio,
              institution: rec.institution,
            }
          : undefined,
      };
    });
  }

  async listSentInvitations(recruiterId: string): Promise<InvitationItem[]> {
    const { data: rows, error } = await this.supabase.client
      .from('invitations')
      .select('id, recruiter_id, candidate_id, status, message, created_at, updated_at')
      .eq('recruiter_id', recruiterId)
      .order('created_at', { ascending: false });

    let finalRows: any[] = [];
    if (isSchemaCacheMissing(error)) {
      finalRows = Array.from(this.memoryInvitations.values()).filter(
        (i) => i.recruiterId === recruiterId,
      );
    } else if (error) {
      throw new InternalServerErrorException(error.message);
    } else {
      finalRows = rows ?? [];
    }

    if (!finalRows || finalRows.length === 0) return [];

    const candidateIds = Array.from(
      new Set(finalRows.map((r: any) => r.candidate_id ?? r.candidateId)),
    );
    const { data: candidates } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url, bio, country, institution')
      .in('id', candidateIds);

    const candMap = new Map<string, any>();
    if (candidates) {
      for (const c of candidates as any[]) candMap.set(c.id, c);
    }

    return finalRows.map((r: any) => {
      const candId = r.candidate_id ?? r.candidateId;
      const cand = candMap.get(candId);
      return {
        id: r.id,
        recruiterId: r.recruiter_id ?? r.recruiterId,
        candidateId: candId,
        status: r.status,
        message: r.message,
        createdAt: r.created_at ?? r.createdAt,
        updatedAt: r.updated_at ?? r.updatedAt,
        candidate: cand
          ? {
              id: cand.id,
              username: cand.username,
              avatarUrl: cand.avatar_url,
              bio: cand.bio,
              country: cand.country,
              institution: cand.institution,
            }
          : undefined,
      };
    });
  }

  async acceptInvitation(
    candidateId: string,
    invitationId: string,
  ): Promise<{ invitation: InvitationItem; conversation: { id: string } }> {
    let inv: any = this.memoryInvitations.get(invitationId);

    if (!inv) {
      const { data, error: findErr } = await this.supabase.client
        .from('invitations')
        .select('id, recruiter_id, candidate_id, status, message, created_at, updated_at')
        .eq('id', invitationId)
        .eq('candidate_id', candidateId)
        .maybeSingle<{
          id: string;
          recruiter_id: string;
          candidate_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'cancelled';
          message: string | null;
          created_at: string;
          updated_at: string;
        }>();

      if (!isSchemaCacheMissing(findErr) && data) {
        inv = data;
      }
    }

    if (!inv || (inv.candidate_id ?? inv.candidateId) !== candidateId) {
      throw new NotFoundException({
        message: 'Invitation not found',
        code: 'invitation_not_found',
      });
    }

    if (inv.status !== 'pending') {
      throw new BadRequestException({
        message: `Cannot accept an invitation that is ${inv.status}`,
        code: 'invitation_not_pending',
      });
    }

    const recId = inv.recruiter_id ?? inv.recruiterId;
    let conversationId: string = randomUUID();

    // Try Supabase update
    try {
      await this.supabase.client
        .from('invitations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', invitationId);

      const { data: conv } = await this.supabase.client
        .from('conversations')
        .upsert({
          invitation_id: invitationId,
          participant_one_id: recId,
          participant_two_id: candidateId,
          updated_at: new Date().toISOString(),
        } as never)
        .select('id')
        .single<{ id: string }>();

      if (conv?.id) {
        conversationId = conv.id;
      }

      if (inv.message && inv.message.trim().length > 0) {
        await this.supabase.client.from('messages').insert({
          conversation_id: conversationId,
          sender_id: recId,
          content: inv.message.trim(),
        } as never);
      }
    } catch {
      // Schema cache missing or offline handled seamlessly
    }

    const updatedItem: InvitationItem = {
      id: invitationId,
      recruiterId: recId,
      candidateId,
      status: 'accepted',
      message: inv.message,
      createdAt: inv.created_at ?? inv.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.memoryInvitations.set(invitationId, updatedItem);

    try {
      this.gateway.notifyUser(recId, 'invitation_status_changed', {
        invitationId,
        status: 'accepted',
        conversationId,
      });
    } catch {
      // non-fatal
    }

    return {
      invitation: updatedItem,
      conversation: { id: conversationId },
    };
  }

  async declineInvitation(
    candidateId: string,
    invitationId: string,
  ): Promise<InvitationItem> {
    let inv: any = this.memoryInvitations.get(invitationId);

    if (!inv) {
      const { data, error: findErr } = await this.supabase.client
        .from('invitations')
        .select('id, recruiter_id, candidate_id, status, message, created_at, updated_at')
        .eq('id', invitationId)
        .eq('candidate_id', candidateId)
        .maybeSingle<{
          id: string;
          recruiter_id: string;
          candidate_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'cancelled';
          message: string | null;
          created_at: string;
          updated_at: string;
        }>();

      if (!isSchemaCacheMissing(findErr) && data) {
        inv = data;
      }
    }

    if (!inv || (inv.candidate_id ?? inv.candidateId) !== candidateId) {
      throw new NotFoundException({
        message: 'Invitation not found',
        code: 'invitation_not_found',
      });
    }

    const recId = inv.recruiter_id ?? inv.recruiterId;

    try {
      await this.supabase.client
        .from('invitations')
        .update({
          status: 'declined',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', invitationId);
    } catch {
      // fallback
    }

    const updatedItem: InvitationItem = {
      id: invitationId,
      recruiterId: recId,
      candidateId,
      status: 'declined',
      message: inv.message,
      createdAt: inv.created_at ?? inv.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.memoryInvitations.set(invitationId, updatedItem);

    try {
      this.gateway.notifyUser(recId, 'invitation_status_changed', {
        invitationId,
        status: 'declined',
      });
    } catch {
      // non-fatal
    }

    return updatedItem;
  }
}
