'use client';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { parseRankPromotion, type RankPromotion } from '@/lib/rankings';
import styles from './rankings.module.css';
export function RankPromotionToast() {
  const [promotion, setPromotion] = useState<RankPromotion | null>(null);
  const [credits, setCredits] = useState(0);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const receive = (event: Event) => {
      const value = parseRankPromotion((event as CustomEvent<unknown>).detail);
      if (!value || seen.current.has(value.tier)) return;
      seen.current.add(value.tier);
      setCredits(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? value.credits_awarded : 0);
      setPromotion(value);
    };
    window.addEventListener('rank_promoted', receive);
    return () => window.removeEventListener('rank_promoted', receive);
  }, []);
  useEffect(() => {
    if (!promotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      setCredits(Math.round(promotion.credits_awarded * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [promotion]);
  if (!promotion) return null;
  return <aside className={styles.promotion} aria-label="Rank promotion">
    <button className={styles.close} type="button" aria-label="Dismiss rank promotion" onClick={() => setPromotion(null)}><X size={18} aria-hidden="true" /></button>
    <div role="status"><h2>Congratulations! You ranked up to {promotion.tier} Tier!</h2><p>You earned {promotion.credits_awarded.toLocaleString('en-US')} milestone Credits.</p></div>
    <span className={styles.creditCounter} aria-hidden="true">+{credits.toLocaleString('en-US')} Credits</span>
    <p>Wallet balance: {promotion.new_balance.toLocaleString('en-US')} Credits</p>
    <Link href="/marketplace" onClick={() => setPromotion(null)}>Visit Marketplace</Link>
  </aside>;
}
