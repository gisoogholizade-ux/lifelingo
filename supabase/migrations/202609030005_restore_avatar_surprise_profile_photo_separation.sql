alter table public.profiles add column if not exists profile_photo_url text;

update public.profiles p set avatar_id=a.id,avatar_gender=a.category,avatar_revealed_at=coalesce(p.avatar_revealed_at,p.updated_at,now()) from public.avatar_catalog a where p.avatar_id is null and p.avatar_url=a.src;
update public.profiles p set profile_photo_url=p.avatar_url where p.profile_photo_url is null and p.avatar_url is not null and not exists(select 1 from public.avatar_catalog a where a.src=p.avatar_url);
update public.profiles p set avatar_url=a.src,avatar_gender=a.category from public.avatar_catalog a where p.avatar_id=a.id;
update public.profiles p set avatar_url=null where p.avatar_id is null and p.avatar_url is not null and not exists(select 1 from public.avatar_catalog a where a.src=p.avatar_url);

create or replace function public.claim_random_avatar(p_gender text)
returns table(avatar_id integer,avatar_gender text,avatar_url text)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); chosen public.avatar_catalog%rowtype; existing public.profiles%rowtype; a public.avatar_catalog%rowtype;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_gender not in ('girls','boys') then raise exception 'Invalid avatar group'; end if;
 select * into existing from public.profiles where id=uid for update;
 if not found then raise exception 'Profile not found'; end if;
 if existing.avatar_id is not null then select * into a from public.avatar_catalog where id=existing.avatar_id and active=true; if not found then raise exception 'Assigned avatar unavailable'; end if; return query select a.id,a.category,a.src; return; end if;
 select * into chosen from public.avatar_catalog where category=p_gender and active=true order by random() limit 1;
 if not found then raise exception 'No avatar available'; end if;
 update public.profiles set avatar_id=chosen.id,avatar_gender=chosen.category,avatar_url=chosen.src,avatar_revealed_at=coalesce(avatar_revealed_at,now()),updated_at=now() where id=uid;
 return query select chosen.id,chosen.category,chosen.src;
end $$;

create or replace function public.set_profile_photo(p_url text) returns text language plpgsql security definer set search_path=public as $$ declare uid uuid:=auth.uid(); begin if uid is null then raise exception 'Not authenticated'; end if; if p_url is null or length(p_url)>1000 then raise exception 'Invalid photo URL'; end if; update public.profiles set profile_photo_url=p_url,updated_at=now() where id=uid; return p_url; end $$;
create or replace function public.remove_profile_photo() returns boolean language plpgsql security definer set search_path=public as $$ declare uid uuid:=auth.uid(); begin if uid is null then raise exception 'Not authenticated'; end if; update public.profiles set profile_photo_url=null,updated_at=now() where id=uid; return true; end $$;
create or replace function public.use_lifelingo_avatar() returns table(avatar_id integer,avatar_gender text,avatar_url text) language plpgsql stable security definer set search_path=public as $$ declare uid uuid:=auth.uid(); a public.avatar_catalog%rowtype; p public.profiles%rowtype; begin if uid is null then raise exception 'Not authenticated'; end if; select * into p from public.profiles where id=uid; if p.avatar_id is null then raise exception 'No LifeLingo avatar claimed'; end if; select * into a from public.avatar_catalog where id=p.avatar_id and active=true; if not found then raise exception 'Avatar unavailable'; end if; return query select a.id,a.category,a.src; end $$;
create or replace function public.set_avatar_choice(p_avatar integer) returns jsonb language plpgsql security definer set search_path=public as $$ declare u uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype; begin if u is null then raise exception 'not authenticated'; end if; select * into p from public.profiles where id=u for update; if p.avatar_id is null then raise exception 'Use Avatar Surprise to reveal your LifeLingo avatar'; end if; select * into a from public.avatar_catalog where id=p.avatar_id and active=true; if not found then raise exception 'avatar unavailable'; end if; return jsonb_build_object('avatar_id',a.id,'avatar_gender',a.category,'avatar_url',a.src); end $$;

