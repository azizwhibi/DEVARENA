import { Suspense } from 'react';
import { SkillsWorkspace } from '@/components/skills/SkillsWorkspace';
import './skills.css';
export default function SkillsLayout({ children }: {
    children: React.ReactNode;
}) {
    return <Suspense fallback={<main className="p-8" role="status">Loading skills…</main>}><SkillsWorkspace>{children}</SkillsWorkspace></Suspense>;
}
