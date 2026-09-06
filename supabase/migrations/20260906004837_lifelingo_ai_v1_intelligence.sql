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
  select * into lm from public.ensure_learner_model_v1();
  insert into public.learning_events(user_id,anonymous_learner_id,event_type,occurred_at,course_id,chapter_id,lesson_id,activity_id,scenario_id,skill_id,attempt_number,difficulty,correct,score,response_time_ms,hint_used,translation_used,quality_label,source,metadata)
  values(uid,lm.anonymous_learner_id,et,coalesce((p_event->>'timestamp')::timestamptz,now()),nullif(p_event->>'courseId',''),nullif(p_event->>'chapterId',''),nullif(p_event->>'lessonId',''),nullif(p_event->>'activityId',''),nullif(p_event->>'scenarioId',''),sid,nullif(p_event->>'attemptNumber','')::int,diff,is_correct,raw_score,nullif(p_event->>'responseTimeMs','')::int,used_hint,used_translation,case when et='LESSON_COMPLETED' and exists(select 1 from public.user_learning_progress lp where lp.user_id=uid and lp.unit_id=p_event->>'lessonId' and lp.status='completed') then 'SYSTEM_GROUND_TRUTH' else 'UNVERIFIED_USER_CONTENT' end,'client',clean_meta)
  returning id into eid;

  if sid is not null and raw_score is not null and et in ('VOCABULARY_ANSWERED','VOCABULARY_RECALL','VOCABULARY_FORGOTTEN','GRAMMAR_ANSWERED','LISTENING_ANSWERED','PRONUNCIATION_ATTEMPT','READING_ANSWERED','WRITING_SUBMISSION','REVIEW_RESULT','SPEAK_ATTEMPT','SPEAK_FEEDBACK','CONVERSATION_CORRECTION','MISSION_OBJECTIVE_COMPLETED') then
    select mastery,evidence_count into old_mastery,old_evidence from public.learner_skill_mastery where user_id=uid and skill_id=sid;
    old_mastery:=coalesce(old_mastery,.35); old_evidence:=coalesce(old_evidence,0);
    observation:=greatest(0,least(1,raw_score*(.85+.30*diff)-case when used_hint then .08 else 0 end-case when used_translation then .06 else 0 end));
    alpha:=greatest(.12,least(.35,.45/sqrt(old_evidence+1)));
    new_mastery:=greatest(0,least(1,old_mastery*(1-alpha)+observation*alpha));
    insert into public.learner_skill_mastery(user_id,skill_id,mastery,evidence_count,correct_count,incorrect_count,recent_accuracy,hint_dependency,translation_dependency,performance_trend,difficulty_state,last_practiced_at,updated_at)
    values(uid,sid,new_mastery,1,case when is_correct then 1 else 0 end,case when is_correct=false then 1 else 0 end,coalesce(raw_score,.5),case when used_hint then 1 else 0 end,case when used_translation then 1 else 0 end,new_mastery-old_mastery,case when raw_score>=.9 and not used_hint and not used_translation then 'TOO_EASY' when raw_score<.45 or (used_hint and used_translation) then 'TOO_HARD' else 'APPROPRIATE' end,now(),now())
    on conflict(user_id,skill_id) do update set
      mastery=excluded.mastery,
      evidence_count=public.learner_skill_mastery.evidence_count+1,
      correct_count=public.learner_skill_mastery.correct_count+excluded.correct_count,
      incorrect_count=public.learner_skill_mastery.incorrect_count+excluded.incorrect_count,
      recent_accuracy=public.learner_skill_mastery.recent_accuracy*.7+excluded.recent_accuracy*.3,
      hint_dependency=public.learner_skill_mastery.hint_dependency*.8+excluded.hint_dependency*.2,
      translation_dependency=public.learner_skill_mastery.translation_dependency*.8+excluded.translation_dependency*.2,
      performance_trend=excluded.performance_trend,
      difficulty_state=case when public.learner_skill_mastery.evidence_count+1<3 then 'APPROPRIATE' else excluded.difficulty_state end,
      last_practiced_at=now(),updated_at=now();

    if et in ('REVIEW_RESULT','VOCABULARY_RECALL','VOCABULARY_FORGOTTEN') and coalesce(p_event->>'activityId','')<>'' then
      interval_days:=case when is_correct is not true then 0 when coalesce((select successful_recalls from public.spaced_repetition_items where user_id=uid and item_id=p_event->>'activityId'),0)=0 then 1 when coalesce((select successful_recalls from public.spaced_repetition_items where user_id=uid and item_id=p_event->>'activityId'),0)=1 then 3 when coalesce((select successful_recalls from public.spaced_repetition_items where user_id=uid and item_id=p_event->>'activityId'),0)=2 then 7 when coalesce((select successful_recalls from public.spaced_repetition_items where user_id=uid and item_id=p_event->>'activityId'),0)=3 then 14 else 30 end;
      insert into public.spaced_repetition_items(user_id,item_id,skill_id,source_item_id,successful_recalls,failed_recalls,difficulty_signal,review_interval,last_reviewed_at,next_review_at,updated_at)
      values(uid,p_event->>'activityId',sid,nullif(p_event->>'sourceItemId',''),case when is_correct then 1 else 0 end,case when is_correct=false then 1 else 0 end,1-coalesce(raw_score,.5),case when interval_days=0 then interval '6 hours' else make_interval(days=>interval_days) end,now(),now()+case when interval_days=0 then interval '6 hours' else make_interval(days=>interval_days) end,now())
      on conflict(user_id,item_id) do update set skill_id=excluded.skill_id,source_item_id=coalesce(excluded.source_item_id,public.spaced_repetition_items.source_item_id),successful_recalls=public.spaced_repetition_items.successful_recalls+excluded.successful_recalls,failed_recalls=public.spaced_repetition_items.failed_recalls+excluded.failed_recalls,difficulty_signal=public.spaced_repetition_items.difficulty_signal*.7+excluded.difficulty_signal*.3,review_interval=excluded.review_interval,last_reviewed_at=now(),next_review_at=excluded.next_review_at,updated_at=now();
    end if;
  end if;

  select coalesce(sum(evidence_count),0),coalesce(avg(mastery),.35),coalesce(avg(performance_trend),0),least(1,count(*)::numeric/12)
    into evidence_total,avg_mastery,avg_trend,coverage from public.learner_skill_mastery where user_id=uid;
  if evidence_total<12 then next_level:=null; next_conf:=least(.49,evidence_total::numeric/24); else
    next_level:=case when avg_mastery<.38 then 'A1' when avg_mastery<.52 then 'A2' when avg_mastery<.67 then 'B1' when avg_mastery<.79 then 'B2' when avg_mastery<.9 then 'C1' else 'C2' end;
    next_conf:=least(.95,.45+(least(evidence_total,80)::numeric/160)+coverage*.1);
  end if;
  update public.learner_models m set
    skill_mastery=coalesce((select jsonb_object_agg(skill_id,mastery order by skill_id) from public.learner_skill_mastery where user_id=uid),'{}'::jsonb),
    weak_skills=coalesce((select array_agg(skill_id order by mastery,last_practiced_at) from public.learner_skill_mastery where user_id=uid and evidence_count>=3 and (mastery<.58 or incorrect_count>=3)), '{}'),
    strong_skills=coalesce((select array_agg(skill_id order by mastery desc) from public.learner_skill_mastery where user_id=uid and evidence_count>=5 and mastery>=.78), '{}'),
    review_priorities=coalesce((select array_agg(skill_id order by (1-mastery)+least(.35,incorrect_count*.04) desc) from public.learner_skill_mastery where user_id=uid and evidence_count>=2 limit 8), '{}'),
    recent_mistakes=case
      when is_correct=false and sid is not null then
        case
          when jsonb_array_length(coalesce(m.recent_mistakes,'[]'::jsonb)) >= 12
            then (coalesce(m.recent_mistakes,'[]'::jsonb) #- '{0}'::text[]) || jsonb_build_array(jsonb_build_object('skillId',sid,'eventType',et,'at',now()))
          else coalesce(m.recent_mistakes,'[]'::jsonb) || jsonb_build_array(jsonb_build_object('skillId',sid,'eventType',et,'at',now()))
        end
      else m.recent_mistakes
    end,
    repeated_mistakes=case when is_correct=false and sid is not null then jsonb_set(coalesce(m.repeated_mistakes,'{}'::jsonb),array[sid],to_jsonb(coalesce((m.repeated_mistakes->>sid)::int,0)+1),true) else m.repeated_mistakes end,
    estimated_level=next_level,level_confidence=next_conf,performance_trend=avg_trend,event_count=m.event_count+1,updated_at=now()
  where m.user_id=uid;
  return jsonb_build_object('eventId',eid,'mastery',case when sid is null then null else new_mastery end,'estimatedLevel',next_level,'levelConfidence',next_conf);
end $$;

create or replace function public.get_learner_intelligence_v1()
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); lm public.learner_models%rowtype; p public.profiles%rowtype; c public.ai_learning_consents%rowtype;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into lm from public.ensure_learner_model_v1();
  select * into p from public.profiles where id=uid;
  select * into c from public.ai_learning_consents where user_id=uid;
  return jsonb_build_object(
    'anonymousLearnerId',lm.anonymous_learner_id,
    'estimatedLevel',lm.estimated_level,
    'levelConfidence',lm.level_confidence,
    'levelDisplay',case when lm.estimated_level is null then 'STILL_LEARNING' else lm.estimated_level end,
    'declaredLevel',p.level,
    'learningGoals',coalesce(p.learning_goals,'{}'),
    'helpLevel',lm.help_level,
    'skillMastery',lm.skill_mastery,
    'weakSkills',lm.weak_skills,
    'strongSkills',lm.strong_skills,
    'reviewPriorities',lm.review_priorities,
    'performanceTrend',lm.performance_trend,
    'eventCount',lm.event_count,
    'completedScenarios',lm.completed_scenarios,
    'recentTopics',lm.recent_topics,
    'consent',jsonb_build_object('allowAnonymizedLearningActivity',coalesce(c.allow_anonymized_learning_activity,false),'allowRawVoiceTraining',coalesce(c.allow_raw_voice_training,false),'version',coalesce(c.consent_version,'ai-training-v1')),
    'skills',coalesce((select jsonb_agg(jsonb_build_object('skillId',s.skill_id,'mastery',s.mastery,'evidenceCount',s.evidence_count,'successRate',case when s.correct_count+s.incorrect_count=0 then null else s.correct_count::numeric/(s.correct_count+s.incorrect_count) end,'recentAccuracy',s.recent_accuracy,'hintDependency',s.hint_dependency,'translationDependency',s.translation_dependency,'trend',s.performance_trend,'difficultyState',s.difficulty_state,'lastPracticedAt',s.last_practiced_at) order by s.mastery) from public.learner_skill_mastery s where s.user_id=uid),'[]'::jsonb)
  );
