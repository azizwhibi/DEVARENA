# Spec: `pwa` + `arena-ui` (installable DevArena with a coding-arena look)

Extends `CAPABILITY-MAP.md` (module `pwa`, decision D12) and tasks T27–T29. Proposed new module id **`arena-ui`** (design tokens, motion, home page). `arena-ui` depends on `identity`; `pwa` depends on `identity`; the two are independent, build order: `arena-ui` → `pwa` (so icons/theme colour come from the tokens).

## Objective
Make the Next.js client an installable, offline-aware PWA and give it a cohesive "coding arena" identity: dark terminal/competition aesthetic, purposeful motion. Users: developers who register, compete and check rankings, mostly on phones. Success: Lighthouse installable with no PWA errors, offline reload shows a branded `/offline` page, no private data in Cache Storage, and every existing page (home, login, register, forgot/reset password, header) uses one visual system.

## Assumptions (correct me now)
1. Scope is `nextjs/` only; the NestJS backend and Supabase are untouched.
2. Replace the scaffold home page (`page.tsx` still shows Next.js boilerplate) with a DevArena landing page: hero, how-it-works, CTA to register/login. Rankings/profile pages don't exist yet, so no new data pages.
3. No new dependencies: native `app/manifest.ts`, hand-written `public/sw.js`, CSS keyframes + `prefers-reduced-motion` for animation (no framer-motion/GSAP). Icons via `next/og` `ImageResponse` (no binary assets), per D12.
4. Dark only (the app is already dark); no light theme.
5. Design direction comes from the `ui-ux-pro-max` design-system search for "developer coding arena": **Dark Mode (OLED)** style, Inter + a monospace (system `Consolas`/`ui-monospace` stack, no font downloads — matches the existing build-offline choice), code-green primary.

## Design system (tokens, in `globals.css` `@theme`)
| Token | Value | Use |
|---|---|---|
| `--color-background` | `#0F172A` → keep `#09090b` for the shell | page bg |
| `--color-card` | `#192134` | panels |
| `--color-primary` | `#22C55E` (existing UI uses emerald-300; migrate to this) | CTAs, focus ring, "pass" |
| `--color-accent` | `#D97706` | difficulty / "in progress" |
| `--color-danger` | `#DC2626` | errors, "fail" |
| `--color-muted-foreground` | `#94A3B8` | secondary text (≥4.5:1 on card) |
| `--font-mono` | `ui-monospace, Consolas, monospace` | headings accents, terminal blocks, scores |

Motifs: terminal window chrome (three dots, `$` prompt), blinking caret, scanline/grid backdrop, `PASS`/`FAIL` test-run lines, rank-podium glow, XP bar fill.

## Motion (all gated by `prefers-reduced-motion: no-preference`)
- **Hero terminal**: typed command lines (`$ devarena compete --solo`) then `✔ 12/12 tests passed` — CSS `steps()` typing + caret blink, runs once.
- **Backdrop**: slow-drifting code-grid / faint falling-glyph layer, `opacity ≤ .08`, `pointer-events:none`, paused when tab hidden.
- **Cards/buttons**: 150–250 ms lift + green glow on hover/focus; press scale .98.
- **Page entry**: staggered fade-up (≤ 300 ms, ≤ 6 items); form errors shake once (≤ 300 ms).
- **Success states**: "Check your inbox" and password-updated show a tick-draw (SVG stroke) animation.
- Only `transform`/`opacity` animate; no layout-shifting animation (CLS < 0.1). Reduced motion → static final state.

## Commands
```
Dev:        cd nextjs && npm run dev            # :3001
Build:      cd nextjs && npm run build
Start:      cd nextjs && npm start              # PWA/SW only active in production build
HTTPS dev:  cd nextjs && npx next dev -p 3001 --experimental-https
Lint:       cd nextjs && npm run lint
Typecheck:  cd nextjs && npx tsc --noEmit
Auth tests: cd nextjs && npm run test:auth
```
Before editing, read the relevant guide under `nextjs/node_modules/next/dist/docs/` (manifest, PWA, `next/og`, headers), per `nextjs/AGENTS.md`.

## Project structure
```
nextjs/src/app/globals.css              → tokens + keyframes (@theme, @keyframes, reduced-motion block)
nextjs/src/app/page.tsx                 → landing page (replaces boilerplate)
nextjs/src/app/layout.tsx               → viewport.themeColor, manifest link, <RegisterSW/>, <OfflineBanner/>
nextjs/src/app/manifest.ts              → web app manifest
nextjs/src/app/icons/[size]/route.tsx   → 192/512/maskable via ImageResponse
nextjs/src/app/apple-icon.tsx           → apple touch icon
nextjs/src/app/offline/page.tsx         → static offline page
nextjs/public/sw.js                     → service worker
nextjs/src/components/arena/            → TerminalHero, GridBackdrop, StatCard, TickIcon (presentational)
nextjs/src/components/pwa/              → RegisterSW, InstallPrompt, OfflineBanner
nextjs/next.config.ts                   → security + sw.js headers
```

