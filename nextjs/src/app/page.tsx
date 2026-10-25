import { TerminalHero } from '@/components/arena/TerminalHero';
import { PartnerCarousel } from '@/components/landing/PartnerCarousel';
import { learningPlatforms } from '@/components/landing/partners';
import { MobileShowcase } from '@/components/landing/MobileShowcase';

const steps = [
  {
    n: '01',
    title: 'Join the arena',
    body: 'Create your account in seconds with email, GitHub or Google.',
  },
  {
    n: '02',
    title: 'Solve challenges',
    body: 'Explore technologies and practice with technical challenges.',
  },
  {
    n: '03',
    title: 'Track your progress',
    body: 'Follow your measured skill proficiency and assessment history.',
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center py-16 sm:py-24">
      <div className="arena-grid" aria-hidden="true" />
      <section className="arena-enter flex w-[calc(100%-2.5rem)] max-w-5xl flex-col items-center gap-10 text-center">
        <p className="font-mono text-sm tracking-widest text-[#C4B5FD]">
          &lt;/&gt; DEVARENA
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Compete. Code. <span className="text-[#C4B5FD]">Level up.</span>
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Practice technical challenges. Build skills. Keep learning.
        </p>
        <TerminalHero />
      </section>

      <MobileShowcase />

      <section
        aria-labelledby="how-title"
        className="mt-20 w-[calc(100%-2.5rem)] max-w-5xl"
      >
        <h2
          id="how-title"
          className="text-center font-mono text-sm tracking-widest text-muted-foreground"
        >
          HOW IT WORKS
        </h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              style={{ '--i': i + 1 } as React.CSSProperties}
              className="arena-enter arena-card rounded-2xl border border-[#252C3A] bg-card p-6 text-left"
            >
              <span className="font-mono text-2xl text-accent">{s.n}</span>
              <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <PartnerCarousel partners={learningPlatforms} />
    </main>
  );
}
