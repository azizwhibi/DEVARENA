-- Additive integration of marketplace-complete @ 21d851e835243b86c784b507892218ed65d8b170.
-- Reuses existing source Marketplace tables; no data or balances are imported.
-- Marketplace wallets. Separate from public.profiles so existing profile
-- selects and update_profile stay unchanged. A missing row means balance 0.
-- Functions insert the row on demand (insert ... on conflict do nothing).
begin;
set local lock_timeout = '10s';

-- Refuse an incompatible pre-existing namesake instead of silently losing history.
do $$
declare spec record; col text;
begin
  if to_regclass('public.credit_wallets') is null and
     (to_regclass('public.wallets') is not null or exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('credits_balance','credit_balance','wallet_balance'))) then
    raise exception 'Existing credit storage requires explicit mapping before applying Marketplace integration';
  end if;
  for spec in select * from (values
    ('credit_wallets', array['user_id','balance','updated_at']),
    ('marketplace_items', array['id','kind','title','description','price_credits','status','preview','animation_key','challenge_id','published_at','created_at']),
    ('marketplace_secrets', array['item_id','body']),
    ('marketplace_purchases', array['user_id','item_id','price_paid','created_at']),
    ('user_equipped_items', array['user_id','slot','item_id','equipped_at']),
    ('credit_transactions', array['id','user_id','amount','kind','item_id','created_at'])
  ) as specs(table_name,columns) loop
    if to_regclass('public.' || spec.table_name) is not null then
      foreach col in array spec.columns loop
        if not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=spec.table_name and c.column_name=col) then
          raise exception 'Incompatible existing Marketplace table %. Missing column %; reconcile explicitly before migration',spec.table_name,col;
        end if;
      end loop;
    end if;
  end loop;
end;
$$;


create table if not exists public.credit_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0 and balance <= 1000000),
  updated_at timestamptz not null default now()
);

alter table public.credit_wallets enable row level security;

revoke all on public.credit_wallets from public, anon, authenticated;
grant all on public.credit_wallets to service_role;

-- Marketplace catalog, purchases, ledger and SECURITY DEFINER functions.
-- Does not alter existing tables. Foreign keys only reference them.
--
-- Lock order, always, skipping a step the function does not use:
--   1. profiles FOR SHARE, several ids in ascending uuid order
--   2. credit_wallets FOR UPDATE
--   3. marketplace_items FOR SHARE when reading, FOR UPDATE when writing
--   4. marketplace_secrets FOR SHARE, only for a hint, after the item
-- A grant never targets the admin's own wallet. A hint with no secret is
-- refused before any debit. public.audit_log has no FK and must not store
-- email or username.

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('icon', 'animation', 'hint')),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  price_credits integer not null check (price_credits > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  preview text not null default '',
  animation_key text,
  challenge_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint marketplace_items_animation_key_check check (
    (kind = 'animation' and animation_key is not null and btrim(animation_key) <> '')
    or (kind <> 'animation' and animation_key is null)
  ),
  constraint marketplace_items_challenge_hint_check check (
    kind = 'hint' or challenge_id is null
  ),
  constraint marketplace_items_published_hint_check check (
    kind <> 'hint' or status <> 'published' or challenge_id is not null
  ),
  constraint marketplace_items_challenge_id_fkey
    foreign key (challenge_id) references public.challenges (id) on delete restrict
);

create table if not exists public.marketplace_secrets (
  item_id uuid primary key references public.marketplace_items (id) on delete cascade,
  body text not null check (btrim(body) <> '')
);

create table if not exists public.marketplace_purchases (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.marketplace_items (id) on delete restrict,
  price_paid integer not null check (price_paid > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.user_equipped_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot text not null check (slot in ('icon', 'animation')),
  item_id uuid not null,
  equipped_at timestamptz not null default now(),
  primary key (user_id, slot),
  constraint user_equipped_items_purchase_fkey
    foreign key (user_id, item_id)
    references public.marketplace_purchases (user_id, item_id)
    on delete cascade
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('marketplace_purchase', 'admin_grant')),
  item_id uuid,
  created_at timestamptz not null default now(),
  constraint credit_transactions_item_id_fkey
    foreign key (item_id) references public.marketplace_items (id) on delete restrict,
  constraint credit_transactions_shape_check check (
    (kind = 'marketplace_purchase' and item_id is not null and amount < 0)
    or (kind = 'admin_grant' and item_id is null and amount > 0)
  )
);

create unique index if not exists credit_transactions_purchase_uidx
  on public.credit_transactions (user_id, item_id)
  where kind = 'marketplace_purchase';

create index if not exists marketplace_purchases_item_id_idx
  on public.marketplace_purchases (item_id);

