-- Frontend stabilization: expose persisted age preference and make saved matching settings affect discovery ranking.
create or replace function public.get_unified_profile()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
  'profile',jsonb_build_object('id',p.id,'display_name',p.display_name,'avatar_id',p.avatar_id,'avatar_gender',p.avatar_gender,'avatar_url',p.avatar_url,'avatar_revealed_at',p.avatar_revealed_at,'profile_photo_url',p.profile_photo_url,'display_image_url',coalesce(p.profile_photo_url,p.avatar_url),'native_language',p.native_language,'learning_language',p.learning_language,'level',p.level,'target_level',p.target_level,'age_group',p.age_group,'timezone',p.timezone,'region',p.region,'bio',p.bio,'discoverable',p.discoverable,'hint_language',p.hint_language,'learning_goals',p.learning_goals,'scenario_preferences',p.scenario_preferences,'interests',p.interests,'onboarding_completed',p.onboarding_completed,'theme_preference',p.theme_preference,'preferred_language',p.preferred_language),
  'private',jsonb_build_object('phone',pr.phone,'contact_consent',coalesce(pr.contact_consent,false)),
  'partner',jsonb_build_object('target_language',pp.target_language,'preferred_level',pp.preferred_level,'conversation_goal',pp.conversation_goal,'text_enabled',pp.text_enabled,'voice_enabled',pp.voice_enabled,'topics',pp.topics,'interests',pp.interests,'availability',pp.availability,'preferred_timezone',pp.preferred_timezone,'preferred_native_language',pp.preferred_native_language,'preferred_age_group',pp.preferred_age_group,'matching_enabled',pp.matching_enabled),
  'membership',to_jsonb(m),
  'progress',jsonb_build_object('xp',coalesce(prog.xp,0),'goal',coalesce(prog.goal,'migration'),'paths',coalesce(prog.paths,'{}'::jsonb),'activity',coalesce(prog.activity,'[]'::jsonb),'days',coalesce(prog.days,'[]'::jsonb)),
  'daily',jsonb_build_object('study',coalesce(d.study,'{"dates":[],"dailyDone":{}}'::jsonb),'retention',coalesce(d.retention,'{"seconds":{},"sessions":0}'::jsonb))
 );
end $function$;

create or replace function public.discover_partners_v2(p_limit integer default 24)
returns table(id uuid, display_name text, avatar_url text, native_language text, learning_language text, level text, target_level text, timezone text, bio text, learning_goals text[], interests text[], topics text[], availability text[], last_seen_at timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
 me uuid:=auth.uid();
 my_age text; my_learning text;
 pref public.partner_preferences%rowtype;
begin
 if me is null then raise exception 'not authenticated'; end if;
 select p.age_group,p.learning_language into my_age,my_learning from public.profiles p where p.id=me;
 select * into pref from public.partner_preferences where user_id=me;
 return query
 select p.id,p.display_name,coalesce(p.profile_photo_url,p.avatar_url),p.native_language,p.learning_language,p.level,p.target_level,p.timezone,p.bio,p.learning_goals,p.interests,coalesce(pp.topics,'{}'),coalesce(pp.availability,'{}'),p.last_seen_at
 from public.profiles p
 left join public.partner_preferences pp on pp.user_id=p.id
 where p.id<>me
   and p.discoverable=true
   and coalesce(pp.matching_enabled,true)=true
   and my_age is not null
   and p.age_group=my_age
   and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me))
 order by
   (case when pref.preferred_native_language is not null and p.native_language=pref.preferred_native_language then 0 when my_learning is not null and p.native_language=my_learning then 1 else 2 end)
   + (case when pref.preferred_level is not null and p.level=pref.preferred_level then 0 else 1 end)
   + (case when pref.preferred_timezone is not null and p.timezone=pref.preferred_timezone then 0 else 1 end)
   + (case when coalesce(array_length(pref.interests,1),0)>0 and coalesce(array_length(p.interests,1),0)>0 and pref.interests && p.interests then 0 else 1 end)
   + (case when coalesce(array_length(pref.topics,1),0)>0 and coalesce(array_length(pp.topics,1),0)>0 and pref.topics && pp.topics then 0 else 1 end)
   + (case when coalesce(array_length(pref.availability,1),0)>0 and coalesce(array_length(pp.availability,1),0)>0 and pref.availability && pp.availability then 0 else 1 end),
   p.last_seen_at desc nulls last
 limit greatest(1,least(coalesce(p_limit,24),50));
end $function$;
