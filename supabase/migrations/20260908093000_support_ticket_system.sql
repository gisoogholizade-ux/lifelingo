-- Integrated LifeLingo support tickets for authenticated learners and app admins.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 3 and 120),
  category text not null check (category in ('account','billing','technical','learning','partner','other')),
  status text not null default 'WAITING_FOR_ADMIN' check (status in ('OPEN','WAITING_FOR_ADMIN','WAITING_FOR_USER','RESOLVED','CLOSED')),
  priority text not null default 'NORMAL' check (priority in ('NORMAL','HIGH')),
  last_message_at timestamptz not null default now(),
  last_user_reply_at timestamptz not null default now(),
  last_admin_reply_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null check (author_role in ('USER','ADMIN')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_time_idx on public.support_tickets(user_id,last_message_at desc);
create index if not exists support_tickets_status_time_idx on public.support_tickets(status,last_message_at desc);
create index if not exists support_ticket_messages_ticket_time_idx on public.support_ticket_messages(ticket_id,created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists support_tickets_self_read on public.support_tickets;
create policy support_tickets_self_read on public.support_tickets for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists support_ticket_messages_self_read on public.support_ticket_messages;
create policy support_ticket_messages_self_read on public.support_ticket_messages for select to authenticated using (exists(select 1 from public.support_tickets t where t.id=ticket_id and t.user_id=(select auth.uid())));

revoke all on public.support_tickets from anon,authenticated;
revoke all on public.support_ticket_messages from anon,authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_ticket_messages to authenticated;

create or replace function public.create_support_ticket_v1(p_subject text,p_category text,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();tid uuid;
begin
 if u is null then raise exception 'not authenticated';end if;
 if p_category not in('account','billing','technical','learning','partner','other') then raise exception 'invalid category';end if;
 if char_length(trim(coalesce(p_subject,''))) not between 3 and 120 then raise exception 'subject must be 3 to 120 characters';end if;
 if char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'message must be 1 to 2000 characters';end if;
 if(select count(*) from public.support_tickets where user_id=u and status not in('RESOLVED','CLOSED'))>=5 then raise exception 'Please resolve an existing ticket before opening another.';end if;
 if exists(select 1 from public.support_tickets where user_id=u and created_at>now()-interval '30 seconds') then raise exception 'Please wait before creating another ticket.';end if;
 insert into public.support_tickets(user_id,subject,category)values(u,trim(p_subject),p_category)returning id into tid;
 insert into public.support_ticket_messages(ticket_id,author_id,author_role,body)values(tid,u,'USER',trim(p_body));return tid;
end $$;

create or replace function public.get_my_support_tickets_v1()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'not authenticated';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'ticketNumber',t.ticket_number,'subject',t.subject,'category',t.category,'status',t.status,'priority',t.priority,'createdAt',t.created_at,'updatedAt',t.updated_at,'lastMessageAt',t.last_message_at,'messages',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'authorRole',m.author_role,'body',m.body,'createdAt',m.created_at)order by m.created_at),'[]'::jsonb)from public.support_ticket_messages m where m.ticket_id=t.id))order by t.last_message_at desc),'[]'::jsonb)into result from public.support_tickets t where t.user_id=u;
 return result;
end $$;

create or replace function public.reply_support_ticket_v1(p_ticket_id uuid,p_body text)
returns boolean language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();ticket public.support_tickets%rowtype;
begin
 if u is null then raise exception 'not authenticated';end if;
 if char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'message must be 1 to 2000 characters';end if;
 select * into ticket from public.support_tickets where id=p_ticket_id and user_id=u for update;
 if not found then raise exception 'ticket not found';end if;if ticket.status='CLOSED'then raise exception 'This ticket is closed.';end if;
 insert into public.support_ticket_messages(ticket_id,author_id,author_role,body)values(ticket.id,u,'USER',trim(p_body));
 update public.support_tickets set status='WAITING_FOR_ADMIN',last_message_at=now(),last_user_reply_at=now(),resolved_at=null,updated_at=now()where id=ticket.id;return true;
