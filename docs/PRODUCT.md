# Articcus CRM — Product Documentation

## 1. What it is

Articcus CRM is a small, invite-only sales CRM built for a sales team that lives and
dies by **follow-ups**. Instead of a generic "accounts and opportunities" tool, the
home screen is a daily follow-up worklist (overdue / today / this week / later), and
everything else — companies, contacts, deals, the pipeline board, the funnel, the
dashboard — hangs off that.

Currency throughout the product is **LKR (Sri Lankan Rupees)**, and the product is
branded "Articcus."

## 2. Who uses it

There are exactly two roles:

| Role | Can see | Can do |
|---|---|---|
| **Rep** | Only the companies, contacts, deals and activities they own | Full CRUD on their own records |
| **Admin** | Everything, across every rep | Full CRUD on any record; manage team members; send/revoke invitations; assign records to a specific rep via an "owner" field |

There is no self-service sign-up. The system is closed: a new user can only join by
redeeming an **invitation link** sent by an admin (see §5).

## 3. Core concepts / data model (product view)

- **Company** — an organization (name, industry, website, phone, address). Owned by a rep (or admin).
- **Contact** — a person, optionally linked to a Company. Carries a **lead status**:
  `MQL → SQL → Opportunity`. This is the marketing/pre-sales qualification stage,
  independent of any deal.
- **Deal** — an opportunity to close revenue, always tied to a Contact, optionally
  tied to a **Project**. Has a **stage**: `New → Contacted → Qualified → Proposal →
  Won / Lost`, a monetary value, and an expected close date.
- **Activity** — a logged or scheduled touchpoint (call / email / meeting / task)
  against a Contact and, optionally, a Deal. Has a due date and a completed flag —
  this is what powers the Follow-ups worklist.
- **Project** — a lightweight grouping/tag for deals (name, description, color),
  e.g. a campaign, product line, or client engagement. Not owned by a rep — visible
  to everyone, and every deal can optionally belong to one.
- **Invitation** — an email + role, with a token and a 7-day expiry, that gates
  registration.

Ownership (`owner_id`) is the backbone of the permission model: reps only ever see
records where they are the owner; admins see and can reassign anything.

## 4. Features, screen by screen

The left sidebar is the primary navigation (`Layout.jsx`), always showing: Follow-ups,
Pipeline, All deals, Companies, Contacts, Sales funnel, Dashboard, and (admins only)
Team — plus a dynamic list of Projects with an inline "+ new project" affordance.

### 4.1 Follow-ups (`/`) — the home screen
- Four stat tiles: Overdue, Due today, This week, Open pipeline value.
- Every **pending** activity (not yet completed) grouped into Overdue / Today / This
  week / Later / No date, sorted by due date within each bucket.
- Each row shows the related company/contact, the subject, the linked deal's stage
  and value (if any), and a relative due-date label ("3d overdue", "Today", "in 5d").
- Quick actions per row:
  - **Check button** — opens "Log follow-up": mark the activity done and/or
    immediately schedule the next touch, without leaving the list.
  - **Open (external-link) button** — jumps straight into the related Deal or
    Contact detail modal to edit it.
  - Clicking the row opens a **Task detail** modal (full activity view/edit/delete).
- "Add follow-up" button creates a brand-new activity against an existing or
  newly-created contact.
- Sidebar shows a live badge with the overdue count.

### 4.2 Pipeline (`/pipeline`) — Kanban board
- Six columns (New, Contacted, Qualified, Proposal, Won, Lost), each showing deal
  count and total value.
- Deals are draggable cards (`@dnd-kit`); dropping a card on another column updates
  its stage instantly (`PATCH /deals/{id}/stage`). Moving into Won/Lost stamps a
  `closed_at` timestamp automatically; moving back out clears it.
- Clicking a card opens the Deal modal for full editing, including reassigning the
  owner (admins) and linking to a Project.
- "+ New deal" creates a deal directly from the board, with inline creation of a new
  contact or project if the one you need doesn't exist yet (`QuickCreateSelect`).

### 4.3 All deals (`/deals`) — table view
- Flat, filterable table of every deal (by stage, contact, project), for
  spreadsheet-style scanning/sorting rather than the visual board.

### 4.4 Companies (`/companies`)
- Searchable, paginated list of companies with their contact counts.
- Create/edit/delete via modal; admins can reassign the owning rep.

### 4.5 Contacts (`/contacts`)
- Searchable, paginated list of contacts, filterable by company and lead status.
- Create/edit/delete via modal; shows related deals and activity history
  (`ActivityTimeline`) when opened.

