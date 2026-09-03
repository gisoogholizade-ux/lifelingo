alter table public.partner_preferences drop constraint if exists partner_preferences_conversation_goal_check;
alter table public.partner_preferences add constraint partner_preferences_conversation_goal_check check (conversation_goal = any (array['general'::text,'speaking'::text,'work'::text,'travel'::text,'study'::text,'daily'::text,'career'::text,'moving_abroad'::text]));

alter table public.partner_preferences add column if not exists preferred_age_group text;
alter table public.partner_preferences drop constraint if exists partner_preferences_preferred_age_group_check;
alter table public.partner_preferences add constraint partner_preferences_preferred_age_group_check check (preferred_age_group is null or preferred_age_group = any (array['13-15'::text,'16-17'::text,'18+'::text]));

update public.partner_preferences pp
set preferred_age_group = p.age_group
from public.profiles p
where p.id = pp.user_id
  and p.age_group is not null
  and pp.preferred_age_group is distinct from p.age_group;

create or replace function public.update_partner_preferences_v2(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare u uuid:=auth.uid(); t text[]; i text[]; a text[]; my_age text;
begin
 if u is null then raise exception 'not authenticated'; end if;
 select p.age_group into my_age from public.profiles p where p.id=u;
 t:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'topics','[]'::jsonb))), '{}');
 i:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'interests','[]'::jsonb))), '{}');
 a:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'availability','[]'::jsonb))), '{}');
 insert into public.partner_preferences(user_id,target_language,preferred_level,conversation_goal,text_enabled,voice_enabled,topics,interests,availability,preferred_timezone,preferred_native_language,matching_enabled,preferred_age_group,updated_at)
 values(u,coalesce(nullif(p_payload->>'target_language',''),'en'),nullif(p_payload->>'preferred_level',''),coalesce(nullif(p_payload->>'conversation_goal',''),'general'),coalesce((p_payload->>'text_enabled')::boolean,true),coalesce((p_payload->>'voice_enabled')::boolean,true),t,i,a,nullif(p_payload->>'preferred_timezone',''),nullif(p_payload->>'preferred_native_language',''),coalesce((p_payload->>'matching_enabled')::boolean,true),my_age,now())
 on conflict(user_id) do update set target_language=excluded.target_language,preferred_level=excluded.preferred_level,conversation_goal=excluded.conversation_goal,text_enabled=excluded.text_enabled,voice_enabled=excluded.voice_enabled,topics=excluded.topics,interests=excluded.interests,availability=excluded.availability,preferred_timezone=excluded.preferred_timezone,preferred_native_language=excluded.preferred_native_language,matching_enabled=excluded.matching_enabled,preferred_age_group=excluded.preferred_age_group,updated_at=now();
 return (select jsonb_build_object('target_language',target_language,'preferred_level',preferred_level,'conversation_goal',conversation_goal,'text_enabled',text_enabled,'voice_enabled',voice_enabled,'topics',topics,'interests',interests,'availability',availability,'preferred_timezone',preferred_timezone,'preferred_native_language',preferred_native_language,'matching_enabled',matching_enabled,'preferred_age_group',preferred_age_group) from public.partner_preferences where user_id=u);
end
$function$;

create or replace function public.discover_partners_v2(p_limit integer default 24)
returns table(id uuid, display_name text, avatar_url text, native_language text, learning_language text, level text, target_level text, timezone text, bio text, learning_goals text[], interests text[], topics text[], availability text[], last_seen_at timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare me uuid:=auth.uid(); my_age text; my_learning text; pref_native text;
begin
 if me is null then raise exception 'not authenticated'; end if;
 select p.age_group,p.learning_language into my_age,my_learning from public.profiles p where p.id=me;
 select pp.preferred_native_language into pref_native from public.partner_preferences pp where pp.user_id=me;
 return query select p.id,p.display_name,coalesce(p.profile_photo_url,p.avatar_url),p.native_language,p.learning_language,p.level,p.target_level,p.timezone,p.bio,p.learning_goals,p.interests,coalesce(pp.topics,'{}'),coalesce(pp.availability,'{}'),p.last_seen_at from public.profiles p left join public.partner_preferences pp on pp.user_id=p.id where p.id<>me and p.discoverable=true and coalesce(pp.matching_enabled,true)=true and my_age is not null and p.age_group=my_age and not exists(select 1 from public.blocks b where (b.blocker_id=me and b.blocked_id=p.id) or (b.blocker_id=p.id and b.blocked_id=me)) order by (case when pref_native is not null and p.native_language=pref_native then 0 when my_learning is not null and p.native_language=my_learning then 1 else 2 end),p.last_seen_at desc nulls last limit greatest(1,least(coalesce(p_limit,24),50));
end
$function$;

revoke all on function public.update_partner_preferences_v2(jsonb) from anon;
grant execute on function public.update_partner_preferences_v2(jsonb) to authenticated;
revoke all on function public.discover_partners_v2(integer) from anon;
grant execute on function public.discover_partners_v2(integer) to authenticated;
