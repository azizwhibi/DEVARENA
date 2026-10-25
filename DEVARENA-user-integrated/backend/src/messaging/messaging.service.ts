import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';

export interface ConversationParticipant {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface ConversationItem {
  id: string;
  invitationId: string;
  participantOneId?: string;
  participantTwoId?: string;
  otherParticipant: ConversationParticipant;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  updatedAt: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
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
export class MessagingService {
  private readonly memoryConversations = new Map<
    string,
    {
      id: string;
      invitationId: string;
      participantOneId: string;
      participantTwoId: string;
      createdAt: string;
      updatedAt: string;
    }
  >();
  private readonly memoryMessages = new Map<string, MessageItem[]>();

  constructor(private readonly supabase: SupabaseService) {}

  registerMemoryConversation(
    conversationId: string,
    invitationId: string,
    p1: string,
    p2: string,
  ): void {
    this.memoryConversations.set(conversationId, {
      id: conversationId,
      invitationId,
      participantOneId: p1,
      participantTwoId: p2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async getConversationParticipantIds(
    conversationId: string,
  ): Promise<[string, string] | null> {
    const mem = this.memoryConversations.get(conversationId);
    if (mem) {
      return [mem.participantOneId, mem.participantTwoId];
    }

    const { data, error } = await this.supabase.client
      .from('conversations')
      .select('participant_one_id, participant_two_id')
      .eq('id', conversationId)
      .maybeSingle<{ participant_one_id: string; participant_two_id: string }>();

    if (error || !data) return null;
    return [data.participant_one_id, data.participant_two_id];
  }

  async listUserConversations(userId: string): Promise<ConversationItem[]> {
    const { data: convs, error } = await this.supabase.client
      .from('conversations')
      .select('id, invitation_id, participant_one_id, participant_two_id, created_at, updated_at')
      .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`)
      .order('updated_at', { ascending: false });

    let finalConvs: any[] = [];
    if (isSchemaCacheMissing(error)) {
      finalConvs = Array.from(this.memoryConversations.values()).filter(
        (c) => c.participantOneId === userId || c.participantTwoId === userId,
      );
    } else if (error) {
      throw new InternalServerErrorException(error.message);
    } else {
      finalConvs = convs ?? [];
    }

    if (!finalConvs || finalConvs.length === 0) return [];

    const otherUserIds = Array.from(
      new Set(
        finalConvs.map((c: any) => {
          const p1 = c.participant_one_id ?? c.participantOneId;
          const p2 = c.participant_two_id ?? c.participantTwoId;
          return p1 === userId ? p2 : p1;
        }),
      ),
    );

    const { data: profileRows } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url, role')
      .in('id', otherUserIds);

    const profileMap = new Map<string, ConversationParticipant>();
    if (profileRows) {
      for (const p of profileRows as any[]) {
        profileMap.set(p.id, {
          id: p.id,
          username: p.username ?? 'anonymous',
          avatarUrl: p.avatar_url ?? null,
          role: p.role ?? 'developer',
        });
      }
    }

    const convIds = finalConvs.map((c: any) => c.id);
    const { data: msgRows, error: msgErr } = await this.supabase.client
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map<string, MessageItem>();
    if (!isSchemaCacheMissing(msgErr) && msgRows) {
      for (const m of msgRows as any[]) {
        if (!lastMsgMap.has(m.conversation_id)) {
          lastMsgMap.set(m.conversation_id, {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content,
            createdAt: m.created_at,
          });
        }
      }
    }

    // Overlay memory messages if present
    for (const cId of convIds) {
      const memMsgs = this.memoryMessages.get(cId);
      if (memMsgs && memMsgs.length > 0) {
        lastMsgMap.set(cId, memMsgs[memMsgs.length - 1]);
      }
    }

    return finalConvs.map((c: any) => {
      const p1 = c.participant_one_id ?? c.participantOneId;
      const p2 = c.participant_two_id ?? c.participantTwoId;
      const otherId = p1 === userId ? p2 : p1;
      const otherProfile = profileMap.get(otherId) ?? {
        id: otherId,
        username: 'anonymous',
        avatarUrl: null,
        role: 'developer',
      };
      const last = lastMsgMap.get(c.id) ?? null;

      return {
        id: c.id,
        invitationId: c.invitation_id ?? c.invitationId,
        otherParticipant: otherProfile,
        lastMessage: last,
        updatedAt: c.updated_at ?? c.updatedAt,
        createdAt: c.created_at ?? c.createdAt,
      };
    });
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    limit = 50,
  ): Promise<MessageItem[]> {
    const memConv = this.memoryConversations.get(conversationId);
    let p1 = memConv?.participantOneId;
    let p2 = memConv?.participantTwoId;

    if (!memConv) {
      const { data: conv, error: convErr } = await this.supabase.client
        .from('conversations')
        .select('id, participant_one_id, participant_two_id')
        .eq('id', conversationId)
        .maybeSingle<{ id: string; participant_one_id: string; participant_two_id: string }>();

      if (!isSchemaCacheMissing(convErr) && conv) {
        p1 = conv.participant_one_id;
        p2 = conv.participant_two_id;
      }
    }

    if (!p1 || !p2) {
      throw new NotFoundException('Conversation not found');
    }

    if (p1 !== userId && p2 !== userId) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    const { data: rows, error: msgErr } = await this.supabase.client
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (isSchemaCacheMissing(msgErr)) {
      return this.memoryMessages.get(conversationId) ?? [];
    }

    if (msgErr) {
      throw new InternalServerErrorException(msgErr.message);
    }

    const dbMessages = ((rows as any[]) ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      createdAt: m.created_at,
    }));

    const memMessages = this.memoryMessages.get(conversationId) ?? [];
    const seen = new Set(dbMessages.map((m) => m.id));
    for (const mm of memMessages) {
      if (!seen.has(mm.id)) {
        dbMessages.push(mm);
      }
    }

    return dbMessages;
  }

  async saveMessage(
    senderId: string,
    conversationId: string,
    content: string,
  ): Promise<MessageItem> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new ForbiddenException('Message content cannot be empty');
    }

    const memConv = this.memoryConversations.get(conversationId);
    let p1 = memConv?.participantOneId;
    let p2 = memConv?.participantTwoId;

    if (!memConv) {
      const { data: conv, error: convErr } = await this.supabase.client
        .from('conversations')
        .select('id, participant_one_id, participant_two_id')
        .eq('id', conversationId)
        .maybeSingle<{ id: string; participant_one_id: string; participant_two_id: string }>();

      if (!isSchemaCacheMissing(convErr) && conv) {
        p1 = conv.participant_one_id;
        p2 = conv.participant_two_id;
      }
    }

    if (!p1 || !p2) {
      throw new NotFoundException('Conversation not found');
    }

    if (p1 !== senderId && p2 !== senderId) {
      throw new ForbiddenException('Cannot send message to this conversation');
    }

    const memoryItem: MessageItem = {
      id: randomUUID(),
      conversationId,
      senderId,
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    let list = this.memoryMessages.get(conversationId);
    if (!list) {
      list = [];
      this.memoryMessages.set(conversationId, list);
    }
    list.push(memoryItem);

    if (memConv) {
      memConv.updatedAt = memoryItem.createdAt;
    }

    // Try Supabase insert
    try {
      const { data: inserted, error: insertErr } = await this.supabase.client
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmed,
        } as never)
        .select('id, conversation_id, sender_id, content, created_at')
        .single<{ id: string; conversation_id: string; sender_id: string; content: string; created_at: string }>();

      if (!isSchemaCacheMissing(insertErr) && inserted) {
        await this.supabase.client
          .from('conversations')
          .update({ updated_at: new Date().toISOString() } as never)
          .eq('id', conversationId);

        return {
          id: inserted.id,
          conversationId: inserted.conversation_id,
          senderId: inserted.sender_id,
          content: inserted.content,
          createdAt: inserted.created_at,
        };
      }
    } catch {
      // Schema cache missing or offline handled seamlessly
    }

    return memoryItem;
  }
}
