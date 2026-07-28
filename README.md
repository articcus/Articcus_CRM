# Articcus CRM

A fullstack **Sales CRM**: React (Vite) frontend, Laravel API backend, MySQL database.
Companies → Contacts → Deals, with a drag-and-drop sales pipeline, per-rep ownership, and a
follow-up-first workflow (the home screen is a prioritized queue of what's overdue/due/upcoming,
not a Kanban board).

## Stack

- **Backend**: Laravel 13, Sanctum (token auth), MySQL
- **Frontend**: React 19, Vite, React Router, Axios, Tailwind CSS v4, `@dnd-kit` (Kanban),
  `lucide-react` (icons). Type: Space Grotesk (display) + Inter (body) + Space Mono (labels/figures).
- **Database**: MySQL

## Structure

```
articcus-crm/
  backend/    Laravel API (auth, companies/contacts/deals/activities CRUD, role-based ownership)
  frontend/   React SPA — sidebar layout (Layout.jsx) wrapping Follow-ups/Pipeline/Deals/
              Companies/Contacts/Dashboard
```

## Design

The UI follows a reference mock (`articcus-crm-example.html`, not shipped — kept outside the
app) built around an indigo/ink "editorial SaaS" look: `#4F46E5` accent, a neutral ink/slate/
paper scale, and semantic urgency colors (over=rose, today=amber, soon/won=emerald). A left
sidebar (`Layout.jsx`) replaces the old top-nav-pills approach and wraps every authenticated
route. Cards use restrained radii (9–18px, not full pills) and a soft two-layer shadow; table
headers and small figures use `font-mono` uppercase micro-labels, matching the reference.

## Prerequisites

- PHP 8.2+, Composer
- Node 18+, npm
- MySQL

## Database setup

This machine has **two separate MySQL installations**:

1. A system-wide "Oracle MySQL" daemon (`com.oracle.oss.mysql.mysqld`) listening on the
   default `127.0.0.1:3306` / `/tmp/mysql.sock` — its root password is unknown, and it's a
   system LaunchDaemon likely used by other projects, so it was left untouched.
2. A Homebrew MySQL instance (`brew services` managed), reconfigured during setup to listen
   on **port 3307** with socket `/tmp/mysql_homebrew.sock`, with a working passwordless
   `root` login.

The `articcus_crm` database was created on the **Homebrew instance (port 3307)**, and
`backend/.env` is already pointed at it:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=articcus_crm
DB_USERNAME=root
DB_PASSWORD=
```

If you'd rather use your system MySQL on port 3306 instead, update `backend/.env` with the
correct credentials and re-run `php artisan migrate`.

Make sure the Homebrew MySQL service is running:

```bash
brew services start mysql
```

## Backend setup

```bash
cd backend
composer install
php artisan migrate   # tables already created during setup; only needed on a fresh DB
php artisan serve --port=8000
```

API available at `http://127.0.0.1:8000/api`.

### API endpoints

| Method | Endpoint                | Description                  |
|--------|--------------------------|-------------------------------|
| POST   | /api/register             | Create account — requires a valid `invite_token`, returns Sanctum token |
| POST   | /api/login                 | Returns token                 |
| POST   | /api/auth/firebase          | Sign in via Firebase ID token; new accounts require a matching invitation, returns Sanctum token |
| POST   | /api/logout                | Revoke current token (auth)   |
| GET    | /api/me                    | Current user (auth)           |
| GET    | /api/users                  | List team members, for assignment pickers (auth) |
| GET    | /api/invitations/{token}     | Public — validate an invite link before showing the registration form |
| GET/POST | /api/invitations            | List or create invitations (admin only) |
| DELETE | /api/invitations/{id}        | Revoke a pending invitation (admin only) |
| GET/POST | /api/companies             | List/search or create companies (auth) |
| GET/PUT/DELETE | /api/companies/{id}   | Show/update/delete a company (auth) |
| GET/POST | /api/contacts              | List/search/filter (`company_id`) or create contacts (auth) |
| GET/PUT/DELETE | /api/contacts/{id}    | Show/update/delete a contact (auth) |
| GET/POST | /api/deals                 | List/filter (`stage`, `contact_id`, `project_id`) or create deals (auth) |
| GET/PUT/DELETE | /api/deals/{id}       | Show/update/delete a deal (auth) |
| PATCH  | /api/deals/{id}/stage        | Move a deal to a new pipeline stage (auth) — used by the Kanban drag-and-drop |
| GET/POST | /api/projects               | List projects (with `deals_count`/`open_deals_count`) or create one (auth) |
| GET/PUT/DELETE | /api/projects/{id}    | Project + its deals (with contact/company/owner) and history; update/delete (auth) |
| GET/POST | /api/activities             | List/filter (`contact_id`, `deal_id`, `status=pending\|completed`) or log an activity (auth) |
| PUT/DELETE | /api/activities/{id}      | Update/delete an activity (auth) |
| PATCH  | /api/activities/{id}/complete | Toggle an activity's completed state (auth) |
| GET    | /api/dashboard                | Aggregated sales metrics — see below (auth) |

