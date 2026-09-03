# LifeLingo Product Unification Report

## Reconciliation: old + new -> final unified product

| Old / pre-redesign capability | New MVP capability | Final unified result | Status |
|---|---|---|---|
| Passport / life-journey identity | Course progress / XP | Life Passport, XP, chapter progress and achievements on Home/Profile | MERGED |
| Cinematic / animated scenario engine | Chapter Conversation units | Existing scenario engine preserved and launched from Speak + Course | MERGED |
| Voice mission support | Structured lessons | Voice remains in Conversation Missions; speaking is surfaced on Home/Speak/Daily | MERGED |
| Avatar catalog / surprise avatar / profile photo | New basic Profile | Existing avatar data preserved; choose/change/upload avatar in unified Profile | MERGED |
| Daily phrase / retention experiments | Server-backed Daily state | Daily Surprise with listening, speaking/type challenge, streak and Supabase persistence | MERGED |
| Partner discovery/chat/voice/block/report | Free/Pro entitlements | Unified Partners view reuses conversations/messages/storage; Free=1 direct Partner, Pro expands | MERGED |
| Editable language profile | New plan/progress profile | One Profile now contains identity, goals, avatar, languages, levels, progress, plan, theme, privacy | MERGED |
| Dark/light styling patches | New learner design | One token-based dark/light/system design system; mission engine receives same theme | MERGED |
| Old dashboard/navigation generations | New Course nav | One Home/Learn/Speak/Partners/Review/Profile navigation in primary app | RESTORED/UNIFIED |
| 365 phrase data | New Course system | Reused as Daily Surprise content instead of duplicated phrase content | REUSED |
| Existing Supabase Auth | New registration requirements | Same Auth; registration adds Name/Email/Mobile/Password + optional contact consent | UNCHANGED/MERGED |
| Existing mission progress | New lesson/chapter progress | Mission progress preserved and mapped into Course progress when appropriate | MERGED |
| Existing Course/Chapter/Review | — | Preserved as the structured long-term learning system | UNCHANGED |
| Existing manual Pro/Admin | — | Preserved; backend remains authoritative and admin-only activation remains | UNCHANGED |

No production users, messages, Partner relationships, avatars, XP, mission progress, course progress, subscriptions, or Daily state were deleted by the unification migrations.

## Navigation

Primary learner navigation is now:

`Home -> Learn -> Speak -> Partners -> Review -> Profile`

Home puts the product loop in this order: Continue Journey, Life Passport, Daily Surprise, Speak Now scenario, Continue Chapter, Human Partner practice, goal-based scenarios, Review, goals.

## Onboarding

New users receive a lightweight 6-step onboarding after account creation:

1. Why are you learning? (multi-select: Immigration, Work, Travel, Study, Everyday Life, International Communication)
2. Current + target level
3. Preferred real-life scenarios
4. LifeLingo avatar
5. Optional safe Partner matching setup
6. First Life Mission / ready state

Returning users with enough existing profile data are not forced through the full onboarding. Missing/new preferences remain editable in Profile.

## Personalization

`profiles.learning_goals` and `profiles.scenario_preferences` persist choices server-side. Home/Speak scenario priority changes according to selected goals. Users can update them later; they are not permanently locked into a path.

## Avatar

The existing `avatar_catalog`, existing `profiles.avatar_id/avatar_gender/avatar_url`, and existing profile-photo bucket are preserved. Unified Profile and onboarding use the same data. Users can choose a catalog avatar or upload a profile photo.

## Daily Surprise

Daily Surprise is available on Free. It uses the existing 365-phrase content, listening, optional browser speech recognition, typed fallback, and a real-life prompt. Completion/streak state is persisted through the existing server-backed Daily RPCs rather than critical localStorage state.

## Partners

The unified Partner area keeps the existing Supabase `conversations`, `conversation_members`, `messages`, `blocks`, `reports`, `profile-photos`, and `chat-voice` systems. It adds richer matching preferences (topics/interests/availability/etc.) and a server RPC for safe discovery.

