-- LifeLingo AI V1 intelligence foundation (production migration 20260906004837).
-- Additive only: existing auth, progress, avatar, partner, subscription and course data remain untouched.

create schema if not exists private;

create table if not exists public.learner_models (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anonymous_learner_id uuid not null unique default gen_random_uuid(),
  estimated_level text check (estimated_level is null or estimated_level in ('A1','A2','B1','B2','C1','C2')),
  level_confidence numeric(5,4) not null default 0 check (level_confidence between 0 and 1),
  help_level text not null default 'SOME_SUPPORT' check (help_level in ('FULL_SUPPORT','SOME_SUPPORT','ENGLISH_ONLY')),
  skill_mastery jsonb not null default '{}'::jsonb,
  weak_skills text[] not null default '{}',
  strong_skills text[] not null default '{}',
  known_vocabulary text[] not null default '{}',
  learning_vocabulary text[] not null default '{}',
  recent_mistakes jsonb not null default '[]'::jsonb,
  repeated_mistakes jsonb not null default '{}'::jsonb,
  review_priorities text[] not null default '{}',
  difficulty_profile jsonb not null default '{}'::jsonb,
  performance_trend numeric(7,4) not null default 0,
  speaking_performance jsonb not null default '{}'::jsonb,
  completed_scenarios text[] not null default '{}',
  recent_topics text[] not null default '{}',
  event_count integer not null default 0 check (event_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_skill_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null check (skill_id ~ '^[a-z0-9][a-z0-9_.-]{1,95}$'),
  mastery numeric(6,5) not null default 0.35 check (mastery between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  recent_accuracy numeric(6,5) not null default 0.5 check (recent_accuracy between 0 and 1),
  hint_dependency numeric(6,5) not null default 0 check (hint_dependency between 0 and 1),
  translation_dependency numeric(6,5) not null default 0 check (translation_dependency between 0 and 1),
  performance_trend numeric(7,5) not null default 0,
  difficulty_state text not null default 'APPROPRIATE' check (difficulty_state in ('TOO_EASY','APPROPRIATE','TOO_HARD')),
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anonymous_learner_id uuid not null,
  event_type text not null check (event_type in (
    'LESSON_STARTED','LESSON_COMPLETED','VOCABULARY_VIEWED','VOCABULARY_ANSWERED',
    'VOCABULARY_RECALL','VOCABULARY_FORGOTTEN','GRAMMAR_ANSWERED','LISTENING_ANSWERED',
    'PRONUNCIATION_ATTEMPT','READING_ANSWERED','WRITING_SUBMISSION','REVIEW_RESULT',
    'SPEAK_STARTED','SPEAK_ATTEMPT','SPEAK_FEEDBACK','CONVERSATION_STARTED',
    'CONVERSATION_TURN','CONVERSATION_CORRECTION','CONVERSATION_COMPLETED','MISSION_STARTED',
    'MISSION_OBJECTIVE_COMPLETED','MISSION_COMPLETED','AI_HINT_USED','AI_PARTNER_STARTED',
    'AI_PARTNER_COMPLETED'
  )),
  occurred_at timestamptz not null default now(),
  course_id text,
  chapter_id text,
  lesson_id text,
  activity_id text,
  scenario_id text,
  skill_id text check (skill_id is null or skill_id ~ '^[a-z0-9][a-z0-9_.-]{1,95}$'),
  attempt_number integer check (attempt_number is null or attempt_number between 1 and 10000),
  difficulty numeric(5,4) check (difficulty is null or difficulty between 0 and 1),
  correct boolean,
  score numeric(6,5) check (score is null or score between 0 and 1),
  response_time_ms integer check (response_time_ms is null or response_time_ms between 0 and 3600000),
  hint_used boolean not null default false,
  translation_used boolean not null default false,
  quality_label text not null default 'UNVERIFIED_USER_CONTENT' check (quality_label in (
    'LIFELINGO_VERIFIED','SYSTEM_GROUND_TRUTH','HUMAN_VERIFIED',
    'UNVERIFIED_USER_CONTENT','MODEL_GENERATED','SYNTHETIC'
  )),
  source text not null default 'client' check (source in ('client','server','ai_orchestrator','import')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and octet_length(metadata::text) <= 8192),
  created_at timestamptz not null default now()
);
create index if not exists learning_events_user_time_idx on public.learning_events(user_id, occurred_at desc);
create index if not exists learning_events_skill_time_idx on public.learning_events(user_id, skill_id, occurred_at desc) where skill_id is not null;
create index if not exists learning_events_anon_idx on public.learning_events(anonymous_learner_id, occurred_at desc);

create table if not exists public.spaced_repetition_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  skill_id text,
  source_item_id text,
  successful_recalls integer not null default 0,
  failed_recalls integer not null default 0,
  difficulty_signal numeric(5,4) not null default 0.5 check (difficulty_signal between 0 and 1),
  review_interval interval not null default interval '0 hours',
  last_reviewed_at timestamptz,
  next_review_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists spaced_repetition_due_idx on public.spaced_repetition_items(user_id, next_review_at);

create table if not exists public.ai_learning_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_anonymized_learning_activity boolean not null default false,
  allow_raw_voice_training boolean not null default false,
  consent_version text not null default 'ai-training-v1',
  consented_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('FREE_TALK','PRACTICE_WEAKNESSES','DAILY_TALK','MISSION')),
  scenario_id text,
  topic text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELLED','ERROR')),
  short_term_state jsonb not null default '{}'::jsonb check (octet_length(short_term_state::text) <= 16384),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists ai_sessions_user_time_idx on public.ai_sessions(user_id, started_at desc);

create table if not exists public.ai_turns (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.ai_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_number integer not null check (turn_number between 0 and 200),
  learner_input text not null check (char_length(learner_input) between 1 and 2000),
  ai_reply text not null check (char_length(ai_reply) between 1 and 3000),
  structured_result jsonb not null default '{}'::jsonb check (octet_length(structured_result::text) <= 16384),
  retrieved_knowledge_ids text[] not null default '{}',
  provider text not null,
  model text not null,
  quality_label text not null default 'MODEL_GENERATED',
  created_at timestamptz not null default now(),
  unique(session_id, turn_number)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  provider text,
  model text,
  status text not null default 'RESERVED' check (status in ('RESERVED','SUCCESS','TIMEOUT','RATE_LIMITED','NETWORK_ERROR','PROVIDER_ERROR','INVALID_RESPONSE','CANCELLED')),
  latency_ms integer,
  input_units integer,
  output_units integer,
  approximate_cost_usd numeric(12,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ai_usage_user_day_idx on public.ai_usage(user_id, created_at desc);

create table if not exists private.dataset_versions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  schema_version text not null,
  consent_version text not null,
  sanitizer_version text not null,
  sample_count integer not null default 0,
  sources jsonb not null default '[]'::jsonb,
  quality_distribution jsonb not null default '{}'::jsonb,
  split_information jsonb not null default '{}'::jsonb,
  artifact_uri text,
  created_at timestamptz not null default now(),
  unique(name, version)
);

create table if not exists private.model_registry (
  id uuid primary key default gen_random_uuid(),
  model_id text not null,
  model_type text not null,
  version text not null,
  dataset_version text,
  metrics jsonb not null default '{}'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  artifact_uri text,
  status text not null default 'EXPERIMENTAL' check (status in ('EXPERIMENTAL','STAGING','PRODUCTION','ARCHIVED','REJECTED')),
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  unique(model_id, version)
);
create unique index if not exists one_production_model_per_type on private.model_registry(model_type) where status='PRODUCTION';

create table if not exists private.training_runs (
  id uuid primary key default gen_random_uuid(),
  model_type text not null,
  dataset_version text not null,
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  command text,
  metrics jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.learner_models enable row level security;
alter table public.learner_skill_mastery enable row level security;
alter table public.learning_events enable row level security;
alter table public.spaced_repetition_items enable row level security;
alter table public.ai_learning_consents enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.ai_turns enable row level security;
alter table public.ai_usage enable row level security;

drop policy if exists learner_models_self_read on public.learner_models;
create policy learner_models_self_read on public.learner_models for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists learner_skill_mastery_self_read on public.learner_skill_mastery;
create policy learner_skill_mastery_self_read on public.learner_skill_mastery for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists learning_events_self_read on public.learning_events;
create policy learning_events_self_read on public.learning_events for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists spaced_repetition_self_read on public.spaced_repetition_items;
create policy spaced_repetition_self_read on public.spaced_repetition_items for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists ai_learning_consents_self_read on public.ai_learning_consents;
create policy ai_learning_consents_self_read on public.ai_learning_consents for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists ai_sessions_self_read on public.ai_sessions;
create policy ai_sessions_self_read on public.ai_sessions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists ai_turns_self_read on public.ai_turns;
create policy ai_turns_self_read on public.ai_turns for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.ensure_learner_model_v1()
returns public.learner_models
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare uid uuid := auth.uid(); outrow public.learner_models%rowtype; default_help text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select case when coalesce(p.preferred_language,'en')='fa' and coalesce(p.level,'beginner') in ('beginner','elementary') then 'FULL_SUPPORT' else 'SOME_SUPPORT' end
    into default_help from public.profiles p where p.id=uid;
  insert into public.learner_models(user_id,help_level)
  values(uid,coalesce(default_help,'SOME_SUPPORT'))
  on conflict(user_id) do nothing;
  insert into public.ai_learning_consents(user_id) values(uid) on conflict(user_id) do nothing;
  select * into outrow from public.learner_models where user_id=uid;
  return outrow;
end $$;

create or replace function public.bootstrap_learner_model_v1()
returns trigger language plpgsql security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.learner_models(user_id,help_level)
  values(new.id,case when coalesce(new.preferred_language,'en')='fa' and coalesce(new.level,'beginner') in ('beginner','elementary') then 'FULL_SUPPORT' else 'SOME_SUPPORT' end)
  on conflict(user_id) do nothing;
  insert into public.ai_learning_consents(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end $$;

drop trigger if exists profiles_bootstrap_learner_model_v1 on public.profiles;
create trigger profiles_bootstrap_learner_model_v1
after insert on public.profiles for each row execute function public.bootstrap_learner_model_v1();

insert into public.learner_models(user_id,help_level)
select p.id,case when coalesce(p.preferred_language,'en')='fa' and coalesce(p.level,'beginner') in ('beginner','elementary') then 'FULL_SUPPORT' else 'SOME_SUPPORT' end
from public.profiles p on conflict(user_id) do nothing;
insert into public.ai_learning_consents(user_id)
select p.id from public.profiles p on conflict(user_id) do nothing;

create or replace function public.record_learning_event_v1(p_event jsonb)
returns jsonb
language plpgsql security definer
set search_path=public,pg_temp
as $$
declare
  uid uuid:=auth.uid(); lm public.learner_models%rowtype; eid uuid;
  et text:=upper(coalesce(p_event->>'eventType',''));
  sid text:=nullif(lower(trim(p_event->>'skillId')),'');
  is_correct boolean:=case when p_event ? 'correct' then (p_event->>'correct')::boolean else null end;
  raw_score numeric:=case when p_event ? 'score' then greatest(0,least(1,(p_event->>'score')::numeric)) when is_correct is true then 1 when is_correct is false then 0 else null end;
  diff numeric:=greatest(0,least(1,coalesce((p_event->>'difficulty')::numeric,.5)));
  used_hint boolean:=coalesce((p_event->>'hintUsed')::boolean,false);
  used_translation boolean:=coalesce((p_event->>'translationUsed')::boolean,false);
  clean_meta jsonb:=coalesce(p_event->'metadata','{}'::jsonb) - array['email','phone','name','realName','partnerId','partnerIdentity','token','accessToken','payment','url'];
  old_mastery numeric:=.35; old_evidence int:=0; observation numeric; alpha numeric; new_mastery numeric;
  evidence_total int; avg_mastery numeric; avg_trend numeric; coverage numeric; next_level text; next_conf numeric;
  interval_days integer;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if et not in ('LESSON_STARTED','LESSON_COMPLETED','VOCABULARY_VIEWED','VOCABULARY_ANSWERED','VOCABULARY_RECALL','VOCABULARY_FORGOTTEN','GRAMMAR_ANSWERED','LISTENING_ANSWERED','PRONUNCIATION_ATTEMPT','READING_ANSWERED','WRITING_SUBMISSION','REVIEW_RESULT','SPEAK_STARTED','SPEAK_ATTEMPT','SPEAK_FEEDBACK','CONVERSATION_STARTED','CONVERSATION_TURN','CONVERSATION_CORRECTION','CONVERSATION_COMPLETED','MISSION_STARTED','MISSION_OBJECTIVE_COMPLETED','MISSION_COMPLETED','AI_HINT_USED','AI_PARTNER_STARTED','AI_PARTNER_COMPLETED') then raise exception 'invalid event type'; end if;
  if sid is not null and sid !~ '^[a-z0-9][a-z0-9_.-]{1,95}$' then raise exception 'invalid skill id'; end if;
  if jsonb_typeof(clean_meta)<>'object' or octet_length(clean_meta::text)>8192 then raise exception 'invalid metadata'; end if;
  select * into lm from publi