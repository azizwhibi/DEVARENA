import { apiRequest } from './api';

export interface RecruiterSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  institution: string | null;
}

export interface CandidateSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  institution: string | null;
}

export interface InvitationItem {
  id: string;
  recruiterId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  createdAt: string;
  updatedAt: string;
  recruiter?: RecruiterSummary;
  candidate?: CandidateSummary;
}

export interface AcceptInvitationResponse {
  invitation: InvitationItem;
  conversation: { id: string };
}

export interface ConversationParticipant {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface ConversationItem {
  id: string;
  invitationId: string;
  otherParticipant: ConversationParticipant;
  lastMessage: MessageItem | null;
  updatedAt: string;
  createdAt: string;
}

export async function sendInvitation(
  candidateId: string,
  message?: string,
  signal?: AbortSignal,
): Promise<InvitationItem> {
  return apiRequest<InvitationItem>('/recruiter/invitations', {
    method: 'POST',
    body: JSON.stringify({ candidateId, message }),
    signal,
  });
}

export async function listSentInvitations(
  signal?: AbortSignal,
): Promise<InvitationItem[]> {
  return apiRequest<InvitationItem[]>('/recruiter/invitations', {
    method: 'GET',
    signal,
  });
}

export async function listReceivedInvitations(
  signal?: AbortSignal,
): Promise<InvitationItem[]> {
  return apiRequest<InvitationItem[]>('/invitations', {
    method: 'GET',
    signal,
  });
}

export async function acceptInvitation(
  invitationId: string,
  signal?: AbortSignal,
): Promise<AcceptInvitationResponse> {
  return apiRequest<AcceptInvitationResponse>(
    `/invitations/${encodeURIComponent(invitationId)}/accept`,
    {
      method: 'PATCH',
      signal,
    },
  );
}

export async function declineInvitation(
  invitationId: string,
  signal?: AbortSignal,
): Promise<InvitationItem> {
  return apiRequest<InvitationItem>(
    `/invitations/${encodeURIComponent(invitationId)}/decline`,
    {
      method: 'PATCH',
      signal,
    },
  );
}

export async function listConversations(
  signal?: AbortSignal,
): Promise<ConversationItem[]> {
  return apiRequest<ConversationItem[]>('/conversations', {
    method: 'GET',
    signal,
  });
}

export async function getConversationMessages(
  conversationId: string,
  signal?: AbortSignal,
): Promise<MessageItem[]> {
  return apiRequest<MessageItem[]>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function sendMessageRest(
  conversationId: string,
  content: string,
  signal?: AbortSignal,
): Promise<MessageItem> {
  return apiRequest<MessageItem>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ conversationId, content }),
      signal,
    },
  );
}
