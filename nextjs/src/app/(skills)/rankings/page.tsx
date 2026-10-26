import type { Metadata } from 'next';
import RankingsPage from './page-client';
export const metadata: Metadata = { title: 'Competitive Rankings | DevArena', description: 'Developer competitive rankings, duel ratings and rank milestone rewards.' };
export default function Page() { return <RankingsPage />; }
