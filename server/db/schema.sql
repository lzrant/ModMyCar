-- Run once in the Supabase SQL editor, then seed.sql. Re-runnable migration.
begin;
create table if not exists public.vehicles (
  id bigint generated always as identity primary key,
  year integer not null check (year between 1886 and 2100),
  make text not null, model text not null, trim text not null default '',
  profile jsonb not null,
  unique(year, make, model, trim)
);
-- Preserve the original parts/compatibility tables and any existing rows.
create table if not exists public.parts (
  id bigint generated always as identity primary key,
  name text not null, type text not null, manufacturer text,
  specifications jsonb, created_at timestamptz default now()
);
alter table public.parts add column if not exists sku text;
alter table public.parts add column if not exists visual_category text;
alter table public.parts add column if not exists render_key text;
alter table public.parts add column if not exists source_url text;
alter table public.parts add column if not exists fitment_notes text;
create unique index if not exists parts_sku on public.parts(sku);
create table if not exists public.render_variants (
  visual_category text not null, render_key text not null, slot text not null,
  primary key(visual_category, render_key)
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'parts_render_variant') then
    alter table public.parts add constraint parts_render_variant foreign key (visual_category, render_key)
      references public.render_variants(visual_category, render_key);
  end if;
end $$;
create table if not exists public.compatibility (
  id bigint generated always as identity primary key,
  part_id bigint not null references public.parts(id) on delete cascade,
  car_make text not null, car_model text not null, car_year_range text,
  created_at timestamptz default now()
);
alter table public.compatibility add column if not exists vehicle_id bigint references public.vehicles(id) on delete cascade;
create unique index if not exists compatibility_vehicle_part on public.compatibility(vehicle_id, part_id);
create index if not exists parts_visual_category on public.parts(visual_category);
create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id bigint not null references public.vehicles(id),
  part_ids bigint[] not null default '{}',
  paint_color text not null check (paint_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  check (cardinality(part_ids) <= 20)
);
create index if not exists builds_user_id on public.builds(user_id);
-- This also protects direct Supabase writes that bypass Express validation.
create or replace function public.validate_build_parts() returns trigger language plpgsql
set search_path = public as $$
declare matched integer; slots integer;
begin
  select count(*), count(distinct r.slot) into matched, slots
  from unnest(new.part_ids) selected(id)
  join compatibility c on c.part_id = selected.id and c.vehicle_id = new.vehicle_id
  join parts p on p.id = selected.id
  join render_variants r using (visual_category, render_key);
  if matched <> cardinality(new.part_ids) or slots <> cardinality(new.part_ids) then
    raise exception 'Parts must be compatible, renderable and unique per slot' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists check_build_parts on public.builds;
create trigger check_build_parts before insert or update on public.builds for each row execute function public.validate_build_parts();
alter table public.vehicles enable row level security;
alter table public.parts enable row level security;
alter table public.compatibility enable row level security;
alter table public.render_variants enable row level security;
alter table public.builds enable row level security;
do $$ declare tab text; begin
  foreach tab in array array['vehicles','parts','compatibility','render_variants'] loop
    execute format('drop policy if exists catalog_read on public.%I',tab);
    execute format('create policy catalog_read on public.%I for select to anon, authenticated using (true)',tab);
    execute format('revoke all on public.%I from anon, authenticated',tab);
    execute format('grant select on public.%I to anon, authenticated',tab);
  end loop;
end $$;
drop policy if exists own_builds_read on public.builds;
drop policy if exists own_builds_insert on public.builds;
create policy own_builds_read on public.builds for select to authenticated using (user_id = (select auth.uid()));
create policy own_builds_insert on public.builds for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.builds from anon, authenticated;
grant select on public.builds to authenticated;
grant insert (vehicle_id, part_ids, paint_color) on public.builds to authenticated;
commit;
