'use client';
import { useEffect, useState } from 'react';

export function useGuideEnvironment() {
  const [environment, setEnvironment] = useState({ reduced: true, visible: true, blocked: false, bottom: 24 });
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const blocked = Array.from(document.querySelectorAll('[aria-modal="true"],dialog[open],[data-guide-modal="true"],.modal-overlay')).some(element => element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
        const obstacles = Array.from(document.querySelectorAll('[data-guide-obstacle]')).map(element => element.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0 && rect.top > window.innerHeight / 2);
        const bottom = Math.max(24, ...obstacles.map(rect => window.innerHeight - rect.top + 12));
        const next = { reduced: motion.matches, visible: document.visibilityState === 'visible', blocked, bottom };
        setEnvironment(current => Object.keys(next).every(key => current[key as keyof typeof current] === next[key as keyof typeof next]) ? current : next);
      });
    }
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'data-guide-modal', 'data-guide-obstacle', 'class', 'style'] });
    const resize = new ResizeObserver(update); resize.observe(document.body);
    motion.addEventListener('change', update); document.addEventListener('visibilitychange', update); window.addEventListener('resize', update); update();
    return () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); motion.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); window.removeEventListener('resize', update); };
  }, []);
  return environment;
}
