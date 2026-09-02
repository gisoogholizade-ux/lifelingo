-- LifeLingo production learning MVP
-- Safe/idempotent migration matching the deployed Supabase schema.

alter table public.course_units drop constraint if exists course_units_course_id_unit_order_key;

create table if not exists public.course_chapters (
  id text primary key,
  course_id text not null references public.course_catalog(id) on delete cascade,
  position integer not null,
  title text not null,
  subtitle text,
  is_free boolean not null default false,
  theme text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(course_id, position)
);

alter table public.course_units add column if not exists chapter_id text references public.course_chapters(id) on delete cascade;
alter table public.course_units add column if not exists required boolean not null default true;
alter table public.course_units add column if not exists active boolean not null default true;
create unique index if not exists uq_course_units_chapter_order on public.course_units(chapter_id,unit_order) where chapter_id is not null;
create index if not exists idx_course_units_chapter_order on public.course_units(chapter_id,unit_order);

create table if not exists public.user_chapter_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id text not null references public.course_chapters(id) on delete cascade,
  status text not null default 'started' check (status in ('started','completed')),
  completed_units integer not null default 0,
  total_units integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,chapter_id)
);

create table if not exists public.user_review_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id text not null references public.course_units(id) on delete cascade,
  item_key text not null,
  kind text not null,
  prompt text not null,
  answer text not null,
  strength integer not null default 0 check (strength between 0 and 5),
  mistake_count integer not null default 0,
  last_seen_at timestamptz,
  due_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,unit_id,item_key)
);
create index if not exists idx_review_due on public.user_review_items(user_id,due_at);

alter table public.course_chapters enable row level security;
alter table public.user_chapter_progress enable row level security;
alter table public.user_review_items enable row level security;
drop policy if exists chapter_public_read on public.course_chapters;
create policy chapter_public_read on public.course_chapters for select using(active=true);
drop policy if exists chapter_progress_self_read on public.user_chapter_progress;
create policy chapter_progress_self_read on public.user_chapter_progress for select using(user_id=auth.uid());
drop policy if exists review_self_read on public.user_review_items;
create policy review_self_read on public.user_review_items for select using(user_id=auth.uid());
grant select on public.course_chapters to anon,authenticated;
grant select on public.user_chapter_progress to authenticated;
grant select on public.user_review_items to authenticated;

insert into public.course_catalog(id,title,subtitle,category,position,accent,active)
values('english-life-abroad','English for Life Abroad','Build the language, then use it in real situations.','conversation',1,'sunset',true)
on conflict(id) do update set title=excluded.title,subtitle=excluded.subtitle,position=excluded.position,accent=excluded.accent,active=true;
update public.course_catalog set active=false where id in('words-foundation','grammar-foundation','real-life-conversations');

insert into public.course_chapters(id,course_id,position,title,subtitle,is_free,theme,active) values
('life-abroad-c1','english-life-abroad',1,'Your First Day','Airport, arrival and getting oriented',true,'arrival',true),
('life-abroad-c2','english-life-abroad',2,'Your First Week Abroad','SIM card, transport and everyday errands',false,'first-week',true),
('life-abroad-c3','english-life-abroad',3,'Finding a Home','Renting, viewing and asking the right questions',false,'home',true),
('life-abroad-c4','english-life-abroad',4,'Banking & Money','Accounts, cards and common money problems',false,'money',true),
('life-abroad-c5','english-life-abroad',5,'Doctor & Pharmacy','Describe symptoms and understand instructions',false,'health',true)
on conflict(id) do update set title=excluded.title,subtitle=excluded.subtitle,is_free=excluded.is_free,theme=excluded.theme,active=true;

