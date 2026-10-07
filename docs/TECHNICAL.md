# Articcus CRM — Technical Documentation

## 1. Architecture overview

Two independent apps in one repo, talking over a JSON REST API:

```
articcus-crm/
├── backend/    Laravel 13 API (PHP 8.3), Sanctum token auth, MySQL
└── frontend/   React 19 SPA (Vite, Tailwind CSS v4), talks to the API over axios
```

- **Backend**: Laravel 13 (`laravel/framework ^13.8`), stateless JSON API only (no
  server-rendered views beyond a stock Laravel welcome page at `/`). Auth is
  **Laravel Sanctum** personal access tokens (bearer tokens, not cookie/session
  based) plus **Firebase** ID-token verification for Google sign-in
  (`kreait/firebase-php`).
- **Frontend**: React 19 SPA built with Vite, client-side routed with
  `react-router-dom` v7, styled with Tailwind CSS v4 (via `@tailwindcss/vite`),
  icons from `lucide-react`, drag-and-drop from `@dnd-kit`, HTTP via `axios`, and
  Google auth via the `firebase` JS SDK.
- No shared code between frontend/backend; they're deployed and versioned
  independently, connected purely by the HTTP API contract in `backend/routes/api.php`.

## 2. Backend

### 2.1 Stack
- PHP 8.3, Laravel 13.8
- `laravel/sanctum` — API token auth
- `kreait/firebase-php` — verifies Firebase ID tokens for Google sign-in
- `doctrine/dbal` — used for migrations that alter existing columns
- DB: MySQL (per `.env.example`; `DB_CONNECTION=mysql`, default local port `3307`)
- Session/cache/queue drivers default to `database` (see `.env.example`)
- Dev tooling: Pint (formatting), Pail (log tailing), PHPUnit/Pest-compatible test
  runner, `laravel/pao`

### 2.2 Directory map
```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── Api/AuthController.php        register, login, logout, /me, Firebase login
│   │   ├── Concerns/AuthorizesOwnership.php   shared rep/admin scoping trait
│   │   ├── CompanyController.php
│   │   ├── ContactController.php
│   │   ├── DealController.php
│   │   ├── ActivityController.php
│   │   ├── ProjectController.php
│   │   ├── InvitationController.php
│   │   ├── UserController.php
│   │   └── DashboardController.php       aggregate stats + funnel endpoints
│   ├── Models/  Activity, Company, Contact, Deal, Invitation, Project, User
│   └── Providers/AppServiceProvider.php  binds Firebase IdTokenVerifier
├── database/migrations/                  see §2.5 for schema
├── routes/api.php                        all API routes (see §3)
└── routes/web.php                        just the default `/` welcome view
```

### 2.3 Authentication

Two independent login paths, both ending in a Sanctum personal access token:

1. **Email/password**
   - `POST /api/register` — requires a valid, unexpired, unused `invite_token`
     whose invited email matches the submitted email (case-insensitive). Creates
     the user with the invitation's `role`, marks the invitation accepted, issues a
     token.
   - `POST /api/login` — standard email/password check against the hashed password.
2. **Google / Firebase**
   - `POST /api/auth/firebase` — client obtains a Firebase ID token via
     `signInWithPopup` (Google provider) and posts it as `id_token`. The backend
     verifies it via `Kreait\Firebase\JWT\IdTokenVerifier` (configured with just the
     Firebase **project ID**, no service-account credentials needed — this is
     ID-token *verification*, not the Admin SDK).
   - Looks up the user by `firebase_uid`, falling back to matching `email`; links
     the `firebase_uid` to that account if newly matched by email.
   - If no user exists: auto-creates one. Role comes from a matching valid
     invitation if one exists for that email, otherwise defaults to `rep`. This
     path does **not** require an invite token to be present in the request — see
     product doc §7 for the implication (Google sign-in isn't hard-gated the way
     password registration is).

All authenticated routes require `Authorization: Bearer <token>` and are grouped
under `Route::middleware('auth:sanctum')` in `routes/api.php`. `POST /api/logout`
revokes only the current access token.

### 2.4 Authorization model

Implemented once, reused everywhere, via `App\Http\Controllers\Concerns\AuthorizesOwnership`:

- `scopeToOwner(Builder $query, Request $request)` — if the current user is not
  `role === 'admin'`, adds `where('owner_id', $user->id)` to the query. Used on
  every `index`/list endpoint (companies, contacts, deals, activities, dashboard).
- `authorizeOwner(Request $request, Model $model)` — aborts with `403` if the
  current user is not admin and doesn't own the record. Used on every
  `show`/`update`/`destroy`.

