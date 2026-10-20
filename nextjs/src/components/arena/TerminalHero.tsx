import { Check } from 'lucide-react';
// Typing/fade animations live in globals.css (.arena-term-*); delays chain the lines once.
const lines: { text: string; n: number; delay: number; dur: number }[] = [
  { text: 'devarena login --as you', n: 23, delay: 0.3, dur: 1.2 },
  { text: 'devarena solve --challenge fizzbuzz', n: 35, delay: 1.8, dur: 1.6 },
];

export function TerminalHero() {
  return (
    <div className="w-full max-w-xl rounded-xl border border-white/10 bg-black/40 font-mono text-sm shadow-2xl" role="img" aria-label="Terminal demo: log in, solve a challenge, 12 of 12 tests passed">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-danger" /><span className="h-3 w-3 rounded-full bg-accent" /><span className="h-3 w-3 rounded-full bg-primary" />
        <span className="ml-3 text-xs text-muted-foreground">arena ~ shell</span>
      </div>
      <div className="space-y-2 p-5 text-left" aria-hidden="true">
        {lines.map(l => (
          <p key={l.text} className="text-zinc-200">
            <span className="text-primary">$ </span>
            <span className="arena-term-line align-bottom" style={{ '--ch': `${l.n}ch`, '--n': l.n, '--delay': `${l.delay}s`, '--dur': `${l.dur}s` } as React.CSSProperties}>{l.text}</span>
          </p>
        ))}
        <p className="arena-term-out text-primary" style={{ '--delay': '3.6s' } as React.CSSProperties}><Check size={16} strokeWidth={1.5} className="inline-block" aria-hidden="true" /> 12/12 tests passed</p>
        <p className="arena-term-out text-accent" style={{ '--delay': '3.9s' } as React.CSSProperties}>+120 XP · rank #1,024 → #812</p>
        <p className="text-primary">$ <span className="arena-caret" /></p>
      </div>
    </div>
  );
}