Discovery:
- requires authentication
- only returns discoverable/matching-enabled profiles
- matches the same `age_group`
- excludes blocked relationships
- does not return email/mobile/private contact data

Chat supports text, existing voice-message storage, realtime updates, read receipts, report and block. Free remains network-participating and supports one active direct Partner; Pro expands Partner capacity.

## Profile

Unified Profile includes avatar, name, level/target level, XP, streak, completed chapters, learning goals, scenario preferences, achievements, Life Passport level, Free/Pro/Expired plan, theme, privacy, editable Partner settings and account logout. Editing preserves existing values unless the user explicitly changes them.

## Theme / design system

`lifelingo-unified.css` is the primary design system for learner-facing unified UI. It centralizes surfaces, text, borders, accent, success/warning/danger, radius, shadow, controls, navigation, course nodes, scenario cards, Daily, Partner/chat, modal, onboarding and responsive behavior.

Dark, Light and System preferences are stored in `profiles.theme_preference`. The preserved legacy Conversation mission is not rewritten; targeted `v66-legacy.css` migrates its visible mission UI into the same visual language and `v66-conversation-bridge.js` applies the saved theme.

Admin uses a targeted unified override while preserving the existing admin authorization and functionality.

## Free / Pro

Free demonstrates LifeLingo's differentiators:
- onboarding/profile/avatar
- full Chapter 1
- Daily Surprise
- real-life speaking sample / first Course Conversation Mission
- basic Review queue
- Partner discovery + one direct Partner
- chat/voice where supported
- XP/streak/Passport/achievements
- dark/light/system theme

Pro expands rather than reveals the whole product:
- premium chapters
- additional mapped Conversation Missions
- deeper Review queue
- more direct Partner capacity
- advanced Challenges
- future AI/pronunciation capabilities can attach later without fake current AI scoring

Premium legacy missions mapped to premium chapters are also protected in `complete_mission()` so a direct old URL cannot become a frontend-only entitlement bypass.

## Database changes

Migration `202609030003_unified_product_preferences_and_partner_hub.sql` safely adds profile/onboarding/theme and richer Partner preference fields plus authenticated RPCs for unified profile, avatar and safe Partner discovery.

Migration `202609030004_protect_premium_legacy_missions.sql` adds server-side protection for mapped premium legacy missions while preserving old mission progress and free samples.

## Routes

- Primary unified learner app: `v66.html`
- Existing Conversation mission engine: `v59.html` (opened via the unified bridge)
- Admin: `admin.html -> admin-v2.html`
- Legacy files remain for compatibility but are no longer separate primary learner frontends.

## QA / regression

Automated repository validation checks JavaScript syntax for the unified app/bridge/Supabase client, required integration references, a plaintext-password-localStorage guard, and migration presence.

Database regression checks confirm:
- 10 active existing avatars remain
- Chapter 1 still has 9 active lesson units
- existing conversation/message tables remain populated
- mobile is not a public `profiles` column
- six new Profile and six new Partner preference fields exist
- unified profile, Partner discovery and mission-completion RPCs are not executable by `anon` but are executable by `authenticated`
- profile-photo and chat-voice buckets still exist
- message/block/report RLS policies for authenticated users remain present

Browser-level automated visual regression across Safari/Chrome/tablet is not configured in this static repository. Responsive breakpoints and failure/empty/loading states are implemented, and JavaScript/static integration checks run in CI; real-device visual QA remains a manual release check.

## Intentionally unchanged / external limitations

- Core legacy Conversation interaction/animation/voice engine is preserved rather than rewritten.
- Supabase Auth remains the single authentication system.
- Manual subscription activation remains intentional; there is no fake payment gateway.
- AI pronunciation/writing scoring is not faked. The UI/data architecture leaves extension points for future AI features.
- Closed-app OS push notifications are not implemented.
- Supabase leaked-password protection is a project Auth setting and should be enabled from the Supabase dashboard if available on the current plan.