create index if not exists credit_transactions_item_id_idx
  on public.credit_transactions (item_id);

alter table public.marketplace_items enable row level security;
alter table public.marketplace_secrets enable row level security;
alter table public.marketplace_purchases enable row level security;
alter table public.user_equipped_items enable row level security;
alter table public.credit_transactions enable row level security;

revoke all on public.marketplace_items, public.marketplace_secrets,
  public.marketplace_purchases, public.user_equipped_items, public.credit_transactions
  from public, anon, authenticated;
grant all on public.marketplace_items, public.marketplace_secrets,
  public.marketplace_purchases, public.user_equipped_items, public.credit_transactions
  to service_role;

create or replace function public.marketplace_items_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.kind is distinct from old.kind then
    raise exception 'kind_immutable' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE'
     and new.status = 'draft'
     and old.status is distinct from 'draft'
     and exists (
       select 1 from public.marketplace_purchases as purchase
       where purchase.item_id = old.id
     ) then
    raise exception 'purchased_item_not_draft' using errcode = 'P0001';
  end if;
  if new.status = 'published'
     and new.published_at is null
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.marketplace_items_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
       select 1 from public.marketplace_purchases as purchase
       where purchase.item_id = old.id
     )
     or exists (
       select 1 from public.credit_transactions as entry
       where entry.item_id = old.id
     ) then
    raise exception 'purchased_item_not_deletable' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create or replace function public.marketplace_secrets_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.marketplace_items as item
    where item.id = new.item_id and item.kind = 'hint'
  ) then
    raise exception 'hint_secret_only' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists marketplace_items_before_write on public.marketplace_items;
create trigger marketplace_items_before_write
  before insert or update on public.marketplace_items
  for each row execute function public.marketplace_items_before_write();

drop trigger if exists marketplace_items_before_delete on public.marketplace_items;
create trigger marketplace_items_before_delete
  before delete on public.marketplace_items
  for each row execute function public.marketplace_items_before_delete();

drop trigger if exists marketplace_secrets_before_write on public.marketplace_secrets;
create trigger marketplace_secrets_before_write
  before insert or update on public.marketplace_secrets
  for each row execute function public.marketplace_secrets_before_write();

