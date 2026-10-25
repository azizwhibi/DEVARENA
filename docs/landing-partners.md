# Landing learning ecosystem marquee

`PartnerCarousel` is the full-width logo marquee immediately after **How it works**. The name is retained for existing imports. The landing page stays server-rendered and passes its configuration as a required prop, so the initial HTML and client hydration use the same entries.

## Full source and configuration

- Component: `nextjs/src/components/landing/PartnerCarousel.tsx`.
- Scoped CSS: `nextjs/src/components/landing/PartnerCarousel.module.css`.
- Entries: `nextjs/src/components/landing/partners.ts`.

Entries use `name`, `logoSrc`, `href`, intrinsic `logoWidth`/`logoHeight`, a stable ID and relationship metadata. All current entries remain prospective. There are no status badges, captions, cards or navigation controls. The subtitle describes exploration rather than an official partnership. The title becomes **Our partners** only if every configured relationship is confirmed.

Add transparent PNG artwork under `nextjs/public/images/partners/`, using its actual dimensions. Source colors are retained in the files; CSS applies `brightness(0) invert(1)` for the monochrome display, at 0.7 opacity and full opacity on hover/focus. Logos are 32px high on mobile, 40px on tablet and 56px on desktop, with automatic widths.

## Direction, speed and looping

```tsx
<PartnerCarousel partners={learningPlatforms} direction="left" speed={40} />
```

Set `direction="right"` to reverse movement. `speed` is pixels per second (default 40), kept constant across breakpoints. A desktop pass through the configured list takes roughly 29 seconds. Duration grows with the repeated track length rather than accelerating on wide screens.

Only CSS keyframes move the track, from zero to `translateX(-50%)`, with linear infinite timing and `will-change: transform`. Two identical halves include their own trailing/leading spacing, so the loop has no boundary jump. A ResizeObserver measures one logo sequence and repeats it enough times per half to cover the viewport, including ultrawide displays. It does not animate frames in JavaScript. The section fills the page width; only the heading has a maximum width. The hero and How it works keep their original gutters.

Hover pauses movement. Keyboard focus switches to a static, wrapping arrangement of the five original links so every link is visible and reachable. Decorative repetitions have `aria-hidden` and `tabIndex={-1}`. Reduced motion disables the animation, hides decorative repetitions and shows the same static originals. Every image has `alt={name}`; links open the platform site with `target="_blank"` and `rel="noopener noreferrer"`.

## Asset provenance

| Platform   | Source                                                                                                                                                                                                                                                                          | Local PNG                    | Dimensions |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- |
| Coursera   | [Official brand guide](https://www.coursera.org/about/brand-guide/) and its [logo archive](https://assets.ctfassets.net/00atxywtfxvd/6nZAsyqYggH6x36fGQHUmi/b54ecf794fa1adcc58ee8ee46ae147d2/coursera-logos.zip), entry `coursera-logos/Digital/PNG/coursera-logo-full-rgb.png` | `coursera.png`               | 1446 x 467 |
| edX        | [Official white PNG](https://images.cdn.edx.org/post71-edx-logo-registered-white.png), linked from the [trademark page](https://www.edx.org/trademarks)                                                                                                                         | `edx-white.png`              | 597 x 312  |
| Udemy      | [Official website SVG](https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg), rasterized as a transparent PNG without changing the artwork                                                                                                                              | `udemy.png`                  | 910 x 340  |
| Codecademy | Inline SVG titled `Codecademy Logo` from the [official website](https://www.codecademy.com/), viewBox `0 0 102 21.705`, rasterized as a transparent PNG                                                                                                                         | `codecademy-transparent.png` | 1020 x 217 |
| Udacity    | [Official website brandmark](https://www.udacity.com/images/udacity-accenture-logo.png)                                                                                                                                                                                         | `udacity.png`                | 240 x 240  |

Retrieved 2026-10-24. All five PNGs have a real transparent alpha channel. Codecademy's previous course image had an opaque white background and is replaced by the official website vector rendered to PNG. The transparent Codecademy asset uses a new filename to avoid serving the previously optimized opaque image from browser/image caches. No logo was generated or redrawn. Brand ownership remains with each platform; displaying these prospective platforms does not establish a partnership.

## Verification

### Development cache recovery

The offline worker caches only the standalone reading shell, never `/_next/` assets or HMR traffic. Cache version v5 retires the former chunk-caching policy when the production worker update is activated. Next.js retains control of its normal chunk caching headers.

In development, `RegisterSW` unregisters an existing DevArena `/sw.js` worker and removes only cached Next.js chunks from DevArena-owned caches. Offline reading-shell files, downloaded Knowledge content in IndexedDB and unrelated workers/caches are preserved. After updating the code, restart the development server and hard reload an already-open tab once to replace its old in-memory Turbopack module graph. Avoid clearing all site data.

Run from `nextjs/`:

```bat
npm run lint
npx tsc --noEmit
npm run build
npm start -- -p 3101
```

In a separate CMD terminal, from the repository root:

```bat
npm install --prefix .local/verification --no-save playwright-core
cd nextjs
node scripts/check-partner-carousel.cjs
```

The optional browser check uses installed Microsoft Edge and local test tools; no application dependency is added. Set `EDGE_PATH` for another Edge location and `PARTNER_TEST_URL` for another running production URL. Screenshots are written under ignored `.local/partner-carousel/`.

The test checks real production SSR/hydration and Next.js image loading; transparent PNG assets; 320, 390, 768, 1440, 2560 and 5120px widths; edge-to-edge layout and page overflow; matching filled track halves and linear constant speed; hover pause; keyboard focus and inaccessible duplicate tab stops; reverse direction; and static reduced motion. A small header gutter correction below 360px prevents its existing sign-in layout from causing page overflow at 320px.