insert into public.course_units(id,course_id,chapter_id,unit_order,title,kind,is_free,xp,required,active,content) values
('c1-wordlab','english-life-abroad','life-abroad-c1',1,'Arrival Word Lab','word_lab',true,35,true,true,'{"title":"Arrival essentials","words":[{"word":"arrival","meaning":"the act of reaching a place","example":"Follow the signs to Arrivals.","context":"airport"},{"word":"passport","meaning":"an official travel document","example":"May I see your passport?","context":"border"},{"word":"purpose","meaning":"the reason for doing something","example":"What is the purpose of your visit?","context":"border"},{"word":"luggage","meaning":"bags and suitcases used for travel","example":"My luggage is on the carousel.","context":"airport"}],"stages":["discover","hear","recognize","spell","context","recall"],"review":[{"key":"arrival","kind":"vocabulary","prompt":"What does arrival mean?","answer":"the act of reaching a place"},{"key":"purpose","kind":"vocabulary","prompt":"Complete: What is the ___ of your visit?","answer":"purpose"},{"key":"luggage","kind":"vocabulary","prompt":"Which word means bags used for travel?","answer":"luggage"}]}'::jsonb),
('c1-pronunciation','english-life-abroad','life-abroad-c1',2,'Say It Clearly','pronunciation',true,25,true,true,'{"items":[{"text":"passport","hint":"Stress the first syllable: PASS-port"},{"text":"I am here to study.","hint":"Keep the sentence smooth and connected."},{"text":"Could you say that again?","hint":"Use a polite rising tone at the end."}],"ai_status":"future","review":[{"key":"say-again","kind":"pronunciation","prompt":"Which polite sentence asks someone to repeat?","answer":"Could you say that again?"}]}'::jsonb),
('c1-listening','english-life-abroad','life-abroad-c1',3,'Listen at Passport Control','listening',true,30,true,true,'{"clips":[{"text":"What is the purpose of your visit?","question":"What is the officer asking about?","options":["Your reason for visiting","Your luggage color","Your phone number"],"answer":0},{"text":"How long are you staying?","question":"What information is needed?","options":["Length of stay","Home address","Flight number"],"answer":0},{"text":"Where will you be staying?","question":"What should you give?","options":["Your accommodation address","Your job title","Your passport number"],"answer":0}],"review":[{"key":"purpose-question","kind":"listening","prompt":"What is the purpose of your visit? asks for your...","answer":"reason for visiting"}]}'::jsonb),
('c1-grammar','english-life-abroad','life-abroad-c1',4,'Present Simple for Arrival','grammar',true,35,true,true,'{"explanation":"Use the present simple for facts, plans and short answers at arrival.","example":"I study computer science. I stay with my family.","activities":[{"type":"choice","prompt":"Choose the natural answer: What do you do?","options":["I study IT.","I am study IT.","I studying IT."],"answer":0},{"type":"fill","prompt":"Complete: I ___ with my aunt this week.","answer":"stay"},{"type":"reorder","prompt":"Put in order","tokens":["am","I","here","to","study"],"answer":"I am here to study"}],"review":[{"key":"present-fact","kind":"grammar","prompt":"Choose the correct sentence: I study IT / I studying IT","answer":"I study IT"}]}'::jsonb),
('c1-reading','english-life-abroad','life-abroad-c1',5,'Read the Arrival Card','reading',true,30,true,true,'{"format":"form","title":"Arrival Information","text":"Name: Alex Morgan\nPurpose of visit: Study\nLength of stay: 9 months\nAddress: 42 River Street","questions":[{"prompt":"Why is Alex visiting?","options":["Study","Tourism","Work"],"answer":0},{"prompt":"How long will Alex stay?","options":["9 days","9 months","9 years"],"answer":1}],"review":[{"key":"arrival-card","kind":"reading","prompt":"On an arrival form, purpose of visit means...","answer":"reason for visiting"}]}'::jsonb),
('c1-writing','english-life-abroad','life-abroad-c1',6,'Write Your Arrival Reply','writing',true,35,true,true,'{"prompt":"Write 1–2 sentences answering: Why are you here and where are you staying?","min_words":6,"required_any":["study","visit","work","stay","staying"],"example":"I am here to study. I am staying with my aunt.","review":[{"key":"arrival-writing","kind":"writing","prompt":"Write a short answer for why you are here.","answer":"I am here to study."}]}'::jsonb),
('c1-conversation','english-life-abroad','life-abroad-c1',7,'Passport Control Mission','conversation',true,80,true,true,'{"legacy_path":"migration","legacy_mission":0,"objective":"Use the words and grammar from this chapter in the original LifeLingo conversation mission."}'::jsonb),
('c1-challenge','english-life-abroad','life-abroad-c1',8,'First Day Final Challenge','challenge',true,100,true,true,'{"intro":"Handle three parts of your arrival without hints.","tasks":[{"type":"choice","prompt":"Officer: What is the purpose of your visit?","options":["I am here to study.","Blue suitcase.","At 7 PM."],"answer":0},{"type":"fill","prompt":"Complete: I am ___ with my aunt.","answer":"staying"},{"type":"short","prompt":"Write a polite sentence asking the officer to repeat.","accepted":["could you say that again","can you say that again","could you repeat that"]}],"skills":["Vocabulary","Listening","Grammar","Writing","Conversation"]}'::jsonb),
('c1-review','english-life-abroad','life-abroad-c1',9,'Chapter 1 Review','review',true,25,false,true,'{"description":"Refresh the words and patterns from Your First Day."}'::jsonb),
('c2-wordlab','english-life-abroad','life-abroad-c2',1,'Everyday Errands Word Lab','word_lab',false,40,true,true,'{"title":"First-week essentials","words":[{"word":"top up","meaning":"add credit to a phone or card","example":"I need to top up my SIM card."},{"word":"receipt","meaning":"proof of payment","example":"Can I have the receipt, please?"}]}'::jsonb),
('c2-conversation','english-life-abroad','life-abroad-c2',2,'Buy a SIM Card Mission','conversation',false,90,true,true,'{"legacy_path":"migration","legacy_mission":1,"objective":"Buy a SIM card and ask about data."}'::jsonb),
('c3-conversation','english-life-abroad','life-abroad-c3',1,'Apartment Viewing Mission','conversation',false,90,true,true,'{"legacy_path":"travel","legacy_mission":1,"objective":"Ask practical questions about a home."}'::jsonb),
('c4-conversation','english-life-abroad','life-abroad-c4',1,'Bank Account Mission','conversation',false,90,true,true,'{"legacy_path":"career","legacy_mission":1,"objective":"Open an account and clarify fees."}'::jsonb),
('c5-conversation','english-life-abroad','life-abroad-c5',1,'Doctor & Pharmacy Mission','conversation',false,90,true,true,'{"legacy_path":"travel","legacy_mission":2,"objective":"Describe a health need and understand instructions."}'::jsonb)
on conflict(id) do update set course_id=excluded.course_id,chapter_id=excluded.chapter_id,unit_order=excluded.unit_order,title=excluded.title,kind=excluded.kind,is_free=excluded.is_free,xp=excluded.xp,required=excluded.required,active=excluded.active,content=excluded.content;

