'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/components/AccountProvider';
import { Problems } from '@/components/skills/Problems';

export default function ArenaPage() {
  const { account } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (account?.role === 'recruiter') {
      router.replace('/recruiter');
    } else if (account?.role === 'admin') {
      router.replace('/admin/users');
    }
  }, [account?.role, router]);

  if (account && account.role !== 'developer') {
    return (
      <div className="page-container">
        <p role="status">Redirecting to your workspace…</p>
      </div>
    );
  }

  return <Problems />;
}