On `store` (create), the new record's `owner_id` is forced to the current user
**unless** the caller is an admin and explicitly supplied an `owner_id` in the
payload (lets admins create records directly on behalf of a rep). On `update`,
non-admins have `owner_id` stripped from the validated payload before saving, so a
rep can never reassign a record away from themselves.

`role` is a plain string column on `users` (`admin` | `rep`), no separate
permissions table — checked inline as `$request->user()->role === 'admin'` in every
controller and in the `AuthorizesOwnership` trait.

### 2.5 Data model / schema

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `firebase_uid` (nullable, unique), `name`, `email` (unique), `password` (nullable — Google-only users have none, filled with a random hash), `role` enum(`admin`,`rep`) default `rep` | Sanctum tokens via `personal_access_tokens` table |
| `companies` | `owner_id` (FK users, null-on-delete), `name`, `industry`, `website`, `phone`, `address` | |
| `contacts` | `company_id` (FK companies, null-on-delete), `owner_id` (FK users, null-on-delete), `lead_status` enum(`mql`,`sql`,`opportunity`) default `mql`, `name`, `email`, `phone`, `title`, `notes` | |
| `deals` | `contact_id` (FK contacts, **cascade** on delete), `project_id` (FK projects, nullable), `owner_id` (FK users, null-on-delete), `title`, `value` decimal(10,2) default 0, `stage` enum(`new`,`contacted`,`qualified`,`proposal`,`won`,`lost`) default `new`, `expected_close_date` date, `closed_at` timestamp | `closed_at` is set/cleared server-side whenever `stage` transitions into/out of `won`/`lost` |
| `activities` | `contact_id` (FK contacts, cascade on delete), `deal_id` (FK deals, nullable, cascade on delete), `owner_id` (FK users, null-on-delete), `type` enum(`call`,`email`,`meeting`,`task`), `subject`, `notes`, `due_at` datetime, `completed_at` datetime | `completed_at IS NULL` = pending / drives the Follow-ups screen |
| `projects` | `name`, `description`, `color` (hex, default `#4F46E5`) | Not owned; global |
| `invitations` | `email`, `role` enum(`admin`,`rep`) default `rep`, `token` (unique, 40-char random via `Str::random(40)`), `invited_by` (FK users), `expires_at`, `accepted_at` | 7-day expiry set at creation |

Notable migration history: the product originally had a generic `customers` table
(status: lead/active/inactive) which was replaced by the `companies` +
`contacts` + `deals` model — a data migration moved existing `customers` rows into
`contacts` before the old table was dropped (see
`2026_07_27_071326_migrate_customers_data_to_contacts.php` and the following
`drop_customers_table` migration). `lead_status` on contacts was added later,
independent of deal `stage`.

### 2.6 API surface (`backend/routes/api.php`)

**Public:**
- `POST /register`, `POST /login`, `POST /auth/firebase`
- `GET /invitations/{token}` — validate an invite link before showing the register form

**Authenticated (`auth:sanctum`):**
- `POST /logout`, `GET /me`
- `GET /users` — id/name/email/role list (for owner-assignment dropdowns)
- `GET /dashboard`, `GET /dashboard/funnel`
- `GET|POST /invitations`, `DELETE /invitations/{invitation}` — admin-only (403 for reps)
- `apiResource` (full CRUD) for `projects`, `companies`, `contacts`, `deals`
- `PATCH /deals/{deal}/stage` — dedicated lightweight endpoint for pipeline drag-and-drop
- `GET|POST /activities`, `PATCH|DELETE /activities/{activity}` (no `show` route),
  `PATCH /activities/{activity}/complete` — toggles `completed_at` on/off

List endpoints (`companies`, `contacts`) support `?search=`, pagination via
`?per_page=` (1–200, default 15); `deals` additionally supports `?stage=`,
`?contact_id=`, `?project_id=` and is paginated at a fixed 100/page; `activities`
supports `?contact_id=`, `?deal_id=`, `?status=pending|completed` and is paginated
at a fixed 200/page.

### 2.7 Dashboard/analytics logic (`DashboardController`)

- `GET /dashboard`: open pipeline value/count (stages `new/contacted/qualified/proposal`),
  win rate (`won / (won + lost)`), deals won this month, pipeline breakdown by every
  stage, lead-status counts, revenue-by-rep leaderboard (raw SQL join on `users`),
  trailing 6-month won-revenue series, overdue/upcoming(7-day) task counts. All
  queries run through `scopeToOwner`, so a rep sees only their own numbers and an
  admin sees the whole team's.
- `GET /dashboard/funnel`: builds the combined MQL→SQL→Opportunity→Qualified→
  Proposal→Won funnel. Since there's no stage-history table, each contact's funnel
  rank is computed as `max(rank(contact.lead_status), rank(best non-lost deal
  stage))` — i.e. current best-known position, not a true cohort/historical funnel.
  `new`/`contacted` deal stages share the `opportunity` rank rather than getting
  their own funnel row. Lost deals are reported separately (count + value), not
  folded into the funnel counts.

