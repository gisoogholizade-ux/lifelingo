create or replace function public.my_conversation_inbox()
returns table(conversation_id uuid,partner_id uuid,partner_name text,partner_avatar_url text,latest_kind text,latest_body text,latest_created_at timestamptz,latest_sender_id uuid,latest_read_at timestamptz,unread_count bigint)
language sql stable security definer set search_path=public as $$
with mine as (select cm.conversation_id from public.conversation_members cm where cm.user_id=auth.uid()),
partner as (select m.conversation_id,cm.user_id partner_id from mine m join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id<>auth.uid()),
last_msg as (select distinct on(msg.conversation_id) msg.conversation_id,msg.kind,msg.body,msg.created_at,msg.sender_id,msg.read_at from public.messages msg join mine m on m.conversation_id=msg.conversation_id order by msg.conversation_id,msg.created_at desc),
unread as (select msg.conversation_id,count(*)::bigint unread_count from public.messages msg join mine m on m.conversation_id=msg.conversation_id where msg.sender_id<>auth.uid() and msg.read_at is null group by msg.conversation_id)
select p.conversation_id,p.partner_id,pr.display_name,coalesce(pr.profile_photo_url,pr.avatar_url),lm.kind,lm.body,lm.created_at,lm.sender_id,lm.read_at,coalesce(u.unread_count,0)
from partner p join public.profiles pr on pr.id=p.partner_id left join last_msg lm on lm.conversation_id=p.conversation_id left join unread u on u.conversation_id=p.conversation_id order by lm.created_at desc nulls last;
$$;
