alter table public.profiles add column if not exists avatar_assigned_at timestamptz;

update public.profiles
set avatar_assigned_at=coalesce(avatar_assigned_at,avatar_revealed_at,updated_at,created_at)
where avatar_id is not null and avatar_assigned_at is null;

insert into public.app_config(key,value)
values ('public_url','https://gisoogholizade-ux.github.io/lifelingo/')
on conflict (key) do update set value=excluded.value;

do $$
begin
  if (select count(*) from public.avatar_catalog where active=true and category='girls') <> 5 then
    raise exception 'LifeLingo girls avatar catalog must contain exactly 5 active avatars';
  end if;
  if (select count(*) from public.avatar_catalog where active=true and category='boys') <> 5 then
    raise exception 'LifeLingo boys avatar catalog must contain exactly 5 active avatars';
  end if;
end $$;

drop function if exists public.claim_random_avatar(text);
create function public.claim_random_avatar(p_gender text)
returns table(avatar_id integer,avatar_gender text,avatar_url text,avatar_assigned_at timestamptz,avatar_revealed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_gender not in ('girls','boys') then raise exception 'Invalid avatar group'; end if;
  select * into p from public.profiles where id=uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if p.avatar_id is not null then
    select * into a from public.avatar_catalog where id=p.avatar_id;
    if not found then raise exception 'Assigned avatar unavailable'; end if;
    return query select a.id,a.category,a.src,p.avatar_assigned_at,p.avatar_revealed_at;
    return;
  end if;
  select * into a from public.avatar_catalog where category=p_gender and active=true order by random() limit 1;
  if not found then raise exception 'No avatar available'; end if;
  update public.profiles
  set avatar_id=a.id,avatar_gender=a.category,avatar_url=a.src,avatar_assigned_at=now(),avatar_revealed_at=now(),updated_at=now()
  where id=uid returning * into p;
  return query select a.id,a.category,a.src,p.avatar_assigned_at,p.avatar_revealed_at;
end $$;

drop function if exists public.set_avatar_choice(integer);
create function public.set_avatar_choice(p_avatar integer)
returns table(avatar_id integer,avatar_gender text,avatar_url text)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into p from public.profiles where id=uid for update;
  if p.avatar_id is null then raise exception 'Use Avatar Surprise to assign your LifeLingo avatar'; end if;
  select * into a from public.avatar_catalog where id=p.avatar_id;
  if not found then raise exception 'Assigned avatar unavailable'; end if;
  return query select a.id,a.category,a.src;
end $$;

create or replace function public.recover_legacy_avatar(p_avatar integer)
returns table(avatar_id integer,avatar_gender text,avatar_url text,avatar_assigned_at timestamptz,avatar_revealed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into p from public.profiles where id=uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if p.avatar_id is not null then
    select * into a from public.avatar_catalog where id=p.avatar_id;
    if not found then raise exception 'Assigned avatar unavailable'; end if;
    return query select a.id,a.category,a.src,p.avatar_assigned_at,p.avatar_revealed_at;
    return;
  end if;
  select * into a from public.avatar_catalog where id=p_avatar and active=true and category in ('girls','boys');
  if not found then raise exception 'Invalid legacy avatar'; end if;
  update public.profiles
  set avatar_id=a.id,avatar_gender=a.category,avatar_url=a.src,avatar_assigned_at=now(),avatar_revealed_at=coalesce(avatar_revealed_at,now()),updated_at=now()
  where id=uid returning * into p;
  return query select a.id,a.category,a.src,p.avatar_assigned_at,p.avatar_revealed_at;
end $$;

drop function if exists public.remove_profile_photo();
create function public.remove_profile_photo()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  update public.profiles set profile_photo_url=null,updated_at=now() where id=uid returning * into p;
  if p.avatar_id is not null then select * into a from public.avatar_catalog where id=p.avatar_id; end if;
  return jsonb_build_object('profile_photo_url',null,'avatar_url',coalesce(a.src,p.avatar_url),'display_image_url',coalesce(a.src,p.avatar_url));
end $$;

create or replace function public.get_avatar_identity()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles%rowtype; a public.avatar_catalog%rowtype; pub text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into p from public.profiles where id=uid;
  if p.avatar_id is not null then select * into a from public.avatar_catalog where id=p.avatar_id; end if;
  select value into pub from public.app_config where key='public_url';
  return jsonb_build_object(
    'avatar_id',p.avatar_id,'avatar_gender',p.avatar_gender,'avatar_url',coalesce(a.src,p.avatar_url),
    'avatar_assigned_at',p.avatar_assigned_at,'avatar_revealed_at',p.avatar_revealed_at,
    'profile_photo_url',p.profile_photo_url,'display_image_url',coalesce(p.profile_photo_url,a.src,p.avatar_url),
    'public_url',coalesce(pub,'https://gisoogholizade-ux.github.io/lifelingo/')
  );
end $$;

grant execute on function public.claim_random_avatar(text) to authenticated;
grant execute on function public.set_avatar_choice(integer) to authenticated;
grant execute on function public.recover_legacy_avatar(integer) to authenticated;
grant execute on function public.remove_profile_photo() to authenticated;
grant execute on function public.get_avatar_identity() to authenticated;
revoke execute on function public.claim_random_avatar(text) from anon;
revoke execute on function public.set_avatar_choice(integer) from anon;
revoke execute on function public.recover_legacy_avatar(integer) from anon;
revoke execute on function public.remove_profile_photo() from anon;
revoke execute on function public.get_avatar_identity() from anon;
