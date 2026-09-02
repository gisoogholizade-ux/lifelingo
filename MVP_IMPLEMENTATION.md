# LifeLingo Production MVP

## Architecture

LifeLingo remains a static GitHub Pages frontend backed by Supabase Auth/Postgres/RLS/RPCs. The original Conversation and Partner application remains in `v59.html`; the new learner application is `v65.html` and integrates the existing mission engine instead of replacing it.

The learning hierarchy is database-driven:

`course_catalog -> course_chapters -> course_units -> user_learning_progress / user_chapter_progress`

Lesson content is stored as JSON activity configuration in `course_units.content`. Full lesson content is not directly selectable by browser roles; authenticated users receive it through `get_lesson()` only after backend entitlement and prerequisite checks.

## Central access layer

- `my_entitlements()` — current plan/status/expiry plus Review/Partner limits.
- `can_access_chapter()` — plan + prior chapter progression.
- `can_access_lesson()` — chapter access + sequential required lesson completion.
- `get_learning_home()` — safe course outline and progress, without protected lesson content.
- `get_lesson()` — protected lesson content.
- `complete_course_unit()` — idempotent completion, XP, chapter progress, review-item generation.

The backend is authoritative. Frontend lock states are UX only.

## Course seed

`English for Life Abroad`

- Chapter 1 — Your First Day (Free, complete MVP chapter)
  - Arrival Word Lab
  - Say It Clearly
  - Listen at Passport Control
  - Present Simple for Arrival
  - Read the Arrival Card
  - Write Your Arrival Reply
  - Passport Control Mission
  - First Day Final Challenge
  - Chapter 1 Review
- Chapter 2 — Your First Week Abroad (Pro)
- Chapter 3 — Finding a Home (Pro)
- Chapter 4 — Banking & Money (Pro)
- Chapter 5 — Doctor & Pharmacy (Pro)

## Conversation compatibility

The original Conversation flow is preserved. Course conversation units map to legacy `path` / `mission` metadata. `complete_mission()` still updates the original mission progress/XP and now also marks a mapped Course conversation unit complete when its prerequisites and entitlement are valid.

## Plans

Free:
- Chapter 1
- core lesson types
- first Conversation Mission
- limited Review queue (5 due items)
- one direct Partner
- XP/progress/profile

Pro:
- premium chapters and course units
- expanded Review queue
- additional Conversation Missions
- advanced Challenges
- expanded direct Partner capacity

Expired Pro is computed server-side from `expires_at`. Premium content relocks while existing progress is retained.

## Manual upgrade/admin

Users submit `request_upgrade()`. Duplicate pending requests are rejected. Client code never activates Pro.

Admin RPCs require an authenticated caller and perform `is_app_admin()` authorization before returning private user data or changing plan state. `admin_activate_pro()` extends an active subscription from its existing expiry instead of discarding remaining time.

Admin UI: `admin.html` -> `admin-v2.html`.

## Registration/privacy

Registration uses the existing Supabase Auth system and `handle_new_user()` trigger. Name, email, mobile and password are collected. Mobile and optional contact consent are written to `user_private`; mobile is not part of public Partner/profile data.

## Migration order

1. `supabase/migrations/202609030001_lifelingo_learning_mvp.sql`
2. `supabase/migrations/202609030002_restore_existing_rpc_grants.sql`

Production Supabase already has the equivalent migrations applied.

## QA performed

A temporary QA auth user was created, exercised, and deleted. Server-side E2E assertions passed for:

- registration metadata -> private mobile/consent
- default Free membership
- sequential Chapter 1 unlocking
- secure premium lock
- original Conversation completion -> Course completion
- Final Challenge -> Chapter completion
- Review-item generation
- duplicate upgrade-request rejection
- idempotent XP on repeated completion
- Admin 1-month Pro activation
- Chapter 2 unlock after Pro
- expiry relock
- progress preservation after expiry
- non-admin authorization check
- protected `course_units` content not directly selectable by authenticated users

No persistent QA/demo account was left behind.

## External/config limitations

- Online payment is intentionally not part of this MVP; activation is manual.
- AI pronunciation/writing scoring is intentionally not faked; UI/data hooks are prepared for future implementation.
- Supabase leaked-password protection is currently a project Auth setting and should be enabled in the Supabase dashboard for stronger production password policy.
- Browser-level cross-device visual regression automation is not configured in this repository; responsive layouts are implemented with mobile/tablet/desktop breakpoints and server flows were E2E-tested.