end $$;

create or replace function public.set_ai_learning_preferences_v1(p_help_level text,p_allow_anonymized boolean)
returns jsonb language plpgsql security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_help_level not in ('FULL_SUPPORT','SOME_SUPPORT','ENGLISH_ONLY') then raise exception 'invalid help level'; end if;
  perform public.ensure_learner_model_v1();
  update public.learner_models set help_level=p_help_level,updated_at=now() where user_id=uid;
  insert into public.ai_learning_consents(user_id,allow_anonymized_learning_activity,consented_at,withdrawn_at,updated_at)
  values(uid,p_allow_anonymized,case when p_allow_anonymized then now() else null end,case when p_allow_anonymized then null else now() end,now())
  on conflict(user_id) do update set allow_anonymized_learning_activity=excluded.allow_anonymized_learning_activity,consented_at=case when excluded.allow_anonymized_learning_activity then coalesce(public.ai_learning_consents.consented_at,now()) else public.ai_learning_consents.consented_at end,withdrawn_at=case when excluded.allow_anonymized_learning_activity then null else now() end,updated_at=now();
  return public.get_learner_intelligence_v1();
end $$;

create or replace function public.get_personalized_review_v1(p_limit integer default 20)
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); lim int; ispro boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select e.is_pro into ispro from public.my_entitlements() e;
  lim:=least(greatest(coalesce(p_limit,20),1),case when coalesce(ispro,false) then 100 else 5 end);
  return coalesce((
    select jsonb_agg(jsonb_build_object('unit_id',x.unit_id,'item_key',x.item_key,'kind',x.kind,'prompt',x.prompt,'answer',x.answer,'strength',x.strength,'mistake_count',x.mistake_count,'due_at',x.due_at,'skill_id',x.skill_id,'priority',x.priority) order by x.priority desc,x.due_at)
    from (
      select r.*,case
        when r.kind='vocabulary' and r.unit_id like 'c1-%' then 'vocabulary.airport'
        when r.kind='grammar' then 'grammar.present_simple'
        when r.kind='listening' then 'listening.detail'
        when r.kind='pronunciation' then 'speaking.fluency'
        when r.kind='reading' then 'reading.detail'
        when r.kind='writing' then 'writing.sentence_structure'
        else lower(regexp_replace(r.kind,'[^a-z0-9]+','_','g'))||'.general' end skill_id,
        (greatest(0,extract(epoch from (now()-r.due_at))/86400)*.04 + r.mistake_count*.16 + (5-r.strength)*.12 + coalesce(1-sm.mastery,.5)*.48) priority
      from public.user_review_items r
      left join public.learner_skill_mastery sm on sm.user_id=uid and sm.skill_id=case
        when r.kind='vocabulary' and r.unit_id like 'c1-%' then 'vocabulary.airport'
        when r.kind='grammar' then 'grammar.present_simple'
        when r.kind='listening' then 'listening.detail'
        when r.kind='pronunciation' then 'speaking.fluency'
        when r.kind='reading' then 'reading.detail'
        when r.kind='writing' then 'writing.sentence_structure'
        else lower(regexp_replace(r.kind,'[^a-z0-9]+','_','g'))||'.general' end
      where r.user_id=uid and r.due_at<=now()
      order by priority desc,r.due_at limit lim
    ) x
  ),'[]'::jsonb);
