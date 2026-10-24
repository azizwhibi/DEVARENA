# DevArena

An integrated developer workspace for skills, learning resources, practice challenges, real-time battles, and Marketplace cosmetics. One account connects the application through a shared dark, violet interface and the animated BYTE guide.

## Modules

| Module | What it provides |
| --- | --- |
| User management | Registration, sign-in, OAuth, recovery, profiles, avatars, account administration, and role-based access. |
| Skills and technologies | Searchable catalogues, administrator CRUD, categories, developer assignments, weighted challenge associations, measured proficiency, and assessment history. |
| Knowledge | Searchable, paginated learning library; courses, tutorials, articles, videos, and documentation; skill links, bookmarks, progress, and resource administration. |
| Marketplace | Published products, credit wallets, purchase confirmation, permanent ownership, equipped cosmetics, protected hints, and administrator product and credit management. |
| Battle Code | Authenticated online 1v1 matchmaking, mutual ready checks, ten timed quiz rounds, results, rematches, and local DevBot practice. |
| BYTE | Animated Three.js onboarding guide with contextual navigation and reduced-motion support. |

Skill assignments and measured proficiency are separate. Browser practice, battle points, resource completion, and Marketplace purchases do not increase verified skill scores. Verified proficiency uses the existing validated-assessment workflow. AI Coach and the Python/model recommendation service are not included in this integration.

## Stack

- **Frontend:** Next.js 16.4, React 19, TypeScript, Tailwind CSS 4, CSS modules, and lucide-react.
- **Backend:** NestJS 11, TypeScript, REST endpoints, and native `ws` WebSockets.
- **Data and authentication:** Supabase Auth, PostgreSQL, and Storage, using the existing shared profile identities.
- **Guide:** Three.js, React Three Fiber, and Drei.

## Run locally with CMD

Use Node.js **22.18 or later** for the TypeScript-based verification scripts, npm, and the existing Supabase project. Each service has its own dependencies and lockfile; there is no root npm start command.

### 1. Install dependencies

From the repository root:

```cmd
cd backend
npm ci
cd ..\nextjs
npm ci
cd ..
```

### 2. Configure the services

Keep your existing configuration when it already works. For a fresh checkout, copy the templates from the repository root:

```cmd
copy backend\.env.example backend\.env
copy nextjs\.env.example nextjs\.env
```

Edit both `.env` files using values from the **same Supabase project**. A `.env.local` file is not required.

| File | Variable | Value |
| --- | --- | --- |
| `backend/.env` | `SUPABASE_URL` | Supabase project URL, such as `https://YOUR_PROJECT.supabase.co`. |
| `backend/.env` | `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service credential. |
| `backend/.env` | `FRONTEND_ORIGIN` | `http://localhost:3001` |
| `backend/.env` | `PORT` | `3000` |
| `backend/.env` | `DEV_BYPASS_AUTH` | `false` |
| `nextjs/.env` | `NEXT_PUBLIC_API_URL` | `http://localhost:3000` |
| `nextjs/.env` | `NEXT_PUBLIC_SUPABASE_URL` | The same Supabase project URL. |
| `nextjs/.env` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public publishable key. |

Never put the service credential in a `NEXT_PUBLIC_*` variable or commit real `.env` files. Restart the services after changing configuration. Configure Supabase authentication redirect URLs for `http://localhost:3001` and the existing `/auth/callback` route.

### 3. Check the database

These integrations extend the existing DevArena database. They expect the host identity/profile, challenge, assessment, and audit tables; they are not a replacement for initial user-management provisioning. For a fresh project, review the existing [Supabase setup](supabase/README.md) first.

For an existing shared database, inspect what has already been applied and review the relevant scripts in Supabase SQL Editor:

| Order | Script | Purpose |
| --- | --- | --- |
| 1 | [skills-integration.sql](db/skills-integration.sql) | Extend the existing skill, technology, category, and challenge-link schema. |
| 2 | [skills-management.sql](db/skills-management.sql) | Add developer assignments, archival, duplicate protection, and administrator mutation functions. |
| 3 | [knowledge-management.sql](db/knowledge-management.sql) | Add learning resources, skill links, bookmarks, progress, events, feedback, and recommendations. |
| 4 | [marketplace-integration.sql](db/marketplace-integration.sql) | Add or reuse Marketplace products, wallets, ownership, equipment, ledger, and transactional functions. |
| 5 | [duel-integration.sql](db/duel-integration.sql) | Store online battle results using existing profile identities. |

