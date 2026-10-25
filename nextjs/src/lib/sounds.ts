/**
 * Sound effect utilities for DevArena 1v1 Quiz Duel lifecycle.
 * Audio playback is handled client-side with autoplay catch guards.
 */

const DEFAULT_VOLUME = 0.6;

function playSound(src: string, volume: number = DEFAULT_VOLUME): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }

  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Silently catch autoplay policy denials or user interaction requirements
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Sound] Autoplay or playback prevented for ${src}:`, err);
        }
      });
    }
    return audio;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Sound] Error initializing audio ${src}:`, err);
    }
    return null;
  }
}

/**
 * Triggers when a match is found / Ready Check begins.
 */
export function playMatchFound(volume: number = DEFAULT_VOLUME): HTMLAudioElement | null {
  return playSound('/sounds/match-found.mp3', volume);
}

/**
 * Triggers when the match completes and the current user has won.
 */
export function playVictory(volume: number = DEFAULT_VOLUME): HTMLAudioElement | null {
  return playSound('/sounds/victory.mp3', volume);
}

/**
 * Triggers when the match completes and the current user has lost.
 */
export function playDefeat(volume: number = DEFAULT_VOLUME): HTMLAudioElement | null {
  return playSound('/sounds/defeat.mp3', volume);
}