### 2.8 Validation conventions

Every write endpoint validates inline with `Illuminate\Support\Facades\Validator`
(no FormRequest classes) and returns `{"errors": {...}}` with HTTP 422 on failure —
matching what the frontend expects to render as field errors. Enum-like fields
(`stage`, `lead_status`, `role`, `type`) are validated against a `private const`
array on the controller, kept in sync by hand with the DB enum and the frontend's
own copies of those lists (see §3.4 — there is no single shared source of truth for
these enums across backend/frontend).

## 3. Frontend

### 3.1 Stack
- React 19, Vite 8, `react-router-dom` v7 (client-side `BrowserRouter`)
- Tailwind CSS v4 via `@tailwindcss/vite` (utility classes inline, no component
  library)
- `axios` for HTTP, `@dnd-kit/*` for the pipeline drag-and-drop board,
  `lucide-react` for icons, `firebase` JS SDK for Google sign-in
- Linting: `oxlint`

### 3.2 Directory map
```
frontend/src/
├── api/client.js          axios instance: bearer-token injection + 401 → redirect to /login
├── context/AuthContext.jsx  current user, login/register/loginWithGoogle/logout
├── firebase.js             Firebase app init + signInWithGoogle()
├── components/             modals (Deal/Contact/Company/Project/Task/...), charts, Layout, nav
├── pages/                  one component per route (see §3.3)
├── lib/format.js           LKR currency formatters
├── lib/leadStatus.js       lead-status labels/colors
├── lib/funnel.js           funnel-stage labels/colors
└── App.jsx                 route table
```

### 3.3 Routing (`App.jsx`)
| Path | Page | Notes |
|---|---|---|
| `/login` | `Login` | public |
| `/register` | `Register` | public; requires `?invite=<token>` query param |
| `/` | `FollowUpsPage` | protected — home screen |
| `/pipeline` | `DealsPipelinePage` | protected — Kanban |
| `/deals` | `DealsTablePage` | protected — table view |
| `/companies` | `CompaniesPage` | protected |
| `/contacts` | `ContactsPage` | protected |
| `/dashboard` | `DashboardPage` | protected |
| `/funnel` | `SalesFunnelPage` | protected |
| `/projects/:id` | `ProjectDetailPage` | protected |
| `/team` | `TeamPage` | protected; page itself checks `user.role === 'admin'` and renders/redirects accordingly |

All protected routes are wrapped in `<ProtectedRoute>`, which redirects to `/login`
if there's no authenticated user (checked via `AuthContext`) and otherwise renders
the page inside the persistent `<Layout>` sidebar shell.

### 3.4 State management
No global store (no Redux/Zustand). Each page fetches what it needs directly via
`axios` in `useEffect`/handler functions and keeps it in local `useState`. The only
app-wide state is `AuthContext` (current user + auth actions), read via `useAuth()`.
Modals are controlled by the parent page holding "currently editing/creating X" in
state and conditionally rendering the modal component.

Enum-like values (deal stages, lead statuses, activity types, roles) are duplicated
as JS constants inside the components/pages that need them (e.g. `STAGES` in
`DealsPipelinePage.jsx`, `LEAD_STATUSES` in `lib/leadStatus.js`) — kept in sync by
hand with the backend's `private const` arrays. There's no generated/shared schema
between backend and frontend.

### 3.5 Auth flow on the client (`AuthContext.jsx`)
- Token + user are persisted in `localStorage` (`token`, `user`).
- On mount, if a token exists, the app calls `GET /me` to revalidate it before
  rendering protected content; a failed check clears storage and logs out.
- `api/client.js`'s response interceptor globally handles `401`s by clearing
  storage and hard-redirecting to `/login` from anywhere in the app.
- `loginWithGoogle()` calls `signInWithPopup` (Firebase), takes the resulting ID
  token, and exchanges it at `POST /auth/firebase` for the app's own Sanctum token
  — the frontend never talks to the backend using the Firebase token directly
  beyond that one exchange.

### 3.6 Notable UI mechanics
- **Pipeline drag-and-drop** (`DealsPipelinePage.jsx`): `@dnd-kit/core`
  `DndContext` + `useDroppable` per column; dropping a card fires
  `PATCH /deals/{id}/stage` and refetches.
- **Quick-create** (`QuickCreateSelect.jsx`): searchable `<select>`-like dropdown
  used inside Deal/Activity modals to create a new Contact/Project inline without
  leaving the current modal.