Optional data scripts are separate: [Sirine's catalogue](db/syrine-skills-data.sql), [Knowledge examples](db/knowledge-example-resources.sql), and [Marketplace drafts](db/marketplace-seed.sql). Review them before importing. Marketplace draft examples are not visible in the developer catalogue until published by an administrator. Knowledge developers likewise see only published resources: a database containing many drafts can still have a small public library.

The integrations preserve existing accounts and historical measurements. Keep existing shared-project credentials and user-management migrations. These SQL scripts are checked in for review; pushing the repository does not apply them to Supabase.

### 4. Start both services

In the first CMD terminal, from the repository root:

```cmd
cd backend
npm run start:dev
```

In a second CMD terminal, from the repository root:

```cmd
cd nextjs
npm run dev
```

Open **[localhost:3001](http://localhost:3001)** and sign in with an existing account. The backend runs at `http://localhost:3000`; Swagger is available at **[localhost:3000/docs](http://localhost:3000/docs)**. Use an administrator account for management screens and a developer account for learning, assigned skills, and battles.

## Routes

| Route | Screen |
| --- | --- |
| `/dashboard` | Developer overview |
| `/my-skills` | Assigned skills and measured progression |
| `/skills/[id]` | Skill details, history, and associated challenges |
| `/discover` | Technologies |
| `/arena` | Practice challenges |
| `/knowledge` | Learning library |
| `/knowledge/saved` | Bookmarks |
| `/knowledge/progress` | Learning progress |
| `/knowledge/[id]` | Resource details |
| `/marketplace` | Product catalogue |
| `/marketplace?view=inventory` | Owned items and equipment |
| `/duel` | Battle Code; `/arena/duel` redirects here |
| `/profile`, `/profile/settings` | Account and settings |
| `/admin/users` | User administration |
| `/admin/skills` | Skills and technologies administration |
| `/admin/skill-associations` | Developer assignments and challenge links |
| `/admin/knowledge` | Resource administration |
| `/admin/marketplace` | Product and credit administration |
| `/recruiter` | Recruiter workspace |

## Battle Code setup

Online play needs two different developer accounts, preferably in separate browser profiles or devices. A second tab with the same account is not a second player. DevBot practice needs only one account and does not persist match results.

The WebSocket address is derived from `NEXT_PUBLIC_API_URL`; an optional `NEXT_PUBLIC_DUEL_WS_URL` can override the host. Deployment proxies must forward WebSocket upgrades on `/duel`, and HTTPS deployments must use WSS. The browser origin must match `FRONTEND_ORIGIN`.

Matchmaking and active rooms use memory in one backend instance. Active matches do not resume after a server restart. Online result persistence requires `duel_matches`; live play logs persistence failures rather than claiming that a result was saved. The fixed quiz bank is practice content, not a verified assessment.

## Verification

Backend, from `backend/`:

```cmd
npm test -- --runInBand
npm run build
```

Frontend, from `nextjs/`:

```cmd
npm run lint
npm run test:skills
npm run test:knowledge
npm run test:marketplace
npm run test:duel
npm run test:guide
npm run test:auth
npm run build
```

The auth checks also read the checked-in `supabase/templates/` files. Deleting those templates locally prevents the combined auth script from completing.

Optional isolated PostgreSQL checks run from the repository root and never connect to shared Supabase. Install their test-only dependency into the ignored local verification directory:

```cmd
npm install --prefix .local\verification --no-save @electric-sql/pglite
node db/tests/skills-management.cjs
node db/tests/marketplace-integration.cjs
node db/tests/duel-integration.cjs
```

Integration verification includes 206 backend tests across 15 suites, frontend compilation and route generation, isolated migration checks, and responsive browser checks. See the module documents for exact coverage and limits; isolated tests do not replace checks against your configured Supabase project.

## Repository structure

```text
backend/       NestJS modules, guards, services, and tests
nextjs/        Next.js routes, shared shell, components, and checks
db/            Integration SQL, optional data, and isolated database tests
supabase/      Existing host identity migrations, email templates, and checks
docs/          Integration decisions, setup details, and verification records
```

The redundant `FatmaGestion/` and `habibGestion/` source folders were removed after integration. The running application uses the main `backend/` and `nextjs/` directories.

## Further documentation

- [Skills and technologies management](docs/skills-management.md)
- [Knowledge management](docs/knowledge-management.md)
- [Marketplace integration](docs/marketplace-integration.md)
- [Battle Code integration](docs/battle-code-integration.md)
- [BYTE guide](docs/byte-guide.md)
- [UI redesign and route verification](docs/ui-redesign.md)

## Troubleshooting

- **Malformed Supabase URL:** replace template placeholders with the full project URL and restart both services.
- **No API key found:** check the frontend publishable key and confirm that both configurations use the same project.
- **Error sending confirmation email:** inspect the project's Supabase Auth email/SMTP configuration and delivery logs.
- **Resources missing:** check publication status, active filters, pagination, and the signed-in role. Administrators manage drafts; developers browse published resources.
- **Empty skill progression:** assigned skills stay unassessed until a validated assessment exists. Practice and purchases do not create measurements.
- **Battle will not connect:** check the backend, allowed frontend origin, two distinct accounts, and WebSocket proxy settings.
