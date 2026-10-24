# DevArena UI handoff

The existing application now uses a shared near-black/violet system, local Inter, consistent borders and radii, outline icons, accessible controls, and English interface copy. Primary buttons use a slightly darker violet for readable white labels. Existing stored resource content, names, categories, and legacy question-selection keywords are preserved.

The attachment contained the brief, but the reference screenshots and `Texte collé(4).txt` were not available. Layouts follow the supplied palette and written requirements; pixel-level fidelity to missing references is not claimed.

## Shared implementation

- `AccountProvider` supplies one account request to the header and workspace, with identity checks and profile-update handling. Existing authentication and backend authorization remain authoritative.
- `ApplicationShell` applies the same sidebar and header to skills, Knowledge, Marketplace, profile/settings, recruiter, administration, and Battle Code. Existing page-level server gates remain in place. Nested main landmarks were removed.
- Desktop sidebar: 290px, horizontal 40px navigation rows, violet active background and indicator, bottom account/settings links. Tablet: icons. Mobile: drawer with focus containment, Escape, restored focus, and restored scrolling.
- Global design tokens and shared card/button/field/table/dialog/skeleton/empty-state styles replace competing accents. Feature-specific styles remain scoped.
- Dashboard uses the real assigned skills, measured average, latest assessed skill's recorded history, published challenges, and actual Marketplace balance. Missing scores and insufficient history have truthful states.
- Profile uses the existing identity/avatar, editable settings and cosmetics, a restrained violet/cyan banner, real proficiency statistics, a radar only with three assessed skills, and performance bars. No ranking, streak, reward, or verification values were fabricated.
- Dialog keyboard behavior and focus restoration are shared. BYTE keeps its character animations, stored progress, reduced-motion behavior, and stable existing targets; its controls match the theme. Battle Code adds one optional tour step.
- Manifest/theme/icons follow the palette. The existing service worker still caches only the offline page, icons, and static assets, never authenticated application data.

## Completed presentation checklist

| Routes and surfaces | Updated | Browser verification |
| --- | --- | --- |
| `/`, `/login`, `/register`, `/forgot-password`, `/offline`, not found | Yes | 390, 768, 1440px |
| `/reset-password`, auth callback, profile error/loading | Yes; callback logic preserved | Reset screen at tablet; no real password reset performed |
| `/dashboard` | Yes | 390, 768, 1440px |
| `/profile`, `/profile/settings` | Yes | 390, 768, 1440px; existing profile data |
| `/my-skills`, `/discover`, `/arena` | Yes | 390, 768, 1440px; available catalogue/empty states |
| `/skills/[id]`, practice challenge dialog | Yes | Missing-record state at tablet; populated/history rendering covered by existing components and API tests |
| `/knowledge`, `/knowledge/saved`, `/knowledge/progress` | Yes | 390, 768, 1440px; no resources available to the test account |
| `/knowledge/[id]` | Yes | Missing-record state at tablet; rendering/safe-link tests |
| `/marketplace`, inventory tab, item/purchase dialogs | Yes | Catalogue/inventory at 390, 768, 1440px; no real purchase performed |
| `/admin`, `/admin/users` and account dialogs | Yes | Admin redirect and users page at 390, 768, 1440px |
| `/admin/skills`, technologies, skill form/stats | Yes | 390, 768, 1440px; skill dialog at mobile; Escape and scroll restoration |
| `/admin/skill-associations` | Yes | 390, 768, 1440px |
| `/admin/knowledge`, `/admin/knowledge/new`, `/admin/knowledge/[id]/edit` | Yes | List/new at 390, 768, 1440px; existing editor reused for edit |
| `/admin/marketplace`, product/grant forms | Yes | 390, 768, 1440px; no product/credit mutations |
| `/recruiter` | Yes | 390, 768, 1440px; unsupported benchmark/invitation claims removed |
| `/duel`, `/arena/duel` | Yes | Full DevBot match, results, replay, leave confirmation, offline guard; 390, 768, 1440px |
| BYTE, PWA install/offline controls, metadata/manifest/icons | Yes | Guide/drawer placement, reduced-motion fallback; state and PWA tests |

