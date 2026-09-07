-- set_preferred_language is SECURITY INVOKER. Grant only the three columns it
-- updates; the existing profiles_update_self RLS policy still enforces auth.uid().
grant update (preferred_language, updated_at, last_seen_at)
on table public.profiles
to authenticated;
