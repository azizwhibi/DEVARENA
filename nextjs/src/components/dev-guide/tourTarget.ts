import type { TargetRect } from './types';

export function boundedTargetRect(
  rect: TargetRect,
  viewport: { width: number; height: number },
): TargetRect | null {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.left + rect.width <= 0 ||
    rect.top + rect.height <= 86 ||
    rect.left >= viewport.width ||
    rect.top >= viewport.height
  )
    return null;
  const left = Math.max(6, rect.left - 5),
    top = Math.max(90, rect.top - 5);
  return {
    left,
    top,
    width: Math.max(
      0,
      Math.min(rect.left + rect.width + 5, viewport.width - 6) - left,
    ),
    height: Math.max(
      0,
      Math.min(rect.top + rect.height + 5, viewport.height - 6) - top,
    ),
  };
}

// Cancelable wait: targets may mount after a route commits or an account finishes loading.
export function waitForTarget(
  find: () => HTMLElement | null,
  signal: AbortSignal,
  timeout = 3000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(null);
      return;
    }
    let observer: MutationObserver | undefined;
    function done(target: HTMLElement | null) {
      observer?.disconnect();
      clearInterval(interval);
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      resolve(target);
    }
    function abort() {
      done(null);
    }
    function check() {
      const target = find();
      if (target) done(target);
    }
    signal.addEventListener('abort', abort, { once: true });
    // Poll covers layout-only visibility changes that don't mutate DOM attributes.
    const interval = setInterval(check, 100);
    const timer = setTimeout(() => done(null), timeout);
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(check);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'style'],
      });
    }
    check();
  });
}
