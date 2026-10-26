'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { InstallButton } from '@/components/pwa/InstallButton';
import styles from './MobileShowcase.module.css';

export function MobileShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection;
    let attemptedAutoplay = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        if (
          attemptedAutoplay ||
          reducedMotion.matches ||
          connection?.saveData ||
          document.hidden
        )
          return;
        attemptedAutoplay = true;
        // A rejected autoplay leaves the poster and explicit play action available.
        void video.play().catch(() => {});
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    const pauseWhenHidden = () => {
      if (document.hidden) video.pause();
    };
    const respectMotionPreference = () => {
      if (reducedMotion.matches) video.pause();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    reducedMotion.addEventListener('change', respectMotionPreference);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      reducedMotion.removeEventListener('change', respectMotionPreference);
      video.pause();
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setFailed(true));
    else video.pause();
  }

  return (
    <section className={styles.section} aria-labelledby="mobile-showcase-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>DEVARENA ON MOBILE</p>
        <h2 id="mobile-showcase-title">Take your arena with you.</h2>
        <p className={styles.description}>
          Install DevArena on your phone or desktop.
        </p>
        <div className={styles.action}>
          <InstallButton />
        </div>
      </header>
      <figure className={styles.preview}>
        <video
          ref={videoRef}
          width={1920}
          height={1080}
          poster="/videos/devarena-commercial-poster.webp"
          src="/videos/devarena-commercial.mp4"
          preload="none"
          playsInline
          muted
          loop
          disablePictureInPicture
          aria-hidden="true"
          onError={() => setFailed(true)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <a href="/videos/devarena-commercial.mp4">Download the DevArena preview</a>
        </video>
        {!failed && (
          <button
            type="button"
            className={styles.playbackControl}
            onClick={togglePlayback}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
            title={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing ? (
              <Pause size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Play size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        )}
        <figcaption id="mobile-showcase-description" className="sr-only">
          A muted looping preview of the dashboard, problems, Battle Code, and
          Marketplace on mobile.
        </figcaption>
      </figure>
      {failed && (
        <p className={styles.failure} role="status">
          Preview unavailable.{' '}
          <a href="/videos/devarena-commercial.mp4">Open the video</a>
        </p>
      )}
    </section>
  );
}
