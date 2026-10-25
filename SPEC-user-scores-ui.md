# Spec: `user-scores-ui` — Developer Score & Tier Visibility

**Module ID:** `user-scores-ui` (from [capability-map-scores-and-invitations.md](file:///C:/Users/hp/.gemini/antigravity-cli/brain/ca283c93-5842-4f8c-bc6a-6601d3d88507/capability-map-scores-and-invitations.md))  
**Depends on:** `practice-scoring`

---

## Objective

Prominently showcase the developer's official **Dev Score** (calculated as the median of their assessed skills) and **Tier** (Beginner, Intermediate, Advanced, Expert) across the key developer surfaces: Developer Dashboard (`/dashboard`), Profile (`/profile`), and Header navigation (`AuthHeader.tsx`). Replace outdated references to arithmetic "Average proficiency".

### Who benefits
- **Developers** immediately see the impact of their practice and duel achievements reflected in an authoritative Dev Score and Tier badge.
- **The Platform** aligns client-side score displays with the PostgreSQL `dev_scores` view standard.

---

## Detailed Changes

### 1. `useSkillSummary.ts` Median Dev Score Calculation

**File:** [`nextjs/src/components/skills/useSkillSummary.ts`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/skills/useSkillSummary.ts)

- Replace arithmetic mean calculation with median:
  ```typescript
  const evaluated = skills
    .filter((s) => s.levelScore !== null)
    .sort((a, b) => a.levelScore! - b.levelScore!);

  let devScore: number | null = null;
  if (evaluated.length > 0) {
    const mid = Math.floor(evaluated.length / 2);
    devScore =
      evaluated.length % 2 !== 0
        ? evaluated[mid].levelScore!
        : Math.round((evaluated[mid - 1].levelScore! + evaluated[mid].levelScore!) / 2);
  }

  const tier =
    devScore === null
      ? null
      : devScore >= 85
        ? 'Expert'
        : devScore >= 65
          ? 'Advanced'
          : devScore >= 35
            ? 'Intermediate'
            : 'Beginner';
  ```
- Expose `{ skills, evaluated, devScore, tier, history, pending, error, available }`.

### 2. Developer Dashboard Score Card

**File:** [`nextjs/src/app/(skills)/dashboard/page-client.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/app/(skills)/dashboard/page-client.tsx)

- Update score card title from "Average skill proficiency" to "Dev Score & Tier".
- Display the numerical `devScore` (e.g. `85` or `—` if not assessed) along with the `tier` badge (e.g. `Advanced Tier` or `Expert Tier`).
- Subtitle explains: `"Median proficiency across evaluated skills."`

### 3. Profile Progress Component

**File:** [`nextjs/src/components/profile/ProfileProgress.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/profile/ProfileProgress.tsx)

- Update `<dt>Average proficiency</dt>` to `<dt>Dev Score (Median)</dt>`.
- Render `devScore !== null ? devScore + '%' : '—'`.
- Display Tier badge alongside evaluated skills count.

### 4. Account Menu in `AuthHeader.tsx`

**File:** [`nextjs/src/components/AuthHeader.tsx`](file:///D:/5SIM4/PWA/app/DEVARENA/nextjs/src/components/AuthHeader.tsx)

- For developers, fetch or display their current Dev Score and Tier in the account trigger or header menu, providing quick access to their standing.

---

## Testing Strategy

- Frontend scenario verification in `check-profile.mjs` and `check-role-login.mjs`.
- Typecheck: `npx tsc -p nextjs --noEmit`.

---

## Boundaries

- **Always:**
  - Standardize tier thresholds: `>=85 Expert`, `>=65 Advanced`, `>=35 Intermediate`, `<35 Beginner`.
  - Maintain median formula consistency between TypeScript client and PostgreSQL `PERCENTILE_CONT(0.5)`.
