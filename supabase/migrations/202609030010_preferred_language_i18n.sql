alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.profiles'::regclass
      and conname='profiles_preferred_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('en','fa'));
  end if;
end $$;

create or replace function public.set_preferred_language(p_language text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lang text := lower(coalesce(p_language,''));
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if lang not in ('en','fa') then raise exception 'invalid language'; end if;
  update public.profiles
     set preferred_language=lang, updated_at=now(), last_seen_at=now()
   where id=uid;
  if not found then raise exception 'profile not found'; end if;
  return lang;
end $$;

revoke all on function public.set_preferred_language(text) from public, anon;
grant execute on function public.set_preferred_language(text) to authenticated;

create or replace function public.get_unified_profile()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
 u uuid:=auth.uid(); p public.profiles%rowtype; pr public.user_private%rowtype; pp public.partner_preferences%rowtype; m record; prog public.user_progress%rowtype; d public.user_daily_state%rowtype;
begin
 if u is null then raise exception 'not authenticated'; end if;
 select * into p from public.profiles where id=u;
 select * into pr from public.user_private where user_id=u;
 select * into pp from public.partner_preferences where user_id=u;
 select * into prog from public.user_progress where user_id=u;
 select * into d from public.user_daily_state where user_id=u;
 select * into m from public.my_membership();
 return jsonb_build_object(
   'profile',jsonb_build_object(
     'id',p.id,'display_name',p.display_name,'avatar_id',p.avatar_id,'avatar_gender',p.avatar_gender,
     'avatar_url',p.avatar_url,'avatar_revealed_at',p.avatar_revealed_at,'profile_photo_url',p.profile_photo_url,
     'display_image_url',coalesce(p.profile_photo_url,p.avatar_url),'native_language',p.native_language,
     'learning_language',p.learning_language,'level',p.level,'target_level',p.target_level,'age_group',p.age_group,
     'timezone',p.timezone,'region',p.region,'bio',p.bio,'discoverable',p.discoverable,'hint_language',p.hint_language,
     'learning_goals',p.learning_goals,'scenario_preferences',p.scenario_preferences,'interests',p.interests,
     'onboarding_completed',p.onboarding_completed,'theme_preference',p.theme_preference,
     'preferred_language',p.preferred_language),
   'private',jsonb_build_object('phone',pr.phone,'contact_consent',coalesce(pr.contact_consent,false)),
   'partner',jsonb_build_object('target_language',pp.target_language,'preferred_level',pp.preferred_level,
     'conversation_goal',pp.conversation_goal,'text_enabled',pp.text_enabled,'voice_enabled',pp.voice_enabled,
     'topics',pp.topics,'interests',pp.interests,'availability',pp.availability,'preferred_timezone',pp.preferred_timezone,
     'preferred_native_language',pp.preferred_native_language,'matching_enabled',pp.matching_enabled),
   'membership',to_jsonb(m),
   'progress',jsonb_build_object('xp',coalesce(prog.xp,0),'goal',coalesce(prog.goal,'migration'),
     'paths',coalesce(prog.paths,'{}'::jsonb),'activity',coalesce(prog.activity,'[]'::jsonb),'days',coalesce(prog.days,'[]'::jsonb)),
   'daily',jsonb_build_object('study',coalesce(d.study,'{"dates":[],"dailyDone":{}}'::jsonb),
     'retention',coalesce(d.retention,'{"seconds":{},"sessions":0}'::jsonb)));
end $$;

create or replace function public.update_unified_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
 u uuid:=auth.uid(); goals text[]; scenarios text[]; ints text[]; theme text; lang text;
begin
 if u is null then raise exception 'not authenticated'; end if;
 goals:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'learning_goals','[]'::jsonb))), '{}');
 scenarios:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'scenario_preferences','[]'::jsonb))), '{}');
 ints:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'interests','[]'::jsonb))), '{}');
 if exists(select 1 from unnest(goals) g where g not in ('immigration','work','travel','study','everyday','international')) then raise exception 'invalid learning goal'; end if;
 theme:=coalesce(nullif(p_payload->>'theme_preference',''),'system');
 if theme not in ('system','dark','light') then raise exception 'invalid theme'; end if;
 select preferred_language into lang from public.profiles where id=u;
 lang:=coalesce(nullif(lower(p_payload->>'preferred_language'),''),lang,'en');
 if lang not in ('en','fa') then raise exception 'invalid language'; end if;
 update public.profiles set
  display_name=coalesce(nullif(left(trim(p_payload->>'display_name'),60),''),display_name),
  native_language=coalesce(nullif(p_payload->>'native_language',''),native_language),
  learning_language=coalesce(nullif(p_payload->>'learning_language',''),learning_language),
  level=nullif(p_payload->>'level',''),target_level=nullif(p_payload->>'target_level',''),
  age_group=coalesce(nullif(p_payload->>'age_group',''),age_group),timezone=nullif(p_payload->>'timezone',''),
  region=nullif(left(p_payload->>'region',80),''),bio=nullif(left(p_payload->>'bio',300),''),
  discoverable=coalesce((p_payload->>'discoverable')::boolean,discoverable),
  hint_language=coalesce(nullif(p_payload->>'hint_language',''),hint_language),
  learning_goals=goals,scenario_preferences=scenarios,interests=ints,theme_preference=theme,preferred_language=lang,
  onboarding_completed=coalesce((p_payload->>'onboarding_completed')::boolean,onboarding_completed),updated_at=now(),last_seen_at=now()
 where id=u;
 return public.get_unified_profile();
end $$;