Coach remains removed as requested previously. Battle Code came from the subsequently supplied Habib module; its integration and SQL are documented in `docs/battle-code-integration.md`.

## Checks and limits

Frontend ESLint, TypeScript, production build (35 generated routes after battle integration), skills, Knowledge, Marketplace, battle-state, 18 BYTE checks, and PWA checks pass. Backend build and 206 tests across 15 suites pass. Isolated SQL tests validate battle migration replay and preservation without shared database writes.

Safe redirects, API, registration, OAuth, profile libraries, user administration, role navigation, and recruiter checks passed. The combined auth command stops at the pre-existing missing `supabase/templates/recovery.html`; that deleted template was not recreated as part of styling. Missing live assessment/resource/inventory fixtures prevented exhaustive populated-state screenshots and purchase/credit mutations. Browser screenshots are local verification artifacts in `.local/design/`, not product placeholder data.

No dependencies were added for this redesign or Battle Code integration. No shared SQL, GitHub push, or deployment was performed. Existing unrelated deletions were preserved.

## Translation and English-copy file inventory

The following files contain translated interface, accessibility, tutorial, validation, or exposed API copy. Database content is not translated or rewritten.

- backend/src/knowledge/knowledge-catalogue.service.ts
- backend/src/knowledge/knowledge-import.service.ts
- backend/src/knowledge/knowledge-learning.service.ts
- backend/src/knowledge/knowledge-recommendations.service.ts
- backend/src/knowledge/knowledge.store.ts
- backend/src/marketplace/dto/save-marketplace-item.dto.ts
- backend/src/skills/assignments.service.ts
- backend/src/skills/catalog.service.ts
- backend/src/skills/categories.service.ts
- backend/src/skills/challenge-skills.service.ts
- backend/src/skills/dto/catalog-query.dto.ts
- backend/src/skills/dto/challenge-skills.dto.ts
- backend/src/skills/dto/create-skill.dto.ts
- backend/src/skills/dto/list-skills.dto.ts
- backend/src/skills/dto/technology.dto.ts
- backend/src/skills/skill-insights.service.ts
- backend/src/skills/skills.service.ts
- backend/src/skills/technologies.service.ts
- nextjs/src/app/(skills)/admin/skill-associations/page-client.tsx
- nextjs/src/app/(skills)/admin/skills/page-client.tsx
- nextjs/src/app/(skills)/arena/page-client.tsx
- nextjs/src/app/(skills)/dashboard/page-client.tsx
- nextjs/src/app/(skills)/discover/page-client.tsx
- nextjs/src/app/(skills)/knowledge/[id]/page.tsx
- nextjs/src/app/(skills)/my-skills/page-client.tsx
- nextjs/src/app/(skills)/skills/[id]/page-client.tsx
- nextjs/src/components/AuthHeader.tsx
- nextjs/src/components/dev-guide/tutorialSteps.ts
- nextjs/src/components/knowledge/KnowledgeAdmin.tsx
- nextjs/src/components/knowledge/KnowledgeDetail.tsx
- nextjs/src/components/knowledge/KnowledgeEditor.tsx
- nextjs/src/components/knowledge/KnowledgeLibrary.tsx
- nextjs/src/components/knowledge/KnowledgeSaved.tsx
- nextjs/src/components/knowledge/KnowledgeUI.tsx
- nextjs/src/components/marketplace/AdminMarketplace.tsx
- nextjs/src/components/marketplace/EquippedBadge.tsx
- nextjs/src/components/marketplace/ItemDialog.tsx
- nextjs/src/components/marketplace/MarketplaceApp.tsx
- nextjs/src/components/skills/SkillsWorkspace.tsx
- nextjs/src/components/skills/admin/SkillFormModal.tsx
- nextjs/src/components/skills/admin/StatsModal.tsx
- nextjs/src/components/skills/arena/ChallengeModal.tsx
- nextjs/src/components/skills/profile/RadarChart.tsx
- nextjs/src/components/skills/profile/SkillCard.tsx
- nextjs/src/lib/knowledge.ts
- nextjs/src/lib/marketplace/api.http.ts
- nextjs/src/lib/marketplace/api.ts
- nextjs/src/lib/skills/types.ts
