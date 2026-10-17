create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '', cognome text not null default '', telefono text not null default '',
  stato text not null default 'IN_ATTESA' check (stato in ('IN_ATTESA','APPROVATO','RIFIUTATO','BLOCCATO')),
  privacy_version text not null default '1.0', terms_version text not null default '1.0',
  legal_accepted_at timestamptz, marketing_consent boolean not null default false,
  marketing_updated_at timestamptz, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profile read own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profile update own limited" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,nome,cognome,telefono,stato,privacy_version,terms_version,legal_accepted_at,marketing_consent,marketing_updated_at)
 values(new.id,coalesce(new.raw_user_meta_data->>'nome',''),coalesce(new.raw_user_meta_data->>'cognome',''),coalesce(new.raw_user_meta_data->>'telefono',''),'IN_ATTESA',coalesce(new.raw_user_meta_data->>'privacy_version','1.0'),coalesce(new.raw_user_meta_data->>'terms_version','1.0'),coalesce((new.raw_user_meta_data->>'legal_accepted_at')::timestamptz,now()),coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean,false),now());
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