## Code style
Match existing files: function components, Tailwind utilities, `'use client'` only where needed, named exports, a11y-first.
```tsx
export function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10 text-primary">
      <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="tick-draw" />
    </svg>
  );
}
```
Animations are CSS classes defined once in `globals.css`; components just apply them.

## Service worker policy (D12, unchanged)
- Precache `/offline` and icons. Cache-first for same-origin `/_next/static/*` only.
- Navigations: network-first, fallback to `/offline`; navigation responses are **never** stored.
- Everything else (API on :3000, Supabase, RSC payloads, `/auth/*`, anything with `Authorization`/cookies) is untouched. Versioned cache name; `activate` deletes old caches. Registered in production only.
- Headers: `sw.js` `Cache-Control: no-cache` + CSP, global `nosniff`, `X-Frame-Options: DENY`, strict referrer policy.
- Manifest: `name` "DevArena", `short_name` "DevArena", `start_url` "/", `display` "standalone", `background_color`/`theme_color` from tokens, icons 192/512 (`any`) + 512 `maskable`.
- InstallPrompt: `beforeinstallprompt` on Chromium; iOS Safari gets an "Add to Home Screen" hint; dismissal remembered in `localStorage` inside try/catch. OfflineBanner via `navigator.onLine` events (switch to `next/offline` `useOffline` only if the installed Next docs confirm it).

## Testing strategy
- Existing `npm run test:auth` stays green (labels/ids on auth forms must not change).
- New dependency-free node checks (same style as `scripts/check-*.mjs`): manifest fields/icon sizes; `sw.js` fetch-handler decisions (a pure `shouldHandle(request)` function unit-checked: static → cache, navigation → network-first, `/api`, Supabase, RSC, POST → ignored); no `Set-Cookie`/authenticated response is ever cached.
- Manual: DevTools Application → Manifest, Service Workers, Cache Storage after browsing `/login`, `/profile`; Offline toggle; Lighthouse (PWA installable + a11y ≥ 95); 360 px and 1440 px viewports; reduced-motion emulation.
- No Playwright/Jest added (ask first).

## Boundaries
- **Always:** keep every input labelled, visible focus, contrast ≥ 4.5:1, touch targets ≥ 44 px, honour `prefers-reduced-motion`, run lint + typecheck + build + `test:auth` before reporting done.
- **Ask first:** adding any npm dependency (animation lib, icon lib, `next-pwa`/workbox), changing auth form behaviour, adding Google Fonts (breaks offline build), caching anything beyond the policy above.
- **Never:** cache authenticated/API/Supabase responses or navigations, put tokens in `localStorage`, use emojis as icons, animate layout properties, register the SW in development, commit without being asked.

## Success criteria
1. `/manifest.webmanifest` valid; DevTools Manifest shows no errors; all icons load; app installs on Chrome desktop/Android.
2. Production build: SW active; offline reload of any page → `/offline`; Cache Storage holds only `/_next/static/*`, icons, `/offline` after a logged-in session.
3. Landing page replaces boilerplate; auth pages, header and `/offline` share the token set; no remaining `emerald-*` hard-codes outside tokens.
4. Hero terminal animation plays once, other animations ≤ 300 ms; with reduced motion nothing moves.
5. Lighthouse (mobile): installable ✔, a11y ≥ 95, CLS < 0.1, LCP < 2.5 s on the home page.
6. `npm run lint`, `npx tsc --noEmit`, `npm run test:auth`, `npm run build` green; new SW/manifest checks pass.

## Decisions (approved 2026-10-19)
1. Separate `arena-ui` module. 2. Green `#22C55E` + amber `#D97706` palette with effects and animations. 3. Landing = hero terminal + 3 steps + CTA. 4. App icon = `</>` monogram drawn in code.

## Open questions (resolved above)
1. Approve adding module **`arena-ui`** to the capability map (UI/motion separate from `pwa`), or keep one `pwa` module?
2. Palette: adopt the recommended **green `#22C55E` + amber `#D97706` on `#0F172A`**, or keep the current emerald-300 + zinc look and only add effects?
3. Landing page content: OK with hero + terminal demo + 3-step "how it works" + CTA only (no fake leaderboard data), or do you want placeholder rankings shown?
4. Logo/icon: generate the app icon from a simple `</>` monogram in code (default), or do you have a logo?