end $$;

create or replace function public.get_ai_entitlements_v1()
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); pro boolean:=false; used int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(e.is_pro,false) into pro from public.my_entitlements() e;
  select count(*) into used from public.ai_usage where user_id=uid and created_at>=date_trunc('day',now()) and status<>'CANCELLED';
  return jsonb_build_object('isPro',pro,'dailyRequestLimit',case when pro then 60 else 8 end,'usedToday',used,'remainingToday',greatest(0,(case when pro then 60 else 8 end)-used),'features',jsonb_build_object('freeTalk',true,'dailyTalk',true,'practiceWeaknesses',pro,'aiMissions',case when pro then array['airport','shopping','interview'] else array['airport'] end));
end $$;

create or replace function public.reserve_ai_request_v1(p_feature text)
returns jsonb language plpgsql security definer
set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); ent jsonb; usage_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_feature not in ('FREE_TALK','PRACTICE_WEAKNESSES','DAILY_TALK','MISSION') then raise exception 'invalid feature'; end if;
  ent:=public.get_ai_entitlements_v1();
  if (ent->>'remainingToday')::int<=0 then return jsonb_build_object('allowed',false,'status','RATE_LIMITED','entitlements',ent); end if;
  if p_feature='PRACTICE_WEAKNESSES' and not (ent->>'isPro')::boolean then return jsonb_build_object('allowed',false,'status','PRO_REQUIRED','entitlements',ent); end if;
  insert into public.ai_usage(user_id,feature) values(uid,p_feature) returning id into usage_id;
  return jsonb_build_object('allowed',true,'usageId',usage_id,'entitlements',ent);
