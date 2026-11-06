begin;
create extension if not exists pgcrypto;

create table if not exists public.hairdressers (
 id uuid primary key default gen_random_uuid(), name text not null, avatar_url text,
 active boolean not null default true, display_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.hairdressers add column if not exists active boolean not null default true;
alter table public.hairdressers add column if not exists display_order integer not null default 0;
alter table public.hairdressers add column if not exists updated_at timestamptz not null default now();
alter table public.bookings add column if not exists hairdresser_id uuid references public.hairdressers(id) on delete set null;
create index if not exists bookings_hairdresser_date_idx on public.bookings(hairdresser_id,booking_date,start_time);

create table if not exists public.hairdresser_working_hours (
 hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
 day_of_week integer not null check(day_of_week between 0 and 6), is_open boolean not null default false,
 morning_open time,morning_close time,afternoon_open time,afternoon_close time,updated_at timestamptz not null default now(),
 primary key(hairdresser_id,day_of_week),
 check((morning_open is null and morning_close is null) or (morning_open is not null and morning_close is not null and morning_open<morning_close)),
 check((afternoon_open is null and afternoon_close is null) or (afternoon_open is not null and afternoon_close is not null and afternoon_open<afternoon_close)),
 check(morning_close is null or afternoon_open is null or morning_close<=afternoon_open)
);
create table if not exists public.hairdresser_absences (
 id uuid primary key default gen_random_uuid(),hairdresser_id uuid not null references public.hairdressers(id) on delete cascade,
 absence_date date not null,all_day boolean not null default true,start_time time,end_time time,reason text not null default '',created_at timestamptz not null default now(),
 check((all_day=true and start_time is null and end_time is null) or (all_day=false and start_time is not null and end_time is not null and start_time<end_time))
);
create index if not exists hairdresser_absences_lookup_idx on public.hairdresser_absences(hairdresser_id,absence_date);

alter table public.hairdressers enable row level security;alter table public.hairdresser_working_hours enable row level security;alter table public.hairdresser_absences enable row level security;
revoke all on public.hairdressers from anon,authenticated;revoke all on public.hairdresser_working_hours from anon,authenticated;revoke all on public.hairdresser_absences from anon,authenticated;
grant select on public.hairdressers,public.hairdresser_working_hours,public.hairdresser_absences to authenticated;
drop policy if exists "Enable read access for all users" on public.hairdressers;drop policy if exists "Enable all access for authenticated or admin users" on public.hairdressers;drop policy if exists "authenticated read active hairdressers" on public.hairdressers;drop policy if exists "owner read all hairdressers" on public.hairdressers;
create policy "authenticated read active hairdressers" on public.hairdressers for select to authenticated using(active=true);
create policy "owner read all hairdressers" on public.hairdressers for select to authenticated using((select public.is_proprietario()));
drop policy if exists "authenticated read hairdresser hours" on public.hairdresser_working_hours;create policy "authenticated read hairdresser hours" on public.hairdresser_working_hours for select to authenticated using(true);
drop policy if exists "authenticated read hairdresser absences" on public.hairdresser_absences;create policy "authenticated read hairdresser absences" on public.hairdresser_absences for select to authenticated using(true);

create or replace function public.owner_initialize_hairdresser_hours(p_hairdresser_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_proprietario() then raise exception 'Accesso non autorizzato';end if;
 insert into public.hairdresser_working_hours(hairdresser_id,day_of_week,is_open,morning_open,morning_close,afternoon_open,afternoon_close)
 select p_hairdresser_id,w.day_of_week,w.is_open,w.morning_open,w.morning_close,w.afternoon_open,w.afternoon_close from public.working_hours w on conflict do nothing;
end;$$;
create or replace function public.owner_save_hairdresser_day(p_hairdresser_id uuid,p_day integer,p_is_open boolean,p_morning_open time,p_morning_close time,p_afternoon_open time,p_afternoon_close time) returns void language plpgsql security definer set search_path='' as $$ begin
 if not public.is_proprietario() then raise exception 'Accesso non autorizzato';end if;
 if p_is_open and(p_morning_open is null or p_morning_close is null or p_morning_open>=p_morning_close)then raise exception 'Intervallo principale non valido';end if;
 if p_is_open and((p_afternoon_open is null)<>(p_afternoon_close is null))then raise exception 'Compila entrambi gli orari del secondo intervallo';end if;
 if p_is_open and p_afternoon_open is not null and(p_afternoon_open>=p_afternoon_close or p_morning_close>p_afternoon_open)then raise exception 'Secondo intervallo non valido';end if;
 insert into public.hairdresser_working_hours values(p_hairdresser_id,p_day,p_is_open,case when p_is_open then p_morning_open end,case when p_is_open then p_morning_close end,case when p_is_open then p_afternoon_open end,case when p_is_open then p_afternoon_close end,now())
 on conflict(hairdresser_id,day_of_week)do update set is_open=excluded.is_open,morning_open=excluded.morning_open,morning_close=excluded.morning_close,afternoon_open=excluded.afternoon_open,afternoon_close=excluded.afternoon_close,updated_at=now();
end;$$;
create or replace function public.owner_add_hairdresser_absence(p_hairdresser_id uuid,p_date date,p_all_day boolean,p_start time,p_end time,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$ declare v uuid;begin
 if not public.is_proprietario()then raise exception 'Accesso non autorizzato';end if;
 insert into public.hairdresser_absences(hairdresser_id,absence_date,all_day,start_time,end_time,reason)values(p_hairdresser_id,p_date,p_all_day,case when p_all_day then null else p_start end,case when p_all_day then null else p_end end,coalesce(p_reason,''))returning id into v;return v;
end;$$;
create or replace function public.owner_delete_hairdresser_absence(p_id uuid)returns void language plpgsql security definer set search_path='' as $$ begin if not public.is_proprietario()then raise exception 'Accesso non autorizzato';end if;delete from public.hairdresser_absences where id=p_id;end;$$;

create or replace function public.get_available_hairdressers(p_date date,p_service_id uuid,p_start_time time)returns table(id uuid,name text,avatar_url text)language plpgsql security definer set search_path='' as $$ declare s public.services%rowtype;cfg public.booking_settings%rowtype;e time;dow integer;begin
 select * into s from public.services where services.id=p_service_id and attivo=true;if s.id is null then return;end if;select * into cfg from public.booking_settings where booking_settings.id=1;e:=p_start_time+make_interval(mins=>s.durata_minuti+cfg.buffer_minutes);dow:=extract(dow from p_date)::integer;
 return query select h.id,h.name,h.avatar_url from public.hairdressers h where h.active
 and(not exists(select 1 from public.hairdresser_working_hours x where x.hairdresser_id=h.id)or exists(select 1 from public.hairdresser_working_hours x where x.hairdresser_id=h.id and x.day_of_week=dow and x.is_open and((p_start_time>=x.morning_open and e<=x.morning_close)or(x.afternoon_open is not null and p_start_time>=x.afternoon_open and e<=x.afternoon_close))))
 and not exists(select 1 from public.hairdresser_absences a where a.hairdresser_id=h.id and a.absence_date=p_date and(a.all_day or(p_start_time<a.end_time and e>a.start_time)))
 and not exists(select 1 from public.bookings b where b.hairdresser_id=h.id and b.booking_date=p_date and b.status in('CONFERMATO','COMPLETATO')and p_start_time<b.end_time and e>b.start_time)order by h.display_order,h.name;
end;$$;

create or replace function public.get_available_slots_v2(p_date date,p_service_id uuid,p_hairdresser_id uuid default null)returns table(slot_start time)language plpgsql security definer set search_path='' as $$ declare s public.services%rowtype;wh public.working_hours%rowtype;cfg public.booking_settings%rowtype;dur interval;step interval;c timestamp;st timestamp;en timestamp;n timestamp;has_staff boolean;begin
 if not exists(select 1 from public.profiles where id=(select auth.uid())and stato='APPROVATO')then return;end if;
 select * into s from public.services where id=p_service_id and attivo=true;if s.id is null then return;end if;select * into cfg from public.booking_settings where id=1;select * into wh from public.working_hours where day_of_week=extract(dow from p_date)::integer and is_open;if wh.day_of_week is null then return;end if;
 n:=timezone('Europe/Rome',now());if p_date<n::date or p_date>n::date+cfg.maximum_booking_days or exists(select 1 from public.closures where closure_date=p_date and all_day)then return;end if;
 select exists(select 1 from public.hairdressers where active)into has_staff;dur:=make_interval(mins=>s.durata_minuti+cfg.buffer_minutes);step:=make_interval(mins=>cfg.slot_minutes);
 for st,en in select p_date+wh.morning_open,p_date+wh.morning_close union all select p_date+wh.afternoon_open,p_date+wh.afternoon_close where wh.afternoon_open is not null loop c:=st;while c+dur<=en loop
  if c>=n+make_interval(mins=>cfg.minimum_notice_minutes)and not exists(select 1 from public.closures x where x.closure_date=p_date and not x.all_day and c::time<x.end_time and(c+dur)::time>x.start_time)
  and((not has_staff and not exists(select 1 from public.bookings b where b.booking_date=p_date and b.status in('CONFERMATO','COMPLETATO')and c::time<b.end_time and(c+dur)::time>b.start_time))or(has_staff and exists(select 1 from public.get_available_hairdressers(p_date,p_service_id,c::time) h where p_hairdresser_id is null or h.id=p_hairdresser_id)))then slot_start:=c::time;return next;end if;c:=c+step;end loop;end loop;
end;$$;
create or replace function public.client_create_booking_v2(p_service_id uuid,p_date date,p_start_time time,p_notes text default'',p_hairdresser_id uuid default null)returns uuid language plpgsql security definer set search_path='' as $$ declare p public.profiles%rowtype;s public.services%rowtype;cfg public.booking_settings%rowtype;bid uuid;e time;valid boolean;chosen uuid;has_staff boolean;begin
 select * into p from public.profiles where id=(select auth.uid());if p.id is null or p.ruolo<>'CLIENTE' or p.stato<>'APPROVATO'then raise exception 'Cliente non autorizzato';end if;select * into s from public.services where id=p_service_id and attivo=true;select * into cfg from public.booking_settings where id=1;perform pg_advisory_xact_lock(hashtext(p_date::text||p_start_time::text));select exists(select 1 from public.get_available_slots_v2(p_date,p_service_id,p_hairdresser_id)x where x.slot_start=p_start_time)into valid;if not valid then raise exception 'Slot non disponibile';end if;
 select exists(select 1 from public.hairdressers where active)into has_staff;if has_staff then if p_hairdresser_id is not null then chosen:=p_hairdresser_id;else select h.id into chosen from public.get_available_hairdressers(p_date,p_service_id,p_start_time)h limit 1;end if;if chosen is null then raise exception 'Nessun parrucchiere disponibile';end if;end if;e:=p_start_time+make_interval(mins=>s.durata_minuti+cfg.buffer_minutes);
 insert into public.bookings(client_id,service_id,hairdresser_id,booking_date,start_time,end_time,service_name,duration_minutes,price,notes)values((select auth.uid()),p_service_id,chosen,p_date,p_start_time,e,s.nome,s.durata_minuti,s.prezzo,trim(coalesce(p_notes,'')))returning id into bid;return bid;
end;$$;

revoke all on function public.owner_initialize_hairdresser_hours(uuid)from public;revoke all on function public.owner_save_hairdresser_day(uuid,integer,boolean,time,time,time,time)from public;revoke all on function public.owner_add_hairdresser_absence(uuid,date,boolean,time,time,text)from public;revoke all on function public.owner_delete_hairdresser_absence(uuid)from public;revoke all on function public.get_available_hairdressers(date,uuid,time)from public;revoke all on function public.get_available_slots_v2(date,uuid,uuid)from public;revoke all on function public.client_create_booking_v2(uuid,date,time,text,uuid)from public;
grant execute on function public.owner_initialize_hairdresser_hours(uuid),public.owner_save_hairdresser_day(uuid,integer,boolean,time,time,time,time),public.owner_add_hairdresser_absence(uuid,date,boolean,time,time,text),public.owner_delete_hairdresser_absence(uuid),public.get_available_hairdressers(date,uuid,time),public.get_available_slots_v2(date,uuid,uuid),public.client_create_booking_v2(uuid,date,time,text,uuid)to authenticated;
commit;
