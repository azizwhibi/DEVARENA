import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: 'Sign in | DevArena' };

async function LoginContent({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === 'string' ? params.next : undefined);
  return <LoginForm next={next} callbackFailed={params.error === 'callback_failed'} />;
}

export default function LoginPage(props: PageProps<'/login'>) {
  return <Suspense fallback={<main className="p-8" aria-busy="true">Loading sign-in…</main>}><LoginContent {...props} /></Suspense>;
}