end $$;

create or replace function public.complete_ai_usage_v1(p_usage_id uuid,p_status text,p_provider text,p_model text,p_latency_ms integer,p_input_units integer default null,p_output_units integer default null)
returns boolean language plpgsql security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_status not in ('SUCCESS','TIMEOUT','RATE_LIMITED','NETWORK_ERROR','PROVIDER_ERROR','INVALID_RESPONSE','CANCELLED') then raise exception 'invalid status'; end if;
  update public.ai_usage set status=p_status,provider=left(p_provider,80),model=left(p_model,120),latency_ms=greatest(0,least(coalesce(p_latency_ms,0),3600000)),input_units=p_input_units,output_units=p_output_units,completed_at=now() where id=p_usage_id and user_id=auth.uid();
  return found;
end $$;

create or replace function public.start_ai_session_v1(p_mode text,p_scenario_id text default null,p_topic text default null)
returns uuid language plpgsql security definer
set search_path=public,pg_temp
as $$
declare sid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_mode not in ('FREE_TALK','PRACTICE_WEAKNESSES','DAILY_TALK','MISSION') then raise exception 'invalid mode'; end if;
  insert into public.ai_sessions(user_id,mode,scenario_id,topic) values(auth.uid(),p_mode,left(nullif(p_scenario_id,''),80),left(nullif(p_topic,''),120)) returning id into sid;
  return sid;
