import Image from 'next/image';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry, MyRanking, RankTier } from '@/lib/rankings';
import { getCountryName } from '@/lib/countries';
import styles from './rankings.module.css';
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export function TierBadge({ tier, division }: { tier: RankTier; division: string }) {
  return <span className={styles.badge} data-tier={tier}>{tier} <span>{division}</span></span>;
}
export function RankingsTable({ items, loading, error, onRetry }: { items: LeaderboardEntry[]; loading?: boolean; error?: string; onRetry?: () => void }) {
  if (loading) return <div className={styles.state} role="status">Loading competitive rankings…</div>;
  if (error) return <div className={styles.state} role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={onRetry}>Retry</button></div>;
  if (!items.length) return <div className={styles.state}><Trophy size={28} aria-hidden="true" /><h2>No developers found</h2><p>Try another search or scope. Public, active developers appear here.</p></div>;
  return <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Competitive leaderboard">
    <table className={styles.table}><caption className={styles.srOnly}>Developer competitive standings, ordered by competitive points</caption>
      <thead><tr><th scope="col">Rank</th><th scope="col">Developer</th><th scope="col">Tier</th><th scope="col">Competitive Points</th><th scope="col">Median Dev Score</th><th scope="col">Duel Record</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.userId}>
        <td><span className={styles.position} data-podium={item.rank <= 3 ? item.rank : undefined}>{item.rank <= 3 && <Trophy size={16} aria-hidden="true" />}<span>#{item.rank}</span></span></td>
        <td><div className={styles.developer}><span className={styles.avatar} aria-hidden="true">{item.avatarUrl ? <Image src={item.avatarUrl} unoptimized alt="" width={36} height={36} loading="lazy" referrerPolicy="no-referrer" /> : item.username.slice(0, 2).toUpperCase()}</span><div><strong>@{item.username}</strong><small>{[item.institution, getCountryName(item.country)].filter(Boolean).join(' · ') || 'Independent developer'}</small></div></div></td>
        <td><TierBadge tier={item.tier} division={item.division} /></td><td><strong className={styles.points}>{number.format(item.competitivePoints)}</strong></td>
        <td>{number.format(item.devScore)}</td><td><span>{item.wins} / {item.matchesPlayed}</span><small>{number.format(item.winRate)}% wins</small></td>
      </tr>)}</tbody></table></div>;
}
export function MyStanding({ me }: { me: MyRanking }) {
  const progress = Math.max(0, Math.min(100, me.tierProgress));
  return <section className={styles.standing} aria-labelledby="my-standing-title">
    <div><span className={styles.eyebrow} id="my-standing-title">My Standing</span><div className={styles.standingRank}><strong>{me.eligible ? (me.rank ? `#${me.rank}` : 'Outside this scope') : 'Private standing'}</strong><TierBadge tier={me.tier} division={me.division} /></div><small>{number.format(me.competitivePoints)} points · {number.format(me.winRate)}% duel wins</small></div>
    <div className={styles.progressArea}><p>{me.nextTier ? <><strong>{number.format(me.pointsToNextTier)}</strong> points to {me.nextTier}</> : 'Master Elite · highest competitive tier'}</p><div className={styles.progress} role="progressbar" aria-label="Progress to next tier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></div>
    <div className={styles.reward}><span className={styles.eyebrow}>Next milestone</span><strong>{me.nextTier ? (me.nextTierReward ? `+${number.format(me.nextTierReward)} Credits` : 'Already claimed') : 'All milestones reached'}</strong><small>{me.nextTier ? `${me.nextTier} · one-time reward` : 'Keep building your standing'}</small></div></section>;
}