create or replace function public.purchase_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
) returns table (
  credits_balance integer,
  already_owned boolean,
  hint_content text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_status text;
  v_item_status text;
  v_price integer;
  v_kind text;
  v_balance integer;
  v_secret text;
begin
  -- Lock: buyer profile SHARE, buyer wallet UPDATE, item SHARE,
  -- then the hint secret SHARE. A missing secret raises before any debit.
  select profile.status into v_profile_status
  from public.profiles as profile
  where profile.id = p_user_id
  for share;
  if not found or v_profile_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.credit_wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  select wallet.balance into v_balance
  from public.credit_wallets as wallet
  where wallet.user_id = p_user_id
  for update;

  select item.status, item.price_credits, item.kind
  into v_item_status, v_price, v_kind
  from public.marketplace_items as item
  where item.id = p_item_id
  for share;

  if v_kind = 'hint' then
    select secret.body into v_secret
    from public.marketplace_secrets as secret
    where secret.item_id = p_item_id
    for share;
    if not found then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;
  end if;

  if exists (
    select 1 from public.marketplace_purchases as purchase
    where purchase.user_id = p_user_id and purchase.item_id = p_item_id
  ) then
    credits_balance := v_balance;
    already_owned := true;
    hint_content := v_secret;
    return next;
    return;
  end if;

  if v_item_status is distinct from 'published' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  if v_balance < v_price then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  update public.credit_wallets as wallet
  set balance = wallet.balance - v_price, updated_at = now()
  where wallet.user_id = p_user_id
  returning wallet.balance into v_balance;

  insert into public.marketplace_purchases (user_id, item_id, price_paid)
  values (p_user_id, p_item_id, v_price);
  insert into public.credit_transactions (user_id, amount, kind, item_id)
  values (p_user_id, -v_price, 'marketplace_purchase', p_item_id);

  credits_balance := v_balance;
  already_owned := false;
  hint_content := v_secret;
  return next;
end;
$$;

create or replace function public.equip_marketplace_item(
  p_user_id uuid,
  p_item_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_status text;
  v_kind text;
  v_item_status text;
begin
  -- Lock: buyer profile SHARE, item SHARE. No wallet.
  select profile.status into v_profile_status
  from public.profiles as profile
  where profile.id = p_user_id
  for share;
  if not found or v_profile_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select item.kind, item.status into v_kind, v_item_status
  from public.marketplace_items as item
  where item.id = p_item_id
  for share;
  if not found
     or v_kind not in ('icon', 'animation')
     or v_item_status not in ('published', 'archived')
     or not exists (
       select 1 from public.marketplace_purchases as purchase
       where purchase.user_id = p_user_id and purchase.item_id = p_item_id
     ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.user_equipped_items (user_id, slot, item_id)
  values (p_user_id, v_kind, p_item_id)
  on conflict (user_id, slot) do update
  set item_id = excluded.item_id, equipped_at = now();
end;
$$;

create or replace function public.unequip_marketplace_item(
  p_user_id uuid,
  p_slot text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_status text;
begin
  -- Lock: buyer profile SHARE.
  if p_slot not in ('icon', 'animation') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select profile.status into v_profile_status
  from public.profiles as profile
  where profile.id = p_user_id
  for share;
  if not found or v_profile_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  delete from public.user_equipped_items as equipped
  where equipped.user_id = p_user_id and equipped.slot = p_slot;
end;
$$;

create or replace function public.marketplace_hint_content(
  p_user_id uuid,
  p_item_id uuid
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_profile_status text;
  v_kind text;
  v_body text;
begin
  -- Lock: caller profile SHARE, item SHARE.
  select profile.role, profile.status into v_role, v_profile_status
  from public.profiles as profile
  where profile.id = p_user_id
  for share;
  if not found or v_profile_status is distinct from 'active' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select item.kind into v_kind
  from public.marketplace_items as item
  where item.id = p_item_id
  for share;
  if not found or v_kind is distinct from 'hint' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_role is distinct from 'admin' and not exists (
    select 1 from public.marketplace_purchases as purchase
    where purchase.user_id = p_user_id and purchase.item_id = p_item_id
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select secret.body into v_body
  from public.marketplace_secrets as secret
  where secret.item_id = p_item_id;
  return v_body;
end;
$$;

create or replace function public.marketplace_admin_purchased_ids(
  p_admin_id uuid,
  p_item_ids uuid[]
) returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock: admin profile SHARE.
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = p_admin_id
      and profile.role = 'admin'
      and profile.status = 'active'
    for share
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_item_ids is null then
    return;
  end if;
  return query
  select distinct purchase.item_id
  from public.marketplace_purchases as purchase
  where purchase.item_id = any (p_item_ids);
end;
$$;

create or replace function public.admin_grant_credits(
  p_admin_id uuid,
  p_user_id uuid,
  p_amount integer,
  p_reason text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_first uuid;
  v_second uuid;
  v_old integer;
  v_new integer;
begin
  if p_admin_id = p_user_id
     or p_amount is null or p_amount < 1 or p_amount > 10000
     or v_reason = '' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Lock: the two distinct profiles SHARE in ascending id order, then recipient wallet UPDATE.
  if p_admin_id < p_user_id then
    v_first := p_admin_id;
    v_second := p_user_id;
  else
    v_first := p_user_id;
    v_second := p_admin_id;
  end if;

  perform 1 from public.profiles as profile where profile.id = v_first for share;
  perform 1 from public.profiles as profile where profile.id = v_second for share;

  if not exists (
    select 1 from public.profiles as profile
    where profile.id = p_admin_id
      and profile.role = 'admin'
      and profile.status = 'active'
  ) or not exists (
    select 1 from public.profiles as profile where profile.id = p_user_id
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  insert into public.credit_wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  select wallet.balance into v_old
  from public.credit_wallets as wallet
  where wallet.user_id = p_user_id
  for update;

  if v_old::bigint + p_amount::bigint > 1000000 then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  update public.credit_wallets as wallet
  set balance = wallet.balance + p_amount, updated_at = now()
  where wallet.user_id = p_user_id
  returning wallet.balance into v_new;

  insert into public.credit_transactions (user_id, amount, kind)
  values (p_user_id, p_amount, 'admin_grant');

  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    p_admin_id,
    p_user_id,
    'credits.granted',
    jsonb_build_object('balance', v_old),
    jsonb_build_object('balance', v_new, 'amount', p_amount, 'reason', v_reason)
  );

  return v_new;
end;
$$;

create or replace function public.marketplace_admin_save_item(
  p_admin_id uuid,
  p_item_id uuid,
  p_kind text,
  p_title text,
  p_description text,
  p_price_credits integer,
  p_status text,
  p_preview text,
  p_animation_key text,
  p_challenge_id uuid,
  p_hint_body text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_item_id;
  v_before jsonb;
  v_title text := btrim(coalesce(p_title, ''));
  v_animation text := nullif(btrim(coalesce(p_animation_key, '')), '');
  v_hint text := nullif(btrim(coalesce(p_hint_body, '')), '');
  v_challenge uuid := p_challenge_id;
begin
  -- Lock: admin profile SHARE, then the existing item UPDATE.
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = p_admin_id
      and profile.role = 'admin'
      and profile.status = 'active'
    for share
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_title = '' or p_price_credits is null or p_price_credits < 1
     or p_kind not in ('icon', 'animation', 'hint')
     or p_status not in ('draft', 'published', 'archived') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_kind = 'animation' and v_animation is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_kind <> 'animation' then
    v_animation := null;
  end if;
  if p_kind = 'hint' and v_hint is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_kind <> 'hint' then
    v_challenge := null;
    v_hint := null;
  end if;

  if v_id is null then
    insert into public.marketplace_items (
      kind, title, description, price_credits, status, preview, animation_key, challenge_id
    ) values (
      p_kind, v_title, coalesce(p_description, ''), p_price_credits, p_status,
      coalesce(p_preview, ''), v_animation, v_challenge
    )
    returning id into v_id;
    if p_kind = 'hint' then
      insert into public.marketplace_secrets (item_id, body) values (v_id, v_hint);
    end if;
    insert into public.audit_log (actor_id, target_id, action, "before", "after")
    values (
      p_admin_id,
      v_id,
      'marketplace.item_saved',
      null,
      jsonb_build_object(
        'kind', p_kind, 'title', v_title, 'price_credits', p_price_credits,
        'status', p_status, 'challenge_id', v_challenge
      )
    );
    return v_id;
  end if;

  select jsonb_build_object(
    'kind', item.kind, 'title', item.title, 'price_credits', item.price_credits,
    'status', item.status, 'challenge_id', item.challenge_id
  )
  into v_before
  from public.marketplace_items as item
  where item.id = v_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  if (select item.kind from public.marketplace_items as item where item.id = v_id) is distinct from p_kind then
    raise exception 'kind_immutable' using errcode = 'P0001';
  end if;

  update public.marketplace_items as item
  set title = v_title,
      description = coalesce(p_description, ''),
      price_credits = p_price_credits,
      status = p_status,
      preview = coalesce(p_preview, ''),
      animation_key = v_animation,
      challenge_id = v_challenge
  where item.id = v_id;

  if p_kind = 'hint' then
    insert into public.marketplace_secrets (item_id, body) values (v_id, v_hint)
    on conflict (item_id) do update set body = excluded.body;
  else
    delete from public.marketplace_secrets as secret where secret.item_id = v_id;
  end if;

  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    p_admin_id,
    v_id,
    'marketplace.item_saved',
    v_before,
    jsonb_build_object(
      'kind', p_kind, 'title', v_title, 'price_credits', p_price_credits,
      'status', p_status, 'challenge_id', v_challenge
    )
  );
  return v_id;
end;
$$;

create or replace function public.marketplace_admin_archive_item(
  p_admin_id uuid,
  p_item_id uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  -- Lock: admin profile SHARE, item UPDATE.
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = p_admin_id
      and profile.role = 'admin'
      and profile.status = 'active'
    for share
  ) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select item.status into v_status
  from public.marketplace_items as item
  where item.id = p_item_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  if v_status = 'archived' then
    return;
  end if;
  update public.marketplace_items as item
  set status = 'archived'
  where item.id = p_item_id;
  insert into public.audit_log (actor_id, target_id, action, "before", "after")
  values (
    p_admin_id,
    p_item_id,
    'marketplace.item_archived',
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'archived')
  );
end;
$$;

revoke all on function
  public.marketplace_items_before_write(),
  public.marketplace_items_before_delete(),
  public.marketplace_secrets_before_write(),
  public.purchase_marketplace_item(uuid, uuid),
  public.equip_marketplace_item(uuid, uuid),
  public.unequip_marketplace_item(uuid, text),
  public.marketplace_hint_content(uuid, uuid),
  public.marketplace_admin_purchased_ids(uuid, uuid[]),
  public.admin_grant_credits(uuid, uuid, integer, text),
  public.marketplace_admin_save_item(uuid, uuid, text, text, text, integer, text, text, text, uuid, text),
  public.marketplace_admin_archive_item(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  public.marketplace_items_before_write(),
  public.marketplace_items_before_delete(),
  public.marketplace_secrets_before_write(),
  public.purchase_marketplace_item(uuid, uuid),
  public.equip_marketplace_item(uuid, uuid),
  public.unequip_marketplace_item(uuid, text),
  public.marketplace_hint_content(uuid, uuid),
  public.marketplace_admin_purchased_ids(uuid, uuid[]),
  public.admin_grant_credits(uuid, uuid, integer, text),
  public.marketplace_admin_save_item(uuid, uuid, text, text, text, integer, text, text, text, uuid, text),
  public.marketplace_admin_archive_item(uuid, uuid)
  to service_role;

commit;