create or replace function public.my_entitlements()
returns table(plan text,status text,expires_at timestamptz,is_pro boolean,review_limit integer,partner_limit integer)
language sql stable security definer set search_path=public as $$
select m.plan,case when m.plan='pro' and m.expires_at is not null and m.expires_at<=now() then 'expired' else m.status end,m.expires_at,(m.plan='pro' and m.status='active' and (m.expires_at is null or m.expires_at>now())),case when (m.plan='pro' and m.status='active' and (m.expires_at is null or m.expires_at>now())) then 100 else 5 end,case when (m.plan='pro' and m.status='active' and (m.expires_at is null or m.expires_at>now())) then 10 else 1 end from public.memberships m where m.user_id=auth.uid();
$$;

create or replace function public.can_access_chapter(p_chapter text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare ch public.course_chapters%rowtype; pro_ok boolean:=false;
begin
 if auth.uid() is null then return false; end if;
 select * into ch from public.course_chapters where id=p_chapter and active=true;
 if not found then return false; end if;
 select coalesce(e.is_pro,false) into pro_ok from public.my_entitlements() e;
 if not ch.is_free and not pro_ok then return false; end if;
 return not exists(select 1 from public.course_chapters prev where prev.course_id=ch.course_id and prev.active=true and prev.position<ch.position and not exists(select 1 from public.user_chapter_progress cp where cp.user_id=auth.uid() and cp.chapter_id=prev.id and cp.status='completed'));
end $$;

create or replace function public.can_access_lesson(p_unit text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare u public.course_units%rowtype;
begin
 if auth.uid() is null then return false; end if;
 select * into u from public.course_units where id=p_unit and active=true;
 if not found or u.chapter_id is null or not public.can_access_chapter(u.chapter_id) then return false; end if;
 return not exists(select 1 from public.course_units prev where prev.chapter_id=u.chapter_id and prev.active=true and prev.unit_order<u.unit_order and prev.required=true and not exists(select 1 from public.user_learning_progress p where p.user_id=auth.uid() and p.unit_id=prev.id and p.status='completed'));
end $$;

create or replace function public.get_lesson(p_unit text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare u public.course_units%rowtype; ch public.course_chapters%rowtype;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select * into u from public.course_units where id=p_unit and active=true;
 if not found then raise exception 'lesson not found'; end if;
 if not public.can_access_lesson(p_unit) then raise exception 'lesson locked'; end if;
 select * into ch from public.course_chapters where id=u.chapter_id;
 return jsonb_build_object('id',u.id,'title',u.title,'kind',u.kind,'xp',u.xp,'chapter_id',u.chapter_id,'chapter_title',ch.title,'content',u.content);
end $$;

create or replace function public.get_learning_home()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ent record; result jsonb;
begin
 if uid is null then raise exception 'not authenticated'; end if;
 select * into ent from public.my_entitlements();
 select jsonb_build_object('membership',jsonb_build_object('plan',coalesce(ent.plan,'free'),'status',coalesce(ent.status,'active'),'expires_at',ent.expires_at,'is_pro',coalesce(ent.is_pro,false),'review_limit',coalesce(ent.review_limit,5),'partner_limit',coalesce(ent.partner_limit,1)),'xp',coalesce((select xp from public.user_progress where user_id=uid),0),'courses',coalesce((select jsonb_agg(course_obj order by pos) from(select c.position pos,jsonb_build_object('id',c.id,'title',c.title,'subtitle',c.subtitle,'accent',c.accent,'category',c.category,'chapters',coalesce((select jsonb_agg(ch_obj order by ch_pos) from(select ch.position ch_pos,jsonb_build_object('id',ch.id,'position',ch.position,'title',ch.title,'subtitle',ch.subtitle,'theme',ch.theme,'is_free',ch.is_free,'accessible',public.can_access_chapter(ch.id),'plan_locked',(not ch.is_free and not coalesce(ent.is_pro,false)),'completed',exists(select 1 from public.user_chapter_progress cp where cp.user_id=uid and cp.chapter_id=ch.id and cp.status='completed'),'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'position',u.unit_order,'title',u.title,'kind',u.kind,'xp',u.xp,'required',u.required,'completed',exists(select 1 from public.user_learning_progress p where p.user_id=uid and p.unit_id=u.id and p.status='completed'),'unlocked',(public.can_access_chapter(ch.id) and not exists(select 1 from public.course_units prev where prev.chapter_id=ch.id and prev.active=true and prev.unit_order<u.unit_order and prev.required=true and not exists(select 1 from public.user_learning_progress pp where pp.user_id=uid and pp.unit_id=prev.id and pp.status='completed'))),'premium',(not ch.is_free and not coalesce(ent.is_pro,false))) order by u.unit_order) from public.course_units u where u.chapter_id=ch.id and u.active=true),'[]'::jsonb)) ch_obj from public.course_chapters ch where ch.course_id=c.id and ch.active=true)x),'[]'::jsonb)) course_obj from public.course_catalog c where c.active=true)q),'[]'::jsonb)) into result;
 return result;
end $$;

create or replace function public.complete_course_unit(p_unit text,p_score integer default 100)
returns public.user_learning_progress language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); u public.course_units%rowtype; outrow public.user_learning_progress%rowtype; first_done boolean; req_total int; req_done int; rv jsonb;
begin
 if uid is null then raise exception 'not authenticated'; end if;
 select * into u from public.course_units where id=p_unit and active=true;
 if not found then raise exception 'lesson not found'; end if;
 if not public.can_access_lesson(p_unit) then raise exception 'lesson locked'; end if;
 select not exists(select 1 from public.user_learning_progress where user_id=uid and unit_id=p_unit and status='completed') into first_done;
 insert into public.user_learning_progress(user_id,unit_id,status,score,completed_at,updated_at) values(uid,p_unit,'completed',greatest(0,least(coalesce(p_score,100),100)),now(),now()) on conflict(user_id,unit_id) do update set status='completed',score=greatest(public.user_learning_progress.score,excluded.score),completed_at=coalesce(public.user_learning_progress.completed_at,now()),updated_at=now() returning * into outrow;
 if first_done then
  insert into public.user_progress(user_id,xp) values(uid,case when u.kind='conversation' then 0 else u.xp end) on conflict(user_id) do update set xp=public.user_progress.xp+excluded.xp,updated_at=now();
  for rv in select value from jsonb_array_elements(coalesce(u.content->'review','[]'::jsonb)) loop insert into public.user_review_items(user_id,unit_id,item_key,kind,prompt,answer,due_at) values(uid,u.id,coalesce(rv->>'key',md5(rv::text)),coalesce(rv->>'kind',u.kind),coalesce(rv->>'prompt','Review'),coalesce(rv->>'answer',''),now()) on conflict(user_id,unit_id,item_key) do nothing; end loop;
 end if;
 select count(*) into req_total from public.course_units x where x.chapter_id=u.chapter_id and x.active=true and x.required=true and x.kind<>'review';
 select count(*) into req_done from public.course_units x where x.chapter_id=u.chapter_id and x.active=true and x.required=true and x.kind<>'review' and exists(select 1 from public.user_learning_progress p where p.user_id=uid and p.unit_id=x.id and p.status='completed');
 insert into public.user_chapter_progress(user_id,chapter_id,status,completed_units,total_units,completed_at,updated_at) values(uid,u.chapter_id,case when req_total>0 and req_done>=req_total then 'completed' else 'started' end,req_done,req_total,case when req_total>0 and req_done>=req_total then now() else null end,now()) on conflict(user_id,chapter_id) do update set status=excluded.status,completed_units=excluded.completed_units,total_units=excluded.total_units,completed_at=coalesce(public.user_chapter_progress.completed_at,excluded.completed_at),updated_at=now();
 return outrow;
end $$;

create or replace function public.get_review_queue(p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare lim int; ispro boolean;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select e.is_pro into ispro from public.my_entitlements() e;
 lim:=least(greatest(coalesce(p_limit,20),1),case when coalesce(ispro,false) then 100 else 5 end);
 return coalesce((select jsonb_agg(jsonb_build_object('unit_id',r.unit_id,'item_key',r.item_key,'kind',r.kind,'prompt',r.prompt,'answer',r.answer,'strength',r.strength,'mistake_count',r.mistake_count,'due_at',r.due_at) order by r.due_at) from(select * from public.user_review_items where user_id=auth.uid() and due_at<=now() order by due_at limit lim)r),'[]'::jsonb);
end $$;

create or replace function public.record_review_result(p_unit text,p_item_key text,p_correct boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 update public.user_review_items set strength=case when p_correct then least(5,strength+1) else greatest(0,strength-1) end,mistake_count=mistake_count+case when p_correct then 0 else 1 end,last_seen_at=now(),due_at=now()+case when p_correct then make_interval(days=>greatest(1,(strength+1)*(strength+1))) else interval '6 hours' end,updated_at=now() where user_id=auth.uid() and unit_id=p_unit and item_key=p_item_key;
 return found;
end $$;

create or replace function public.request_upgrade(p_term text,p_message text default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare rid bigint;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 if p_term not in('1_month','3_months','6_months','1_year') then raise exception 'invalid term'; end if;
 if exists(select 1 from public.upgrade_requests where user_id=auth.uid() and status in('open','contacted','paid')) then raise exception 'A pending upgrade request already exists'; end if;
 insert into public.upgrade_requests(user_id,desired_term,message,status) values(auth.uid(),p_term,left(nullif(trim(p_message),''),500),'open') returning id into rid;
 return rid;
end $$;

create or replace function public.admin_activate_pro(p_user uuid,p_days integer,p_note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.is_app_admin() then raise exception 'forbidden'; end if;
 if p_days not in(30,90,180,365) then raise exception 'invalid duration'; end if;
 insert into public.memberships(user_id,plan,status,started_at,expires_at,updated_at,admin_note) values(p_user,'pro','active',now(),now()+make_interval(days=>p_days),now(),left(p_note,500)) on conflict(user_id) do update set plan='pro',status='active',started_at=case when public.memberships.plan='pro' and public.memberships.status='active' and public.memberships.expires_at>now() then public.memberships.started_at else now() end,expires_at=(case when public.memberships.plan='pro' and public.memberships.status='active' and public.memberships.expires_at>now() then public.memberships.expires_at else now() end)+make_interval(days=>p_days),updated_at=now(),admin_note=left(p_note,500);
 update public.upgrade_requests set status='activated',updated_at=now() where user_id=p_user and status in('open','contacted','paid');
 return true;
end $$;

create or replace function public.admin_users_v2(p_search text default null)
returns table(user_id uuid,display_name text,email text,phone text,contact_consent boolean,plan text,status text,expires_at timestamptz,created_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_app_admin() then raise exception 'forbidden'; end if;
 return query select p.id,p.display_name,a.email::text,pr.phone,coalesce(pr.contact_consent,false),m.plan,case when m.plan='pro' and m.expires_at is not null and m.expires_at<=now() then 'expired' else m.status end,m.expires_at,p.created_at from public.profiles p join auth.users a on a.id=p.id join public.memberships m on m.user_id=p.id left join public.user_private pr on pr.user_id=p.id where p_search is null or trim(p_search)='' or p.display_name ilike '%'||trim(p_search)||'%' or a.email ilike '%'||trim(p_search)||'%' or coalesce(pr.phone,'') ilike '%'||trim(p_search)||'%' order by p.created_at desc;
end $$;

create or replace function public.admin_upgrade_requests_v2()
returns table(request_id bigint,user_id uuid,display_name text,email text,phone text,desired_term text,message text,status text,created_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_app_admin() then raise exception 'forbidden'; end if;
 return query select r.id,r.user_id,p.display_name,a.email::text,pr.phone,r.desired_term,r.message,r.status,r.created_at from public.upgrade_requests r join public.profiles p on p.id=r.user_id join auth.users a on a.id=r.user_id left join public.user_private pr on pr.user_id=r.user_id order by r.created_at desc;
end $$;

create or replace function public.admin_dashboard_metrics()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not public.is_app_admin() then raise exception 'forbidden'; end if;
 return jsonb_build_object('total_users',(select count(*) from public.profiles),'free_users',(select count(*) from public.memberships where plan<>'pro' or status<>'active' or (expires_at is not null and expires_at<=now())),'active_pro',(select count(*) from public.memberships where plan='pro' and status='active' and (expires_at is null or expires_at>now())),'pending_requests',(select count(*) from public.upgrade_requests where status in('open','contacted','paid')),'recent_registrations',(select count(*) from public.profiles where created_at>=now()-interval '7 days'));
end $$;

create or replace function public.admin_reject_upgrade_request(p_id bigint)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.is_app_admin() then raise exception 'forbidden'; end if;
 update public.upgrade_requests set status='cancelled',updated_at=now() where id=p_id and status in('open','contacted','paid');
 return found;
end $$;

-- Preserve the original mission engine and mirror successful mapped missions into course progress.
create or replace function public.complete_mission(p_path text,p_mission integer,p_score integer default 100)
returns public.user_progress language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid(); r public.user_progress; old_paths jsonb; path_obj jsonb; mission_key text:=p_mission::text; was_done boolean:=false; today_text text:=to_char(current_date,'YYYY-MM-DD'); mapped_unit text;
begin
 if u is null then raise exception 'not authenticated'; end if;
 if p_path not in('migration','career','travel') or p_mission<0 or p_mission>20 then raise exception 'invalid mission'; end if;
 insert into public.user_progress(user_id,xp,goal,paths,activity,days,updated_at) values(u,0,'migration','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,now()) on conflict(user_id) do nothing;
 select paths into old_paths from public.user_progress where user_id=u for update;
 path_obj:=coalesce(old_paths->p_path,'{}'::jsonb); was_done:=coalesce((path_obj->mission_key->>'completed')::boolean,false);
 path_obj:=jsonb_set(path_obj,array[mission_key],jsonb_build_object('completed',true,'best',greatest(coalesce((path_obj->mission_key->>'best')::integer,0),greatest(0,least(100,p_score)))),true); old_paths:=jsonb_set(coalesce(old_paths,'{}'::jsonb),array[p_path],path_obj,true);
 update public.user_progress set paths=old_paths,xp=xp+case when was_done then 0 else 80 end,activity=coalesce(activity,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('path',p_path,'mission',p_mission,'score',greatest(0,least(100,p_score)),'date',today_text)),days=(select coalesce(jsonb_agg(distinct x),'[]'::jsonb) from jsonb_array_elements(coalesce(days,'[]'::jsonb)||jsonb_build_array(today_text))x),updated_at=now() where user_id=u returning * into r;
 select cu.id into mapped_unit from public.course_units cu where cu.kind='conversation' and cu.active=true and cu.content->>'legacy_path'=p_path and coalesce((cu.content->>'legacy_mission')::integer,-1)=p_mission order by cu.unit_order limit 1;
 if mapped_unit is not null and public.can_access_lesson(mapped_unit) then perform public.complete_course_unit(mapped_unit,p_score); end if;
 return r;
end $$;

-- Free: one direct Partner; Pro: expanded direct Partner capacity.
create or replace function public.start_direct_conversation(p_partner uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare me uuid:=auth.uid(); cid uuid; k text; my_age text; partner_age text; lim int:=1; existing_count int:=0;
begin
 if me is null then raise exception 'Not authenticated'; end if;
 if p_partner is null or p_partner=me then raise exception 'Invalid partner'; end if;
 select age_group into my_age from public.profiles where id=me; select age_group into partner_age from public.profiles where id=p_partner and discoverable=true;
 if my_age is null or partner_age is null or my_age<>partner_age then raise exception 'Partner is not available'; end if;
 if exists(select 1 from public.blocks where(blocker_id=me and blocked_id=p_partner) or(blocker_id=p_partner and blocked_id=me)) then raise exception 'Partner is not available'; end if;
 k:=case when me::text<p_partner::text then me::text||':'||p_partner::text else p_partner::text||':'||me::text end; select id into cid from public.conversations where direct_key=k; if cid is not null then return cid; end if;
 select e.partner_limit into lim from public.my_entitlements()e; select count(*) into existing_count from public.conversation_members cm join public.conversations c on c.id=cm.conversation_id where cm.user_id=me and c.direct_key is not null;
 if existing_count>=coalesce(lim,1) then raise exception 'Partner limit reached for your plan'; end if;
 insert into public.conversations(direct_key) values(k) returning id into cid; insert into public.conversation_members(conversation_id,user_id) values(cid,me),(cid,p_partner) on conflict do nothing; return cid;
end $$;

revoke select on public.course_units from anon,authenticated;

do $$ declare r record; begin
 for r in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef=true loop execute format('revoke execute on function %I.%I(%s) from public, anon',r.nspname,r.proname,r.args); end loop;
end $$;

grant execute on function public.my_entitlements() to authenticated;
grant execute on function public.can_access_chapter(text) to authenticated;
grant execute on function public.can_access_lesson(text) to authenticated;
grant execute on function public.get_learning_home() to authenticated;
grant execute on function public.get_lesson(text) to authenticated;
grant execute on function public.complete_course_unit(text,integer) to authenticated;
grant execute on function public.get_review_queue(integer) to authenticated;
grant execute on function public.record_review_result(text,text,boolean) to authenticated;
grant execute on function public.request_upgrade(text,text) to authenticated;
grant execute on function public.admin_activate_pro(uuid,integer,text) to authenticated;
grant execute on function public.admin_users_v2(text) to authenticated;
grant execute on function public.admin_upgrade_requests_v2() to authenticated;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_reject_upgrade_request(bigint) to authenticated;
grant execute on function public.complete_mission(text,integer,integer) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
