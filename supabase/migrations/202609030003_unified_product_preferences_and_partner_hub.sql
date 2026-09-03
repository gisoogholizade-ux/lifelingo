-- LifeLingo unified product restoration.
-- Safe/idempotent: preserves existing profiles, avatars, messages, Partner relationships and progress.

alter table public.profiles add column if not exists learning_goals text[] not null default '{}';
alter table public.profiles add column if not exists scenario_preferences text[] not null default '{}';
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists target_level text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists theme_preference text not null default 'system';
do $$ begin if not exists(select 1 from pg_constraint where conname='profiles_theme_preference_check') then alter table public.profiles add constraint profiles_theme_preference_check check(theme_preference in ('system','dark','light')); end if; end $$;

alter table public.partner_preferences add column if not exists topics text[] not null default '{}';
alter table public.partner_preferences add column if not exists interests text[] not null default '{}';
alter table public.partner_preferences add column if not exists availability text[] not null default '{}';
alter table public.partner_preferences add column if not exists preferred_timezone text;
alter table public.partner_preferences add column if not exists preferred_native_language text;
alter table public.partner_preferences add column if not exists matching_enabled boolean not null default true;

-- Existing sufficiently-configured users should not be forced through onboarding again.
update public.profiles set onboarding_completed=true where onboarding_completed=false and level is not null and learning_language is not null and (avatar_id is not null or avatar_url is not null);

create or replace function public.get_unified_profile()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; pr public.user_private%rowtype; pp public.partner_preferences%rowtype; m record; prog public.user_progress%rowtype; d public.user_daily_state%rowtype;
begin
 if u is null then raise exception 'not authenticated'; end if;
 select * into p from public.profiles where id=u; select * into pr from public.user_private where user_id=u; select * into pp from public.partner_preferences where user_id=u; select * into prog from public.user_progress where user_id=u; select * into d from public.user_daily_state where user_id=u; select * into m from public.my_membership();
 return jsonb_build_object('profile',jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_id',p.avatar_id,'avatar_gender',p.avatar_gender,'avatar_url',p.avatar_url,'native_language',p.native_language,'learning_language',p.learning_language,'level',p.level,'target_level',p.target_level,'age_group',p.age_group,'timezone',p.timezone,'region',p.region,'bio',p.bio,'discoverable',p.discoverable,'hint_language',p.hint_language,'learning_goals',p.learning_goals,'scenario_preferences',p.scenario_preferences,'interests',p.interests,'onboarding_completed',p.onboarding_completed,'theme_preference',p.theme_preference),'private',jsonb_build_object('phone',pr.phone,'contact_consent',coalesce(pr.contact_consent,false)),'partner',jsonb_build_object('target_language',pp.target_language,'preferred_level',pp.preferred_level,'conversation_goal',pp.conversation_goal,'text_enabled',pp.text_enabled,'voice_enabled',pp.voice_enabled,'topics',pp.topics,'interests',pp.interests,'availability',pp.availability,'preferred_timezone',pp.preferred_timezone,'preferred_native_language',pp.preferred_native_language,'matching_enabled',pp.matching_enabled),'membership',to_jsonb(m),'progress',jsonb_build_object('xp',coalesce(prog.xp,0),'goal',coalesce(prog.goal,'migration'),'paths',coalesce(prog.paths,'{}'::jsonb),'activity',coalesce(prog.activity,'[]'::jsonb),'days',coalesce(prog.days,'[]'::jsonb)),'daily',jsonb_build_object('study',coalesce(d.study,'{"dates":[],"dailyDone":{}}'::jsonb),'retention',coalesce(d.retention,'{"seconds":{},"sessions":0}'::jsonb)));
end $$;

create or replace function public.update_unified_profile(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); goals text[]; scenarios text[]; ints text[]; theme text;
begin
 if u is null then raise exception 'not authenticated'; end if;
 goals:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'learning_goals','[]'::jsonb))), '{}'); scenarios:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'scenario_preferences','[]'::jsonb))), '{}'); ints:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'interests','[]'::jsonb))), '{}');
 if exists(select 1 from unnest(goals) g where g not in ('immigration','work','travel','study','everyday','international')) then raise exception 'invalid learning goal'; end if;
 theme:=coalesce(nullif(p_payload->>'theme_preference',''),'system'); if theme not in ('system','dark','light') then raise exception 'invalid theme'; end if;
 update public.profiles set display_name=coalesce(nullif(left(trim(p_payload->>'display_name'),60),''),display_name),native_language=coalesce(nullif(p_payload->>'native_language',''),native_language),learning_language=coalesce(nullif(p_payload->>'learning_language',''),learning_language),level=nullif(p_payload->>'level',''),target_level=nullif(p_payload->>'target_level',''),age_group=coalesce(nullif(p_payload->>'age_group',''),age_group),timezone=nullif(p_payload->>'timezone',''),region=nullif(left(p_payload->>'region',80),''),bio=nullif(left(p_payload->>'bio',300),''),discoverable=coalesce((p_payload->>'discoverable')::boolean,discoverable),hint_language=coalesce(nullif(p_payload->>'hint_language',''),hint_language),learning_goals=goals,scenario_preferences=scenarios,interests=ints,theme_preference=theme,onboarding_completed=coalesce((p_payload->>'onboarding_completed')::boolean,onboarding_completed),updated_at=now(),last_seen_at=now() where id=u;
 return public.get_unified_profile();