- **Charts** (`components/DonutChart.jsx`, `MiniCharts.jsx`,
  `MonthlyRevenueChart.jsx`, `PipelineByStageChart.jsx`, `RevenueByRepChart.jsx`,
  `SemiCircleGauge.jsx`, `LeadFunnelChart.jsx`): hand-rolled SVG/CSS charts, no
  charting library dependency.
- **Currency**: all monetary values are formatted as LKR via `Intl.NumberFormat` in
  `lib/format.js` (`formatCurrency` full, `formatCurrencyCompact` for tiles/labels).

## 4. Configuration & environment variables

### 4.1 Backend (`backend/.env`, see `.env.example`)
| Var | Purpose |
|---|---|
| `APP_NAME`, `APP_URL`, `APP_ENV`, `APP_DEBUG` | standard Laravel |
| `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT` (defaults to `3307` locally), `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | MySQL connection |
| `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION` | all default to `database` |
| `MAIL_*` | defaults to `log` driver — **no real email sending is configured**; invitations must be shared manually |
| `FIREBASE_PROJECT_ID` | required for Google sign-in verification (`services.firebase.project_id` in `config/services.php`) |
| `VITE_APP_NAME` | passed through for local full-stack dev via `composer run dev` |

### 4.2 Frontend (`frontend/.env`, see `.env.example`)
| Var | Purpose |
|---|---|
| `VITE_API_URL` | base URL of the backend API (e.g. `http://127.0.0.1:8000/api`) |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase Web SDK config for Google sign-in; if any are unset, `firebaseEnabled` is `false` and the Google button/flow throws a clear "Firebase is not configured" error instead of failing silently |

## 5. Local development

### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# create the MySQL database named in .env, then:
php artisan migrate
composer dev   # runs: php artisan serve + queue:listen + pail + vite, concurrently
```
`composer run setup` (see `composer.json` `scripts.setup`) automates
install → `.env` copy → key generate → migrate → npm install/build for a fresh
environment. There is no seeded demo user by default — `DatabaseSeeder.php` is
present but empty of app-specific seeding beyond the stock `UserFactory`; the very
first user must be created by hand (e.g. via `php artisan tinker` or a temporary
invitation-less registration) since registration otherwise requires a valid invite.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_URL at the backend, add Firebase config if using Google sign-in
npm run dev             # Vite dev server
```

### Tests
```bash
cd backend
composer test           # clears config cache, runs php artisan test (PHPUnit)
```
`backend/tests/` contains the standard Laravel Feature/Unit scaffolding; there is no
frontend test suite configured (`frontend/package.json` has no test script).

## 6. Deployment notes

- Backend and frontend are independently deployable (separate build/deploy
  pipelines): the backend is a standard Laravel app (needs PHP 8.3, MySQL, and the
  usual `artisan migrate` + queue worker if using queued features); the frontend is
  a static Vite build (`npm run build` → `frontend/dist`) that can be served from
  any static host/CDN, pointed at the deployed API via `VITE_API_URL`.
- CORS/Sanctum: since auth is bearer-token based (not Sanctum's cookie/SPA mode),
  the frontend can be hosted on a different origin from the API without needing
  Sanctum's stateful-domain cookie configuration — just CORS allow-listing the
  frontend origin on the backend.
- Firebase project must have the **Google** sign-in provider enabled, and the
  frontend's authorized domain list must include wherever the SPA is hosted, for
  `signInWithPopup` to work in production.
- No outbound email is configured (`MAIL_MAILER=log`); if email-based invitation
  delivery is needed in production, `MAIL_*` needs a real driver and a mail flow
  needs to be added — currently invitation links are surfaced in the Team UI for
  manual copy/paste only.

## 7. Cross-cutting gotchas for future contributors

- **Enum values are duplicated in three places**: the DB migration enum, the
  backend controller's `private const` array, and a frontend JS constant. Adding a
  new deal stage / lead status / activity type requires updating a migration, the
  relevant controller constant, and the matching frontend `lib/*.js` file (or
  inline constant) together, or validation and UI will disagree.
- **`closed_at` is a derived field**, not directly settable — it's always
  recomputed server-side from `stage` on create/update/`updateStage`. Don't add a
  frontend field that writes it directly.
- **Google sign-in bypasses the invite requirement** that password registration
  enforces: any Google account can self-register as a `rep` if no matching
  invitation exists. This is a deliberate simplification, not a bug, but is worth
  knowing before assuming the system is fully invite-gated (see product doc §5.1).
- **Firebase integration here only verifies ID tokens** (`kreait/firebase-php`
  `IdTokenVerifier`, keyed off just a project ID) — there is no Firebase Admin SDK
  service-account usage, so nothing server-side can create/manage Firebase users or
  send Firebase-side emails.
