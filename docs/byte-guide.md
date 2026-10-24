# BYTE workspace guide

BYTE is a frontend-only, optional French tutorial for signed-in developers. It uses the existing workspace account and authentication subscription; it never fetches the profile again or writes business data.

## Opening and replaying

Start the existing frontend with `npm run dev` from `nextjs/`. Sign in with a developer account and open `/dashboard`. A first visit offers **Commencer** and **Plus tard**. After dismissal, **Guide DevArena** opens the saved step. Completed tours restart from the beginning. **Recommencer** is also available in the tutorial card. Administration and recruiter accounts do not receive the developer guide.

## Implementation

- `nextjs/src/components/dev-guide/`: original procedural character, static SVG fallback, typed animation controller, tutorial reducer, persistence, target tracking, accessible HTML card and responsive styles.
- `SkillsWorkspace.tsx`: mounts one account-keyed guide inside the existing context, and adds stable navigation/content targets. The shared layout preserves the guide across workspace routes.
- `KnowledgeUI.tsx`: adds the saved-resources navigation target.
- Existing PWA install/offline components: obstacle markers only. The manifest, service-worker registration and cache policy are unchanged.
- `nextjs/scripts/check-dev-guide.mjs`: focused executable reducer, persistence, account-key and target-wait tests; run with `npm run test:guide`.

The eight steps follow Dashboard, Skills, Technologies, Challenges, Knowledge, Saved Resources and Marketplace, followed by a celebration and an optional profile-settings link. Descriptions are scripted and make no claims about a particular user's progress. Resource completion remains distinct from measured skill scores.

The reducer disables progression while the route or target is pending. Navigation times out after eight seconds; target discovery after three seconds. Missing or hidden targets use a centered card. Mobile drawers are never opened automatically. Visiting another route through a real control closes the current tour and retains its step.

Only version, completion, dismissal, stable step ID and motion preference are persisted, under `devarena:byte:v1:<user-id>`. Invalid data and denied storage fall back to defaults/in-memory operation. Logout or a different authenticated ID unmounts the guide and clears its memory.

## Rendering and accessibility

The initial invitation and launcher use the original local SVG. Three.js loads only when the tutorial opens. The character shares geometry/materials, updates joints through refs, uses exponential pose interpolation and returns one-shot gestures to idle. Gaze follows fine pointers only; tutorial pointing uses measured target and mascot positions. GPU resources are disposed on unmount. Pixel ratio is capped at 1.5.

System reduced motion uses the SVG by default. Users can choose a fixed image or animation. WebGL errors/context loss fall back to the same image; all instructions remain usable in HTML. Closing a dialog restores focus, Escape dismisses, and controls have visible focus and touch-sized hit areas. The tutorial is non-modal so highlighted controls remain usable. Existing dialogs and the mobile drawer pause/hide the guide; the canvas unmounts while hidden or the tab is inactive.

BYTE reuses the existing PWA and does not offer offline access to authenticated pages. No backend, database, LLM, microphone, external model or external art service is involved.

## Verification

Frontend lint, TypeScript, production build, all 17 guide checks, skills and Knowledge checks pass. Existing profile, admin, role-login, recruiter-candidate and PWA checks pass separately. The combined auth script reaches its pre-existing failure because the working tree is missing `supabase/templates/recovery.html`; earlier safe-next, API, registration and OAuth checks pass. The file deletion is unrelated to BYTE and is preserved.

No browser surface was available in this session, so desktop/mobile appearance, actual WebGL output, keyboard focus and OS reduced-motion behavior still need live visual verification. The npm audit reports five existing high-severity entries in the ESLint/fast-glob/braces dependency chain; none belong to the added 3D packages. No automatic dependency downgrade was applied.

Dependency compatibility was checked against npm peer metadata and the [React Three Fiber installation documentation](https://r3f.docs.pmnd.rs/getting-started/installation): Fiber 9 pairs with React 19. Pinned versions are Fiber 9.8.2, Drei 10.7.9, Three 0.186.1 and Three types 0.186.0.

The Coach IA feature has been removed. Older saved tours on its step now continue at the library; the remaining step IDs are unchanged.