end $$;

create or replace function public.update_partner_preferences_v2(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); t text[]; i text[]; a text[];
begin
 if u is null then raise exception 'not authenticated'; end if;
 t:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'topics','[]'::jsonb))), '{}'); i:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'interests','[]'::jsonb))), '{}'); a:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'availability','[]'::jsonb))), '{}');
 insert into public.partner_preferences(user_id,target_language,preferred_level,conversation_goal,text_enabled,voice_enabled,topics,interests,availability,preferred_timezone,preferred_native_language,matching_enabled,updated_at) values(u,coalesce(nullif(p_payload->>'target_language',''),'en'),nullif(p_payload->>'preferred_level',''),coalesce(nullif(p_payload->>'conversation_goal',''),'general'),coalesce((p_payload->>'text_enabled')::boolean,true),coalesce((p_payload->>'voice_enabled')::boolean,true),t,i,a,nullif(p_payload->>'preferred_timezone',''),nullif(p_payload->>'preferred_native_language',''),coalesce((p_payload->>'matching_enabled')::boolean,true),now()) on conflict(user_id) do update set target_language=excluded.target_language,preferred_level=excluded.preferred_level,conversation_goal=excluded.conversation_goal,text_enabled=excluded.text_enabled,voice_enabled=excluded.voice_enabled,topics=excluded.topics,interests=excluded.interests,availability=excluded.availability,preferred_timezone=excluded.preferred_timezone,preferred_native_language=excluded.preferred_native_language,matching_enabled=excluded.matching_enabled,updated_at=now();
 return (select jsonb_build_object('target_language',target_language,'preferred_level',preferred_level,'conversation_goal',conversation_goal,'text_enabled',text_enabled,'voice_enabled',voice_enabled,'topics',topics,'interests',interests,'availability',availability,'preferred_timezone',preferred_timezone,'preferred_native_language',preferred_native_language,'matching_enabled',matching_enabled) from public.partner_preferences where user_id=u);
end $$;

create or replace function public.list_avatar_choices() returns table(id integer,category text,src text) language sql stable security definer set search_path=public as $$ select a.id,a.category,a.src from public.avatar_catalog a where auth.uid() is not null and a.active=true order by a.category,a.id $$;
create or replace function public.set_avatar_choice(p_avatar integer) returns jsonb language plpgsql security definer set search_path=public as $$ declare u uuid:=auth.uid(); a public.avatar_catalog%rowtype; begin if u is null then raise exception 'not authenticated'; end if; select * into a from public.avatar_catalog where id=p_avatar and active=true; if not found then raise exception 'avatar not found'; end if; update public.profiles set avatar_id=a.id,avatar_gender=a.category,avatar_url=a.src,avatar_revealed_at=coalesce(avatar_revealed_at,now()),updated_at=now() where id=u; return jsonb_build_object('avatar_id',a.id,'avatar_gender',a.category,'avatar_url',a.src); end $$;

create or replace function public.discover_partners_v2(p_limit integer default 24)
returns table(id uuid,display_name text,avatar_url text,native_language text,learning_language text,level text,target_level text,timezone text,bio text,learning_goals text[],interests text[],topics text[],availability text[],last_seen_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare me uuid:=auth.uid(); my_age text; my_learning text; pref_native text;
begin
 if me is null then raise exception 'not authenticated'; end if; select p.age_group,p.learning_language into my_age,my_learning from public.profiles p where p.id=me; select pp.preferred_native_language into pref_native from public.partner_preferences pp where pp.user_id=me;
 return query select p.id,p.display_name,p.avatar_url,p.native_language,p.learning_language,p.level,p.target_level,p.timezone,p.bio,p.learning_goals,p.interests,coalesce(pp.topics,'{}'),coalesce(pp.availability,'{}'),p.last_seen_at from public.profiles p left join public.partner_preferences pp on pp.user_id=p.id where p.id<>me and p.discoverable=true and coalesce(pp.matching_enabled,true)=true and my_age is not null and p.age_group=my_age and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me)) order by (case when pref_native is not null and p.native_language=pref_native then 0 when my_learning is not null and p.native_language=my_learning then 1 else 2 end),p.last_seen_at desc nulls last limit greatest(1,least(coalesce(p_limit,24),50));
end $$;

revoke execute on function public.get_unified_profile() from public,anon; revoke execute on function public.update_unified_profile(jsonb) from public,anon; revoke execute on function public.update_partner_preferences_v2(jsonb) from public,anon; revoke execute on function public.list_avatar_choices() from public,anon; revoke execute on function public.set_avatar_choice(integer) from public,anon; revoke execute on function public.discover_partners_v2(integer) from public,anon;
grant execute on function public.get_unified_profile() to authenticated; grant execute on function public.update_unified_profile(jsonb) to authenticated; grant execute on function public.update_partner_preferences_v2(jsonb) to authenticated; grant execute on function public.list_avatar_choices() to authenticated; grant execute on function public.set_avatar_choice(integer) to authenticated; grant execute on function public.discover_partners_v2(integer) to authenticated;