Auth uses Sanctum personal access tokens — send `Authorization: Bearer <token>`.

### Team & invitations

Registration is **invite-only** — there is no open sign-up. An admin invites someone from
**Team** (`/team`, admin-only, also in the sidebar): enter an email + role, get back a
shareable link (`/register?invite=<token>`, valid 7 days). Share it however you like (Slack,
WhatsApp, etc.) — there's no email delivery, since this stays a self-contained system with no
SMTP dependency. The invite fixes the invitee's email (locked, can't be changed on the
registration form) and role; accepting it (via the form or "Continue with Google") consumes
it. An invite can't be reused, and expires after 7 days. The very first admin account
(already in the seeded data) can invite everyone else — there's no bootstrapping problem.

This closes a real gap the old open-registration model had: **Google sign-in also enforces
this** — a brand-new Google account (no existing user by that `firebase_uid`/email) is
rejected with a 403 unless a matching, unexpired, unaccepted invitation exists for that email.
Existing users signing in with Google are unaffected either way.

### Roles & ownership

Every `User` has a `role`: `admin` or `rep`, set from the invitation they accepted. To change
someone's role after the fact, use `php artisan tinker`:
`App\Models\User::find($id)->update(['role' => 'admin'])`.

Companies, Contacts, and Deals each have an `owner_id`. On `index`, **reps only see records
they own**; **admins see everything**. Only admins can set/change `owner_id` on a record (a
rep's own ownership is fixed to themselves) — enforced in each controller via the
`AuthorizesOwnership` trait (`app/Http/Controllers/Concerns/AuthorizesOwnership.php`).
Editing/deleting a record you don't own returns `403` unless you're an admin.

**Projects are the one exception** — no `owner_id`, visible and manageable by every
authenticated user regardless of role. A project represents what the company *sells*
(a product line, a service), not a rep's book of business, so per-rep ownership doesn't fit;
it's shared reference data, closer to the fixed deal-stage list than to a Company/Contact/Deal.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dev server is pinned to **port 5180** (`vite.config.js`) to avoid clashing with other
local projects. It's configured to call the API at `http://127.0.0.1:8000/api`
(`frontend/.env` → `VITE_API_URL`).

Open `http://localhost:5180` (use `localhost`, not `127.0.0.1` — Vite's dev server binds to
the IPv6 loopback here).

## Firebase (Google Sign-In)

Google sign-in via Firebase Auth is wired in **alongside** the existing email/password
Sanctum login — both issue the same Sanctum token, so the rest of the app doesn't care which
one a user used.

**Setup (one-time, done by you — creating a Firebase project requires your Google account):**

1. Go to [console.firebase.google.com](https://console.firebase.google.com/) → **Add project**
   → name it (e.g. `articcus-crm`) → Analytics is optional, skip if you like.
2. In the new project: **Build → Authentication → Get started** → **Sign-in method** tab →
   enable **Google** (pick a support email) → Save.
3. **Project settings** (gear icon) → **General** tab → scroll to **Your apps** → click the
   web icon (`</>`) → register an app (nickname e.g. `articcus-crm-web`) → Firebase shows a
   `firebaseConfig` object.
4. Copy those values into `frontend/.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. Set the same project ID in `backend/.env`:
   ```
   FIREBASE_PROJECT_ID=...
   ```
6. Restart both dev servers.

Until these are set, the "Continue with Google" button simply doesn't render (`firebaseEnabled`
check in `frontend/src/firebase.js`) — nothing breaks.

**How it works:** the frontend gets a Firebase ID token via `signInWithPopup`, POSTs it to
`POST /api/auth/firebase`, and the backend verifies it directly against Google's public keys
using `kreait/firebase-php`'s standalone `IdTokenVerifier` (project ID only — no service-account
credentials needed, since we're not writing to Firebase, only verifying tokens it issued). It
then finds-or-creates a `User` by `firebase_uid`/email and issues a normal Sanctum token.

Note: the public-key cache (`Beste\Cache\InMemoryCache`, bound in `AppServiceProvider`) is
per-request only, so each `/api/auth/firebase` call re-fetches Google's JWKS. Fine for this
scale; swap in a persistent PSR-6 cache (e.g. wrapping Laravel's cache store) if this sees
real traffic.

## Notes / what's implemented

- Login / logout with Sanctum token auth, protected routes on the frontend. Registration is
  invite-only — see "Team & invitations" above.
- Google sign-in via Firebase Auth, issuing the same Sanctum token as email/password (see
  above) — also invite-gated for new accounts.
- **Team** (`/team`, admin-only): invite teammates by email + role, get a shareable invite
  link, see pending/accepted/expired status, revoke a pending invite, see the full member list.
- **Companies → Contacts → Deals** data model, with a **drag-and-drop pipeline board**
  (`/pipeline`) — 6 stages (New → Contacted → Qualified → Proposal → Won/Lost); dragging a
  card calls `PATCH /deals/{id}/stage`, and `closed_at` is set automatically on Won/Lost.
- **Quick add** (`QuickCreateSelect`): when creating a Contact or Deal, if the Company/
  Contact/Project you need doesn't exist yet, don't cancel out and go create it elsewhere —
  each of those pickers has a "Quick add" toggle that reveals a name-only inline field, creates
  the record on the spot, and auto-selects it. Works because Company/Contact/Project each
  only *require* a name; everything else stays editable later from their own page.
  A flat, filterable **All deals** table lives at `/deals`.
- Role-based ownership (admin vs rep) — see "Roles & ownership" above.
- **Activities**: log calls/emails/meetings/tasks against a contact and, optionally, a
  specific deal. Shown as an inline timeline inside the Contact and Deal edit modals
  (`ActivityTimeline`), and drive the home screen (below).
- **Follow-ups** (`/`, `FollowUpsPage.jsx`) — the app's home screen. Every pending activity
  bucketed into Overdue / Today / This week / Later, a KPI strip (overdue, due-today,
  this-week counts + open pipeline value), and per-row actions: a checkmark opens
  **`LogFollowUpModal`** — log what happened (appends to the activity's `notes`), marks it
  complete, and optionally creates the *next* follow-up activity (subject + date) and moves
  the linked deal's stage, all in one save. An "open" button jumps straight into the full
  Deal or Contact modal. This replaces the old flat `/tasks` list — landing on "what do I
  need to chase" is more actionable than landing on a Kanban board.
- API returns clean JSON error responses (401/422) even without an explicit `Accept` header
  (`bootstrap/app.php` disables Laravel's default web-login redirect for guests).
- CORS is open (`allowed_origins: ['*']`) for local development — tighten this for
  production.
- **Dashboard** (`/dashboard`): open pipeline value, win rate, revenue won this month, tasks
  due — as stat tiles; pipeline-by-stage and revenue-by-rep as bar charts; a 6-month
  won-revenue trend. Same ownership scoping as everywhere else. Chart colors follow the
  `dataviz` skill's method: pipeline-by-stage uses an **ordinal** indigo ramp (funnel order)
  except Won/Lost, which get semantic good/neutral colors; revenue-by-rep and the monthly
  trend use a single **sequential** indigo (magnitude, not identity).
- **Projects** — what the company sells (e.g. a product line), listed in the sidebar as
  colored chips with an open-deal count (`+` to create one — name/description/color).
  Clicking one opens `/projects/:id`: the project's own deals, each shown with contact,
  company, stage, value, an edit button, and its **full activity history inline**
  (`ActivityTimeline` with no status filter — every logged call/email/meeting/task for that
  lead, pending and completed, not just what's outstanding). Deals can be assigned to a
  project from any Deal modal (Pipeline, All deals, Follow-ups, or the project page itself).

## Roadmap

Phases 1–3 (data model + pipeline, activities/follow-ups, dashboard/reporting) are done, plus
a full visual redesign around a Follow-ups-first home screen. Nothing currently planned beyond
this — flag what you want next.

## Known limitation

Backend and frontend were verified end-to-end via HTTP — company→contact→deal creation, stage
drag-and-drop, activity creation/filtering/complete-toggle, the full log-and-reschedule flow
(note → complete → new follow-up activity → deal stage move, confirmed via curl), project
creation with a deal and mixed pending/completed activity history confirmed to round-trip
correctly through `GET /api/projects/{id}`, dashboard aggregates against hand-computed values,
rep-vs-admin visibility scoping, and 403s on cross-ownership edits. The invite system was
verified end-to-end too: invite creation → link validation (valid/bogus/expired) → registration
consuming it with the correct role assigned → reuse and email-mismatch both rejected → 403 for
non-admins managing invitations → revocation. Frontend build (`npm run build`) succeeds
cleanly, with every route confirmed to transform without error via the Vite dev server. A live
in-browser click-through hasn't been done in this session (the connected browser is on a
different machine than the dev servers); open `http://localhost:5180` yourself to see it
rendered.
