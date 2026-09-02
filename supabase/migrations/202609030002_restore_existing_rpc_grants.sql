-- Preserve existing authenticated LifeLingo RPCs after revoking anonymous SECURITY DEFINER execution.
-- Admin RPCs still perform is_app_admin() checks internally.

grant execute on function public.admin_activate_pro(uuid,integer,text) to authenticated;
grant execute on function public.admin_set_request_status(bigint,text) to authenticated;
grant execute on function public.admin_upgrade_requests() to authenticated;
grant execute on function public.admin_upgrade_requests_v2() to authenticated;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.admin_users_v2(text) to authenticated;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_reject_upgrade_request(bigint) to authenticated;
grant execute on function public.claim_first_admin(text) to authenticated;
grant execute on function public.claim_random_avatar(text) to authenticated;
grant execute on function public.complete_course_unit(text,integer) to authenticated;
grant execute on function public.complete_mission(text,integer,integer) to authenticated;
grant execute on function public.current_age_group() to authenticated;
grant execute on function public.can_discover_profile(uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid,uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversation_inbox() to authenticated;
grant execute on function public.my_daily_state() to authenticated;
grant execute on function public.save_daily_state(jsonb,jsonb) to authenticated;
grant execute on function public.set_profile_photo(text) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
grant execute on function public.use_lifelingo_avatar() to authenticated;
grant execute on function public.my_membership() to authenticated;
grant execute on function public.my_entitlements() to authenticated;
grant execute on function public.can_access_chapter(text) to authenticated;
grant execute on function public.can_access_lesson(text) to authenticated;
grant execute on function public.get_learning_home() to authenticated;
grant execute on function public.get_lesson(text) to authenticated;
grant execute on function public.get_review_queue(integer) to authenticated;
grant execute on function public.record_review_result(text,text,boolean) to authenticated;
grant execute on function public.request_upgrade(text,text) to authenticated;