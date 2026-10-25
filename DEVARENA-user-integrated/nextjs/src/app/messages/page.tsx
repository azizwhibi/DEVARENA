import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError, type AuthUser } from '@/lib/api-core';
import { ChatWorkspace } from '@/components/chat/ChatWorkspace';

export const metadata = { title: 'Live Messages | DevArena' };

interface MessagesPageProps {
  searchParams?: Promise<{ conversationId?: string }>;
}

async function MessagesContent({ searchParams }: MessagesPageProps) {
  await connection();
  const params = searchParams ? await searchParams : {};
  let user: AuthUser | null = null;
  let shouldRedirectLogin = false;

  try {
    user = await apiRequest<AuthUser>('/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      shouldRedirectLogin = true;
    } else {
      throw err;
    }
  }

  if (shouldRedirectLogin || !user) {
    redirect('/login?next=/messages');
  }

  return (
    <ChatWorkspace
      currentUserId={user.id}
      initialConversationId={params.conversationId ?? null}
    />
  );
}

export default function MessagesPage(props: MessagesPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
            aria-busy="true"
          >
            Connecting to live messaging workspace…
          </div>
        }
      >
        <MessagesContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