end $$;

create or replace function public.admin_support_tickets_v1(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if not public.is_app_admin()then raise exception 'forbidden';end if;
 if p_status is not null and p_status not in('OPEN','WAITING_FOR_ADMIN','WAITING_FOR_USER','RESOLVED','CLOSED')then raise exception 'invalid status';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'ticketNumber',t.ticket_number,'subject',t.subject,'category',t.category,'status',t.status,'priority',t.priority,'createdAt',t.created_at,'lastMessageAt',t.last_message_at,'displayName',p.display_name,'email',a.email,'messageCount',(select count(*)from public.support_ticket_messages m where m.ticket_id=t.id))order by case when t.status='WAITING_FOR_ADMIN'then 0 else 1 end,t.last_message_at desc),'[]'::jsonb)into result from public.support_tickets t join public.profiles p on p.id=t.user_id join auth.users a on a.id=t.user_id where p_status is null or t.status=p_status;
 return result;
end $$;

create or replace function public.admin_support_ticket_detail_v1(p_ticket_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if not public.is_app_admin()then raise exception 'forbidden';end if;
 select jsonb_build_object('id',t.id,'ticketNumber',t.ticket_number,'subject',t.subject,'category',t.category,'status',t.status,'priority',t.priority,'createdAt',t.created_at,'lastMessageAt',t.last_message_at,'displayName',p.display_name,'email',a.email,'messages',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'authorRole',m.author_role,'body',m.body,'createdAt',m.created_at)order by m.created_at),'[]'::jsonb)from public.support_ticket_messages m where m.ticket_id=t.id))into result from public.support_tickets t join public.profiles p on p.id=t.user_id join auth.users a on a.id=t.user_id where t.id=p_ticket_id;
 if result is null then raise exception 'ticket not found';end if;return result;
end $$;

create or replace function public.admin_reply_support_ticket_v1(p_ticket_id uuid,p_body text)
returns boolean language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();ticket public.support_tickets%rowtype;
begin
 if not public.is_app_admin()then raise exception 'forbidden';end if;
 if char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'message must be 1 to 2000 characters';end if;
 select * into ticket from public.support_tickets where id=p_ticket_id for update;if not found then raise exception 'ticket not found';end if;
 insert into public.support_ticket_messages(ticket_id,author_id,author_role,body)values(ticket.id,u,'ADMIN',trim(p_body));
 update public.support_tickets set status='WAITING_FOR_USER',last_message_at=now(),last_admin_reply_at=now(),resolved_at=null,updated_at=now()where id=ticket.id;return true;
end $$;

create or replace function public.admin_set_support_ticket_status_v1(p_ticket_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.is_app_admin()then raise exception 'forbidden';end if;
 if p_status not in('OPEN','WAITING_FOR_ADMIN','WAITING_FOR_USER','RESOLVED','CLOSED')then raise exception 'invalid status';end if;
 update public.support_tickets set status=p_status,resolved_at=case when p_status in('RESOLVED','CLOSED')then now()else null end,updated_at=now()where id=p_ticket_id;return found;
end $$;

do $$declare r record;begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('create_support_ticket_v1','get_my_support_tickets_v1','reply_support_ticket_v1','admin_support_tickets_v1','admin_support_ticket_detail_v1','admin_reply_support_ticket_v1','admin_set_support_ticket_status_v1')loop execute format('revoke execute on function %s from public, anon',r.signature);end loop;end $$;
grant execute on function public.create_support_ticket_v1(text,text,text)to authenticated;
grant execute on function public.get_my_support_tickets_v1()to authenticated;
grant execute on function public.reply_support_ticket_v1(uuid,text)to authenticated;
grant execute on function public.admin_support_tickets_v1(text)to authenticated;
grant execute on function public.admin_support_ticket_detail_v1(uuid)to authenticated;
grant execute on function public.admin_reply_support_ticket_v1(uuid,text)to authenticated;
grant execute on function public.admin_set_support_ticket_status_v1(uuid,text)to authenticated;