### 4.6 Sales funnel (`/funnel`)
- Combined **lead-to-deal funnel**: MQL → SQL → Opportunity → Qualified → Proposal →
  Won, with counts, revenue value per stage, and stage-to-stage conversion %.
- Because the schema doesn't keep a stage-history log, each contact's position in the
  funnel is inferred from their *current* lead status plus the most advanced
  non-lost deal they have — i.e. "how far did this contact get, at best, right now,"
  not a true historical cohort funnel.
- Lost deals are broken out separately (count + value) rather than folded into the
  funnel, since it's not knowable how far a lost deal actually progressed before it
  was marked lost.

### 4.7 Dashboard (`/dashboard`)
Sales performance overview, all scoped to the viewer (rep) or the whole team (admin):
- Open pipeline value & count, win rate, deals won/lost, revenue won this month.
- Pipeline value/count broken down by stage (donut/bar).
- Lead funnel snapshot by status (MQL/SQL/Opportunity).
- Revenue by rep — leaderboard of closed-won value per team member (meaningful for
  admins viewing the whole team).
- Trailing 6-month revenue trend (closed-won deals only).
- Overdue and upcoming-7-day task counts.

### 4.8 Project detail (`/projects/:id`)
- A project's own mini-pipeline: all deals tagged to that project, with open-deal
  count and total value, so a project/campaign's contribution to revenue can be
  tracked in isolation.

### 4.9 Team (`/team`, admin-only)
- List of all users with their role.
- Send an invitation by email + role (admin/rep); copies a shareable invite link.
- If the invited email already belongs to an existing user, sending the invite
  **promotes/changes that user's role in place** instead of creating a duplicate
  invitation — used to e.g. turn a rep into an admin.
- View pending/accepted/expired invitations and revoke a pending one.

### 4.10 Auth screens
- **Login** — email/password, or "Sign in with Google" (Firebase).
- **Register** — only reachable via a valid `?invite=<token>` link; the form is
  pre-filled with (and locks) the invited email, and is rejected outright with no
  token, or if the token is invalid/expired/already used.

## 5. Key product flows

### 5.1 Onboarding a new team member
1. Admin goes to **Team**, enters the new person's email and role, and sends the
   invite. This generates a token valid for **7 days**.
2. Admin shares the generated link (`/register?invite=<token>`) with the invitee,
   out of band (Slack/email — the app itself does not send email).
3. Invitee opens the link, sees their email pre-filled, sets a name + password, and
   submits. The invite is marked accepted and can't be reused.
4. Alternatively, the invitee can skip password registration entirely and **sign in
   with Google**: on first Google sign-in, if a valid invitation exists for that
   email it grants the invited role; if not, they're auto-registered as a plain
   **rep**. (This means Google sign-in is not strictly invite-gated the way
   password registration is — see §7 for the implication.)
5. If the invited email already belongs to an existing account, no new account or
   invitation record is created — sending the invite just updates that person's role.

### 5.2 Working a lead through to revenue
1. A Contact is created (directly, or inline while creating a Deal/Activity), usually
   starting at lead status **MQL**.
2. As the contact is qualified, its `lead_status` is advanced to **SQL** then
   **Opportunity**.
3. A **Deal** is opened against the contact once there's a concrete opportunity to
   close, starting at stage **New**.
4. The rep drags the deal across the **Pipeline** board (New → Contacted → Qualified
   → Proposal) as it progresses, logging **Activities** (calls/emails/meetings/tasks)
   along the way, each with a due date that surfaces it on **Follow-ups**.
5. The deal is moved to **Won** or **Lost**, which timestamps `closed_at` and removes
   it from open-pipeline totals; Won revenue then counts toward the Dashboard's
   monthly revenue, win rate, and per-rep leaderboard.

### 5.3 Daily rep workflow
The intended daily loop is: open **Follow-ups**, work down the Overdue and Due-today
buckets, use "Log follow-up" to close out each touch and schedule the next one, and
use the Pipeline board opportunistically to move deals forward.

## 6. Roadmap / known gaps (as of this writing)

- No email delivery — invitation links and any other "share this" flow rely on the
  admin copying and manually sending a link.
- No historical/audit log for stage or lead-status changes, so the sales funnel is a
  point-in-time snapshot, not a true cohort funnel (see §4.6).
- No per-field permissions beyond the rep/admin split — a rep sees 100% or 0% of a
  record's fields, never a subset.
- Projects have no owner and no lifecycle status (active/archived); they're a flat,
  permanent list.
