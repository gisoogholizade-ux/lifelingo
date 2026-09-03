insert into public.avatar_catalog(id,category,src,active)
values
  (0,'girls','./assets/4C99D87A-32DC-4B66-B834-F15257487B07.png',true),
  (1,'girls','./assets/8C662C59-60C5-4AB8-A6D9-728B598D3EAE.png',true),
  (2,'girls','./assets/98B0EBC3-1F87-413C-AB08-C6AB17ACE492.png',true),
  (3,'girls','./assets/DA3E874A-7DD6-46E9-828B-3688B43FC385.png',true),
  (4,'girls','./assets/F131F764-76F2-4E70-8F9A-270F2F64804E.png',true),
  (10,'boys','./assets/1DCA1D8B-E146-4CFF-9803-F2FEDB77F21B.png',true),
  (11,'boys','./assets/496DCF3B-187B-4F7A-A5BA-F3DFE6D3DD48.png',true),
  (12,'boys','./assets/9BA0896E-6704-42C2-8BEF-1589C15C47A7.png',true),
  (13,'boys','./assets/B71F29C4-CA8E-4590-968A-20A8A1D079B9.png',true),
  (14,'boys','./assets/D474CA0C-5506-46D8-9718-CF9DB25E2C73.png',true)
on conflict (id) do update
set category=excluded.category,src=excluded.src,active=true;

update public.avatar_catalog set active=false
where id not in (0,1,2,3,4,10,11,12,13,14);

do $$
begin
  if (select count(*) from public.avatar_catalog where active and category='girls') <> 5
     or (select count(*) from public.avatar_catalog where active and category='boys') <> 5 then
    raise exception 'Canonical LifeLingo avatar catalog is invalid';
  end if;
end $$;
