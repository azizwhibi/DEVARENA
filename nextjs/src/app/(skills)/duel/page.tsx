import { DuelArena } from '@/components/duel/DuelArena';
export const instant = false;
export const metadata = {
  title: 'Battle Code | DevArena',
  description: 'Online 1v1 quiz battles and DevBot practice.',
};
export default function DuelPage() {
  return <DuelArena />;
}