end $$;

create or replace function public.get_ai_session_context_v1(p_session_id uuid)
returns jsonb language plpgsql stable security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists(select 1 from public.ai_sessions where id=p_session_id and user_id=auth.uid()) then raise exception 'session not found'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('turnNumber',t.turn_number,'learnerInput',t.learner_input,'aiReply',t.ai_reply,'structuredResult',t.structured_result) order by t.turn_number) from (select * from public.ai_turns where session_id=p_session_id and user_id=auth.uid() order by turn_number desc limit 12)t),'[]'::jsonb);
end $$;

create or replace function public.record_ai_turn_v1(p_session_id uuid,p_turn_number integer,p_learner_input text,p_ai_reply text,p_structured_result jsonb,p_retrieved_ids text[],p_provider text,p_model text)
returns bigint language plpgsql security definer
set search_path=public,pg_temp
as $$
declare tid bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists(select 1 from public.ai_sessions where id=p_session_id and user_id=auth.uid() and status='ACTIVE') then raise exception 'active session not found'; end if;
  insert into public.ai_turns(session_id,user_id,turn_number,learner_input,ai_reply,structured_result,retrieved_knowledge_ids,provider,model)
  values(p_session_id,auth.uid(),greatest(0,least(p_turn_number,200)),left(trim(p_learner_input),2000),left(trim(p_ai_reply),3000),coalesce(p_structured_result,'{}'),coalesce(p_retrieved_ids,'{}'),left(p_provider,80),left(p_model,120))
  on conflict(session_id,turn_number) do update set learner_input=excluded.learner_input,ai_reply=excluded.ai_reply,structured_result=excluded.structured_result,retrieved_knowledge_ids=excluded.retrieved_knowledge_ids,provider=excluded.provider,model=excluded.model
  returning id into tid;
  update public.ai_sessions set updated_at=now() where id=p_session_id;
  return tid;
end $$;

