import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { MessagingGateway } from './messaging.gateway';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let mockSupabase: any;
  let mockGateway: Partial<MessagingGateway>;

  beforeEach(() => {
    mockGateway = {
      notifyUser: jest.fn(),
    };

    mockSupabase = {
      client: {
        from: jest.fn(),
      },
    };

    service = new InvitationsService(
      mockSupabase as SupabaseService,
      mockGateway as MessagingGateway,
    );
  });

  describe('createInvitation', () => {
    const recruiterId = '11111111-1111-4111-8111-111111111111';
    const candidateId = '22222222-2222-4222-8222-222222222222';

    it('throws ConflictException if recruiter invites themselves', async () => {
      await expect(
        service.createInvitation(recruiterId, { candidateId: recruiterId }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if candidate does not exist or is not an active developer', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.createInvitation(recruiterId, { candidateId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if an active or pending invitation already exists', async () => {
      // 1. Candidate lookup
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: { id: candidateId, role: 'developer', status: 'active', username: 'alice' },
              error: null,
            }),
          }),
        }),
      });

      // 2. Existing invitation lookup
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: { id: 'inv-123', status: 'pending' },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.createInvitation(recruiterId, { candidateId }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates invitation and notifies candidate via gateway', async () => {
      // 1. Candidate lookup
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: { id: candidateId, role: 'developer', status: 'active', username: 'alice' },
              error: null,
            }),
          }),
        }),
      });

      // 2. Existing invitation check (none found)
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      // 3. Insert invitation
      const createdRecord = {
        id: 'new-inv-1',
        recruiter_id: recruiterId,
        candidate_id: candidateId,
        status: 'pending',
        message: 'Join our team!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.client.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: createdRecord,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.createInvitation(recruiterId, {
        candidateId,
        message: 'Join our team!',
      });

      expect(result.id).toBe('new-inv-1');
      expect(result.status).toBe('pending');
      expect(mockGateway.notifyUser).toHaveBeenCalledWith(
        candidateId,
        'invitation_received',
        expect.objectContaining({ id: 'new-inv-1' }),
      );
    });

    it('gracefully falls back to resilient memory store when PostgREST returns PGRST205', async () => {
      // 1. Candidate lookup in profiles succeeds
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            maybeSingle: jest.fn().mockResolvedValueOnce({
              data: { id: candidateId, role: 'developer', status: 'active', username: 'azizwhibi' },
              error: null,
            }),
          }),
        }),
      });

      // 2. Existing check returns PGRST205 (schema cache missing)
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: null,
                error: {
                  code: 'PGRST205',
                  message: "Could not find the table 'public.invitations' in the schema cache",
                },
              }),
            }),
          }),
        }),
      });

      const res = await service.createInvitation(recruiterId, {
        candidateId,
        message: 'Hello @azizwhibi!',
      });

      expect(res).toBeDefined();
      expect(res.candidateId).toBe(candidateId);
      expect(res.recruiterId).toBe(recruiterId);
      expect(res.status).toBe('pending');
      expect(res.message).toBe('Hello @azizwhibi!');
      expect(mockGateway.notifyUser).toHaveBeenCalledWith(
        candidateId,
        'invitation_received',
        expect.objectContaining({ candidateId, status: 'pending' }),
      );
    });
  });

  describe('acceptInvitation', () => {
    const candidateId = '22222222-2222-4222-8222-222222222222';
    const recruiterId = '11111111-1111-4111-8111-111111111111';
    const invitationId = 'inv-123';

    it('throws NotFoundException if invitation does not belong to candidate', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.acceptInvitation(candidateId, invitationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if invitation is already accepted or declined', async () => {
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: {
                  id: invitationId,
                  candidate_id: candidateId,
                  recruiter_id: recruiterId,
                  status: 'accepted',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      await expect(
        service.acceptInvitation(candidateId, invitationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates invitation to accepted, creates conversation and seeds initial message', async () => {
      // 1. Fetch invitation
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: {
                  id: invitationId,
                  candidate_id: candidateId,
                  recruiter_id: recruiterId,
                  status: 'pending',
                  message: 'Hello, let us chat',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // 2. Update invitation status
      mockSupabase.client.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: invitationId,
                  status: 'accepted',
                  candidate_id: candidateId,
                  recruiter_id: recruiterId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // 3. Upsert conversation
      const conversationRecord = {
        id: 'conv-999',
        invitation_id: invitationId,
        participant_one_id: recruiterId,
        participant_two_id: candidateId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockSupabase.client.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValueOnce({
          select: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: conversationRecord,
              error: null,
            }),
          }),
        }),
      });

      // 4. Initial message insert
      mockSupabase.client.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValueOnce({ error: null }),
      });

      const res = await service.acceptInvitation(candidateId, invitationId);
      expect(res.invitation.status).toBe('accepted');
      expect(res.conversation.id).toBe('conv-999');
      expect(mockGateway.notifyUser).toHaveBeenCalledWith(
        recruiterId,
        'invitation_status_changed',
        expect.objectContaining({ status: 'accepted', conversationId: 'conv-999' }),
      );
    });
  });

  describe('declineInvitation', () => {
    const candidateId = '22222222-2222-4222-8222-222222222222';
    const recruiterId = '11111111-1111-4111-8111-111111111111';
    const invitationId = 'inv-123';

    it('updates invitation to declined and notifies recruiter', async () => {
      // 1. Fetch invitation
      mockSupabase.client.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            eq: jest.fn().mockReturnValueOnce({
              maybeSingle: jest.fn().mockResolvedValueOnce({
                data: {
                  id: invitationId,
                  candidate_id: candidateId,
                  recruiter_id: recruiterId,
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      // 2. Update status
      mockSupabase.client.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: invitationId,
                  status: 'declined',
                  candidate_id: candidateId,
                  recruiter_id: recruiterId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const res = await service.declineInvitation(candidateId, invitationId);
      expect(res.status).toBe('declined');
      expect(mockGateway.notifyUser).toHaveBeenCalledWith(
        recruiterId,
        'invitation_status_changed',
        expect.objectContaining({ status: 'declined' }),
      );
    });
  });
});
