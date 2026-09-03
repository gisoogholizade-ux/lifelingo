-- Prevent direct legacy mission URLs from bypassing Pro chapter entitlement.
-- Free mapped missions remain usable; existing progress is preserved.
create or replace function public.complete_mission(p_path text,p_mission integer,p_score integer default 100)
returns public.user_progress language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); r public.user_progress; old_paths jsonb; path_obj jsonb; mission_key text:=p_mission::text; was_done boolean:=false; today_text text:=to_char(current_date,'YYYY-MM-DD'); mapped_unit text; mapped_free boolean; pro_ok boolean:=false;
begin
 if u is null then raise exception 'not authenticated'; end if;
 if p_path not in('migration','career','travel') or p_mission<0 or p_mission>20 then raise exception 'invalid mission'; end if;
 select cu.id,ch.is_free into mapped_unit,mapped_free from public.course_units cu join public.course_chapters ch on ch.id=cu.chapter_id where cu.kind='conversation' and cu.active=true and cu.content->>'legacy_path'=p_path and coalesce((cu.content->>'legacy_mission')::integer,-1)=p_mission order by cu.unit_order limit 1;
 if mapped_unit is not null and not coalesce(mapped_free,false) then select coalesce(e.is_pro,false) into pro_ok from public.my_entitlements() e; if not pro_ok then raise exception 'pro required'; end if; end if;
 insert into public.user_progress(user_id,xp,goal,paths,activity,days,updated_at) values(u,0,'migration','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,now()) on conflict(user_id) do nothing;
 select paths into old_paths from public.user_progress where user_id=u for update;
 path_obj:=coalesce(old_paths->p_path,'{}'::jsonb); was_done:=coalesce((path_obj->mission_key->>'completed')::boolean,false);
 path_obj:=jsonb_set(path_obj,array[mission_key],jsonb_build_object('completed',true,'best',greatest(coalesce((path_obj->mission_key->>'best')::integer,0),greatest(0,least(100,p_score)))),true); old_paths:=jsonb_set(coalesce(old_paths,'{}'::jsonb),array[p_path],path_obj,true);
 update public.user_progress set paths=old_paths,xp=xp+case when was_done then 0 else 80 end,activity=coalesce(activity,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('path',p_path,'mission',p_mission,'score',greatest(0,least(100,p_score)),'date',today_text)),days=(select coalesce(jsonb_agg(distinct x),'[]'::jsonb) from jsonb_array_elements(coalesce(days,'[]'::jsonb)||jsonb_build_array(today_text))x),updated_at=now() where user_id=u returning * into r;
 if mapped_unit is not null and public.can_access_lesson(mapped_unit) then perform public.complete_course_unit(mapped_unit,p_score); end if;
 return r;
end $$;
revoke execute on function public.complete_mission(text,integer,integer) from public,anon;
grant execute on function public.complete_mission(text,integer,integer) to authenticated;