create or replace function public.finish_ai_session_v1(p_session_id uuid,p_status text,p_summary jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer
set search_path=public,pg_temp
as $$
declare s public.ai_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_status not in ('COMPLETED','CANCELLED','ERROR') then raise exception 'invalid status'; end if;
  update public.ai_sessions set status=p_status,short_term_state=coalesce(p_summary,'{}'),ended_at=now(),updated_at=now() where id=p_session_id and user_id=auth.uid() returning * into s;
  if not found then return false; end if;
  if p_status='COMPLETED' and s.scenario_id is not null then update public.learner_models set completed_scenarios=array(select distinct x from unnest(completed_scenarios||s.scenario_id)x),updated_at=now() where user_id=auth.uid(); end if;
  if s.topic is not null then update public.learner_models set recent_topics=(array_prepend(s.topic,recent_topics))[1:8],updated_at=now() where user_id=auth.uid(); end if;
  return true;
end $$;

create or replace function private.sanitize_training_record_v1(p_record jsonb)
returns jsonb language sql immutable
set search_path=private,pg_temp
as $$
  select coalesce(p_record,'{}'::jsonb) - array['email','phone','name','display_name','real_name','url','account_id','user_id','partner_id','token','access_token','payment','raw_voice','voice_path'];
$$;

create or replace function public.admin_ai_overview_v1()
returns jsonb language plpgsql stable security definer
set search_path=public,private,pg_temp
as $$
begin
  if not public.is_app_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'learners',(select count(*) from public.learner_models),
    'events',(select count(*) from public.learning_events),
    'consentedLearners',(select count(*) from public.ai_learning_consents where allow_anonymized_learning_activity),
    'aiRequestsToday',(select count(*) from public.ai_usage where created_at>=date_trunc('day',now())),
    'aiFailuresToday',(select count(*) from public.ai_usage where created_at>=date_trunc('day',now()) and status not in ('SUCCESS','RESERVED')),
    'datasets',(select count(*) from private.dataset_versions),
    'models',(select count(*) from private.model_registry),
    'productionModels',coalesce((select jsonb_agg(jsonb_build_object('id',id,'modelId',model_id,'type',model_type,'version',version,'datasetVersion',dataset_version,'metrics',metrics,'status',status,'createdAt',created_at)) from private.model_registry where status='PRODUCTION'),'[]'::jsonb),
    'recentTrainingRuns',coalesce((select jsonb_agg(to_jsonb(x)) from (select id,model_type,dataset_version,status,metrics,started_at,finished_at,created_at from private.training_runs order by created_at desc limit 10)x),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_promote_model_v1(p_model uuid)
returns boolean language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare mt text;
begin
  if not public.is_app_admin() then raise exception 'forbidden'; end if;
  select model_type into mt from private.model_registry where id=p_model and status in ('EXPERIMENTAL','STAGING','ARCHIVED');
  if mt is null then raise exception 'candidate model not found'; end if;
  update private.model_registry set status='ARCHIVED' where model_type=mt and status='PRODUCTION';
  update private.model_registry set status='PRODUCTION',promoted_at=now() where id=p_model;
  return true;
end $$;

create or replace function public.admin_rollback_model_v1(p_model_type text)
returns boolean language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare prior uuid;
begin
  if not public.is_app_admin() then raise exception 'forbidden'; end if;
  select id into prior from private.model_registry where model_type=p_model_type and status='ARCHIVED' order by promoted_at desc nulls last,created_at desc limit 1;
  if prior is null then raise exception 'no rollback model'; end if;
  update private.model_registry set status='STAGING' where model_type=p_model_type and status='PRODUCTION';
  update private.model_registry set status='PRODUCTION',promoted_at=now() where id=prior;
  return true;
end $$;

revoke all on public.learner_models,public.learner_skill_mastery,public.learning_events,public.spaced_repetition_items,public.ai_learning_consents,public.ai_sessions,public.ai_turns,public.ai_usage from public,anon,authenticated;
grant select on public.learner_models,public.learner_skill_mastery,public.learning_events,public.spaced_repetition_items,public.ai_learning_consents,public.ai_sessions,public.ai_turns to authenticated;

revoke execute on function public.ensure_learner_model_v1() from public,anon;
revoke execute on function public.record_learning_event_v1(jsonb) from public,anon;
revoke execute on function public.get_learner_intelligence_v1() from public,anon;
revoke execute on function public.set_ai_learning_preferences_v1(text,boolean) from public,anon;
revoke execute on function public.get_personalized_review_v1(integer) from public,anon;
revoke execute on function public.get_ai_entitlements_v1() from public,anon;
revoke execute on function public.reserve_ai_request_v1(text) from public,anon;
revoke execute on function public.complete_ai_usage_v1(uuid,text,text,text,integer,integer,integer) from public,anon;
revoke execute on function public.start_ai_session_v1(text,text,text) from public,anon;
revoke execute on function public.get_ai_session_context_v1(uuid) from public,anon;
revoke execute on function public.record_ai_turn_v1(uuid,integer,text,text,jsonb,text[],text,text) from public,anon;
revoke execute on function public.finish_ai_session_v1(uuid,text,jsonb) from public,anon;
revoke execute on function public.admin_ai_overview_v1() from public,anon;
revoke execute on function public.admin_promote_model_v1(uuid) from public,anon;
revoke execute on function public.admin_rollback_model_v1(text) from public,anon;
revoke execute on function public.bootstrap_learner_model_v1() from public,anon,authenticated;

grant execute on function public.ensure_learner_model_v1() to authenticated;
grant execute on function public.record_learning_event_v1(jsonb) to authenticated;
grant execute on function public.get_learner_intelligence_v1() to authenticated;
grant execute on function public.set_ai_learning_preferences_v1(text,boolean) to authenticated;
grant execute on function public.get_personalized_review_v1(integer) to authenticated;
grant execute on function public.get_ai_entitlements_v1() to authenticated;
grant execute on function public.reserve_ai_request_v1(text) to authenticated;
grant execute on function public.complete_ai_usage_v1(uuid,text,text,text,integer,integer,integer) to authenticated;
grant execute on function public.start_ai_session_v1(text,text,text) to authenticated;
grant execute on function public.get_ai_session_context_v1(uuid) to authenticated;
grant execute on function public.record_ai_turn_v1(uuid,integer,text,text,jsonb,text[],text,text) to authenticated;
grant execute on function public.finish_ai_session_v1(uuid,text,jsonb) to authenticated;
grant execute on function public.admin_ai_overview_v1() to authenticated;
grant execute on function public.admin_promote_model_v1(uuid) to authenticated;
grant execute on function public.admin_rollback_model_v1(text) to authenticated;
