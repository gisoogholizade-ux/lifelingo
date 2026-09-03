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
revoke all on function public.discover_partners_v2(integer) from anon;
grant execute on function public.discover_partners_v2(integer) to authenticated;
