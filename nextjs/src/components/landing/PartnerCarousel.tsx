'use client';

import Image from 'next/image';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { LearningPlatform } from './partners';
import styles from './PartnerCarousel.module.css';

type Props = {
  partners: readonly LearningPlatform[];
  /** Visual movement; change to right to reverse the marquee. */
  direction?: 'left' | 'right';
  /** Pixels per second. Duration adapts to logo sizes and viewport width. */
  speed?: number;
};

export function PartnerCarousel({
  partners,
  direction = 'left',
  speed = 40,
}: Props) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const sequence = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    copies: 1,
    duration: 30,
    ready: false,
  });
  const rate = Number.isFinite(speed) ? Math.max(1, Math.min(160, speed)) : 40;
  const confirmed =
    partners.length > 0 &&
    partners.every((partner) => partner.relationship === 'confirmed-partner');

  useLayoutEffect(() => {
    const container = viewport.current;
    const original = sequence.current;
    if (!container || !original) return;
    const measure = () => {
      const width = original.getBoundingClientRect().width;
      if (!width) return;
      // Each half must cover the viewport, even at the loop boundary.
      const copies = Math.max(1, Math.ceil(container.clientWidth / width));
      const duration = (copies * width) / rate;
      setLayout((previous) =>
        previous.copies === copies &&
        previous.duration === duration &&
        previous.ready
          ? previous
          : { copies, duration, ready: true },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(original);
    measure();
    return () => observer.disconnect();
  }, [partners, rate]);

  if (!partners.length) return null;

  return (
    <section className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.heading}>
        <h2 id={`${id}-title`}>
          {confirmed ? 'Our partners' : 'Our learning ecosystem'}
        </h2>
        <p>
          {confirmed
            ? 'Meet our learning partners.'
            : "Platforms we're exploring for future learning resources."}
        </p>
      </header>
      <div ref={viewport} className={styles.viewport}>
        <div
          className={styles.track}
          data-ready={layout.ready || undefined}
          style={
            {
              '--marquee-duration': `${layout.duration}s`,
              '--marquee-direction':
                direction === 'right' ? 'reverse' : 'normal',
            } as CSSProperties
          }
        >
          {[0, 1].map((half) => (
            <div
              key={half}
              className={styles.group}
              aria-hidden={half === 1 || undefined}
            >
              {Array.from({ length: layout.copies }, (_, copy) => {
                const decorative = half === 1 || copy > 0;
                return (
                  <div
                    key={copy}
                    ref={half === 0 && copy === 0 ? sequence : undefined}
                    className={styles.sequence}
                    aria-hidden={decorative || undefined}
                  >
                    {partners.map(
                      ({ id, name, logoSrc, href, logoWidth, logoHeight }) => (
                        <a
                          key={id}
                          className={styles.link}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          tabIndex={decorative ? -1 : undefined}
                        >
                          <Image
                            src={logoSrc}
                            width={logoWidth}
                            height={logoHeight}
                            alt={name}
                            sizes="(max-width: 639px) 160px, (max-width: 1023px) 200px, 280px"
                            loading="eager"
                            className={styles.logo}
                          />
                        </a>
                      ),
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
