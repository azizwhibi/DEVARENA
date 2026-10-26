'use client';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/AccountProvider';
import { MyStanding, RankingsTable } from '@/components/rankings/RankingsBoard';
import { apiRequest } from '@/lib/api';
import { getCountryOptions } from '@/lib/countries';
import { PRESET_INSTITUTIONS } from '@/lib/institutions';
import { buildRankingsQuery, type RankingsResponse, type RankingScope } from '@/lib/rankings';
import styles from '@/components/rankings/rankings.module.css';
const scopes: { value: RankingScope; label: string }[] = [{value:'global',label:'Global'},{value:'country',label:'Country'},{value:'institution',label:'University / Institution'},{value:'technology',label:'Technology'}];
const countries = getCountryOptions();
export default function RankingsPage() {
  const { user } = useAccount();
  const [scope, setScope] = useState<RankingScope>('global');
  const [value, setValue] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [technologies, setTechnologies] = useState<{id:string;name:string}[]>([]);
  const [technologyError, setTechnologyError] = useState('');
  const userId = user?.id;
  useEffect(() => {
    if (scope !== 'technology') return;
    const controller = new AbortController();
    void apiRequest<{id:string;name:string}[]>('/technologies', {signal:controller.signal}).then((items) => {if (!controller.signal.aborted) {setTechnologies(items);setTechnologyError('');}}).catch(() => {if (!controller.signal.aborted) setTechnologyError('Unable to load technologies. Retry below.');});
    return () => controller.abort();
  }, [scope, retry]);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      setError('');
      void apiRequest<RankingsResponse>(buildRankingsQuery({scope,value,search,page,pageSize:20}), {signal:controller.signal})
        .then((response) => {if (!controller.signal.aborted) setData(response);})
        .catch(() => {if (!controller.signal.aborted) setError('Unable to load rankings. Please try again.');})
        .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    }, 250);
    return () => {clearTimeout(timeout);controller.abort();};
  }, [scope,value,search,page,retry,userId]);
  useEffect(() => {
    const refresh = () => setRetry((current) => current + 1);
    window.addEventListener('rank_promoted', refresh);
    return () => window.removeEventListener('rank_promoted', refresh);
  }, []);
  const changeValue = (next:string) => {setValue(next);setPage(1);};
  const pages = Math.max(1,Math.ceil((data?.total ?? 0)/20));
  return <div className={`page-container ${styles.page}`}>
    <header className={styles.header}><div><span className={styles.eyebrow}>DevArena · Competitive</span><h1>Rankings</h1><p>Build your mastery. Win your battles. Climb the arena.</p></div><span className={styles.heroIcon}><Trophy size={32} aria-hidden="true" /></span></header>
    <section className={styles.controls} aria-label="Leaderboard filters">
      <div className={styles.tabs} aria-label="Ranking scope">{scopes.map((item) => <button key={item.value} type="button" className={styles.tab} aria-pressed={scope===item.value} onClick={() => {setScope(item.value);setValue('');setPage(1);}}>{item.label}</button>)}</div>
      <div className={styles.filters}>
        <label className={styles.field}>Search developers or institutions<input type="search" value={search} maxLength={120} placeholder="Search by handle or institution" onChange={(event) => {setSearch(event.target.value);setPage(1);}} /></label>
        {scope==='country' && <label className={styles.field}>Country<select value={value} onChange={(event) => changeValue(event.target.value)}><option value="">{userId ? 'My country' : 'Choose a country'}</option>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>}
        {scope==='institution' && <label className={styles.field}>University / Institution<input value={value} list="ranking-institutions" maxLength={120} placeholder={userId ? 'My institution, or choose another' : 'Choose or type an institution'} onChange={(event) => changeValue(event.target.value)} /><datalist id="ranking-institutions">{PRESET_INSTITUTIONS.map((institution) => <option key={institution} value={institution} />)}</datalist></label>}
        {scope==='technology' && <label className={styles.field}>Technology<select value={value} onChange={(event) => changeValue(event.target.value)}><option value="">Choose a technology</option>{technologies.map((technology) => <option key={technology.id} value={technology.id}>{technology.name}</option>)}</select></label>}
      </div>
      {technologyError && scope==='technology' && <p role="alert">{technologyError} <button type="button" className="btn btn-ghost" onClick={() => setRetry((current) => current+1)}>Retry technologies</button></p>}
    </section>
    <div className={styles.summary}><span>{loading ? 'Updating standings…' : `${(data?.total ?? 0).toLocaleString('en-US')} developers`}</span><span>60% Duel Elo + Median Dev Score × 15</span></div>
    <RankingsTable items={data?.items ?? []} loading={loading} error={error} onRetry={() => setRetry((current) => current+1)} />
    <nav className={styles.pagination} aria-label="Leaderboard pagination"><button type="button" className="btn btn-secondary" disabled={loading || page<=1} onClick={() => setPage((current) => current-1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="btn btn-secondary" disabled={loading || page>=pages} onClick={() => setPage((current) => current+1)}>Next</button></nav>
    {!loading && !error && data?.me && userId && <MyStanding me={data.me} />}
    {!userId && <p className={styles.muted}><Link href="/login?next=%2Frankings">Sign in</Link> to see your standing and the next rank reward.</p>}
  </div>;
}