create or replace function public.get_unified_profile()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid(); p public.profiles%rowtype; pr public.user_private%rowtype; pp public.partner_preferences%rowtype; m record; prog public.user_progress%rowtype; d public.user_daily_state%rowtype;
begin
 if u is null then raise exception 'not authenticated'; end if;
 select * into p from public.profiles where id=u; select * into pr from public.user_private where user_id=u; select * into pp from public.partner_preferences where user_id=u; select * into prog from public.user_progress where user_id=u; select * into d from public.user_daily_state where user_id=u; select * into m from public.my_membership();
 return jsonb_build_object('profile',jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_id',p.avatar_id,'avatar_gender',p.avatar_gender,'avatar_url',p.avatar_url,'avatar_revealed_at',p.avatar_revealed_at,'profile_photo_url',p.profile_photo_url,'display_image_url',coalesce(p.profile_photo_url,p.avatar_url),'native_language',p.native_language,'learning_language',p.learning_language,'level',p.level,'target_level',p.target_level,'age_group',p.age_group,'timezone',p.timezone,'region',p.region,'bio',p.bio,'discoverable',p.discoverable,'hint_language',p.hint_language,'learning_goals',p.learning_goals,'scenario_preferences',p.scenario_preferences,'interests',p.interests,'onboarding_completed',p.onboarding_completed,'theme_preference',p.theme_preference),'private',jsonb_build_object('phone',pr.phone,'contact_consent',coalesce(pr.contact_consent,false)),'partner',jsonb_build_object('target_language',pp.target_language,'preferred_level',pp.preferred_level,'conversation_goal',pp.conversation_goal,'text_enabled',pp.text_enabled,'voice_enabled',pp.voice_enabled,'topics',pp.topics,'interests',pp.interests,'availability',pp.availability,'preferred_timezone',pp.preferred_timezone,'preferred_native_language',pp.preferred_native_language,'matching_enabled',pp.matching_enabled),'membership',to_jsonb(m),'progress',jsonb_build_object('xp',coalesce(prog.xp,0),'goal',coalesce(prog.goal,'migration'),'paths',coalesce(prog.paths,'{}'::jsonb),'activity',coalesce(prog.activity,'[]'::jsonb),'days',coalesce(prog.days,'[]'::jsonb)),'daily',jsonb_build_object('study',coalesce(d.study,'{"dates":[],"dailyDone":{}}'::jsonb),'retention',coalesce(d.retention,'{"seconds":{},"sessions":0}'::jsonb)));
end $$;

create or replace function public.discover_partners_v2(p_limit integer default 24)
returns table(id uuid,display_name text,avatar_url text,native_language text,learning_language text,level text,target_level text,timezone text,bio text,learning_goals text[],interests text[],topics text[],availability text[],last_seen_at timestamptz)
language plpgsql stable security definer set search_path=public as $$ declare me uuid:=auth.uid(); my_age text; my_learning text; pref_native text; begin if me is null then raise exception 'not authenticated'; end if; select p.age_group,p.learning_language into my_age,my_learning from public.profiles p where p.id=me; select pp.preferred_native_language into pref_native from public.partner_preferences pp where pp.user_id=me; return query select p.id,p.display_name,coalesce(p.profile_photo_url,p.avatar_url),p.native_language,p.learning_language,p.level,p.target_level,p.timezone,p.bio,p.learning_goals,p.interests,coalesce(pp.topics,'{}'),coalesce(pp.availability,'{}'),p.last_seen_at from public.profiles p left join public.partner_preferences pp on pp.user_id=p.id where p.id<>me and p.discoverable=true and coalesce(pp.matching_enabled,true)=true and my_age is not null and p.age_group=my_age and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me)) order by (case when pref_native is not null and p.native_language=pref_native then 0 when my_learning is not null and p.native_language=my_learning then 1 else 2 end),p.last_seen_at desc nulls last limit greatest(1,least(coalesce(p_limit,24),50)); end $$;

revoke execute on function public.remove_profile_photo() from public,anon;
grant execute on function public.remove_profile_photo() to authenticated;
