-- Run once in Aziz's Supabase SQL editor before using the integrated skills module.
-- Additive only: does not alter profiles, auth, account permissions or user administration.
begin;
set local lock_timeout = '5s';

create table if not exists public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.technologies
  add column if not exists slug text,
  add column if not exists icon text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.skills
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists category_id uuid references public.skill_categories(id),
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Preserve existing unique slugs. Repair missing/blank values and duplicate slugs
-- using the FULL UUID: seeded IDs can all share the same first eight characters.
-- The collision check also handles an existing custom slug matching that candidate.
create or replace function pg_temp.skills_integration_repair_slugs(target_table regclass)
returns void language plpgsql as $$
declare
  item record;
  base_slug text;
  candidate text;
  collision boolean;
  suffix integer;
begin
  for item in execute format(
    'select id, name, slug from (
       select id, name, slug, row_number() over (partition by slug order by id) as duplicate_rank
       from %s
     ) ranked
     where slug is null or btrim(slug) = '''' or duplicate_rank > 1
     order by id', target_table
  ) loop
    base_slug := nullif(btrim(item.slug), '');
    if base_slug is null then
      base_slug := coalesce(nullif(trim(both '-' from regexp_replace(lower(item.name), '[^a-z0-9]+', '-', 'g')), ''), 'item');
    end if;
    base_slug := base_slug || '-' || item.id::text;
    candidate := base_slug;
    suffix := 0;
    loop
      execute format('select exists(select 1 from %s where slug = $1 and id <> $2)', target_table)
        into collision using candidate, item.id;
      exit when not collision;
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix::text;
    end loop;
    execute format('update %s set slug = $1 where id = $2', target_table)
      using candidate, item.id;
  end loop;
end;
$$;
select pg_temp.skills_integration_repair_slugs('public.technologies');
select pg_temp.skills_integration_repair_slugs('public.skills');
create unique index if not exists skills_integration_technology_slug on public.technologies(slug);
create unique index if not exists skills_integration_skill_slug on public.skills(slug);

alter table public.challenges
  add column if not exists is_published boolean not null default false,
  add column if not exists category text,
  add column if not exists description text;

create table if not exists public.challenge_skills (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  weight numeric not null default 1 check (weight between 1 and 3),
  primary key (challenge_id, skill_id)
);

-- These are backend-only tables; all access goes through Aziz's existing guards.
alter table public.skill_categories enable row level security;
alter table public.challenge_skills enable row level security;
revoke all on public.skill_categories, public.challenge_skills from public, anon, authenticated;
grant all on public.skill_categories, public.challenge_skills to service_role;

insert into public.skill_categories(name,slug) values ('Général','general') on conflict (slug) do nothing;
update public.skills set category_id = (select id from public.skill_categories where slug = 'general') where category_id is null;

create or replace function public.skills_integration_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.skills_integration_touch_updated_at() from public, anon, authenticated;
create or replace trigger skills_integration_touch before update on public.skills
for each row execute function public.skills_integration_touch_updated_at();
create or replace trigger skills_integration_touch before update on public.technologies
for each row execute function public.skills_integration_touch_updated_at();
create or replace trigger skills_integration_touch before update on public.skill_categories
for each row execute function public.skills_integration_touch_updated_at();

notify pgrst, 'reload schema';
commit;
