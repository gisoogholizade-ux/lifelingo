revoke execute on function public.claim_random_avatar(text) from public,anon;
revoke execute on function public.set_avatar_choice(integer) from public,anon;
revoke execute on function public.recover_legacy_avatar(integer) from public,anon;
revoke execute on function public.remove_profile_photo() from public,anon;
revoke execute on function public.get_avatar_identity() from public,anon;

grant execute on function public.claim_random_avatar(text) to authenticated;
grant execute on function public.set_avatar_choice(integer) to authenticated;
grant execute on function public.recover_legacy_avatar(integer) to authenticated;
grant execute on function public.remove_profile_photo() to authenticated;
grant execute on function public.get_avatar_identity() to authenticated;
