'use client';
import { useEffect } from 'react';

// The existing feature dialogs retain their actions and pending states. This
// supplies consistent keyboard containment, focus restoration, and scroll lock.
export function useWorkspaceDialogs() {
  useEffect(() => {
    let current: HTMLElement | null = null;
    let previous: HTMLElement | null = null;
    let overflow = '';
    const focusable = () =>
      current
        ? [
            ...current.querySelectorAll<HTMLElement>(
              'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
            ),
          ].filter((el) => el.getClientRects().length && !el.closest('[inert]'))
        : [];
    function sync() {
      const next =
        [
          ...document.querySelectorAll<HTMLElement>(
            '[aria-modal="true"],dialog[open]',
          ),
        ]
          .filter((el) => el.getClientRects().length)
          .at(-1) ?? null;
      if (next === current) return;
      if (current) {
        document.body.style.overflow = overflow;
        if (previous?.isConnected) previous.focus();
      }
      current = next;
      if (current) {
        previous = document.activeElement as HTMLElement;
        overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (!current.contains(document.activeElement)) focusable()[0]?.focus();
      }
    }
    function keydown(event: KeyboardEvent) {
      if (!current) return;
      const items = focusable();
      if (event.key === 'Tab') {
        const first = items[0],
          last = items.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          !current.contains(document.activeElement) ||
          (event.shiftKey && document.activeElement === first)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      if (event.key === 'Escape' && current.tagName !== 'DIALOG') {
        const close = items.find((el) =>
          /^(Close|Cancel)/i.test(
            el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
          ),
        );
        if (close) {
          event.preventDefault();
          close.click();
        }
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'open'],
    });
    document.addEventListener('keydown', keydown);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', keydown);
      if (current) document.body.style.overflow = overflow;
    };
  }, []);
}
