-- DEV DATABASE ONLY. Apply both marketplace migrations first.
-- Fixtures roll back, including on failure.
begin;
set local statement_timeout = '30s';

create function pg_temp.assert(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

do $$
declare
  signature text;
begin
  foreach signature in array array[
    'public.marketplace_items_before_write()',
    'public.marketplace_items_before_delete()',
    'public.marketplace_secrets_before_write()',
    'public.purchase_marketplace_item(uuid, uuid)',
    'public.equip_marketplace_item(uuid, uuid)',
    'public.unequip_marketplace_item(uuid, text)',
    'public.marketplace_hint_content(uuid, uuid)',
    'public.marketplace_admin_purchased_ids(uuid, uuid[])',
    'public.admin_grant_credits(uuid, uuid, integer, text)',
    'public.marketplace_admin_save_item(uuid, uuid, text, text, text, integer, text, text, text, uuid, text)',
    'public.marketplace_admin_archive_item(uuid, uuid)'
  ]
  loop
    if has_function_privilege('anon', signature, 'EXECUTE')
       or has_function_privilege('authenticated', signature, 'EXECUTE') then
      raise exception 'ASSERTION FAILED: % is executable by anon or authenticated', signature;
    end if;
    if not has_function_privilege('service_role', signature, 'EXECUTE') then
      raise exception 'ASSERTION FAILED: service_role cannot execute %', signature;
    end if;
  end loop;
end;
$$;

create temporary table market_fixture (label text primary key, id uuid not null);
insert into market_fixture values
  ('admin', gen_random_uuid()),
  ('buyer', gen_random_uuid()),
  ('suspended', gen_random_uuid()),
  ('challenge', gen_random_uuid());

insert into auth.users (id, email, raw_user_meta_data)
select id, label || '@marketplace.test', '{}'::jsonb
from market_fixture
where label in ('admin', 'buyer', 'suspended');

update public.profiles
set role = 'admin'
where id = (select id from market_fixture where label = 'admin');
update public.profiles
set status = 'suspended'
where id = (select id from market_fixture where label = 'suspended');

insert into public.challenges (id, title, difficulty)
values (
  (select id from market_fixture where label = 'challenge'),
  'Boucle bornee',
  'beginner'
);

select pg_temp.assert(
  public.admin_grant_credits(
    (select id from market_fixture where label = 'admin'),
    (select id from market_fixture where label = 'buyer'),
    100,
    'seed'
  ) = 100,
  'admin grant opens a wallet at 100');

create temporary table market_item (label text primary key, id uuid not null);
insert into market_item (label, id)
values (
  'cheap',
  public.marketplace_admin_save_item(
    (select id from market_fixture where label = 'admin'),
    null,
    'icon',
    'Curseur',
    'Icone de test',
    40,
    'published',
    '>_',
    null,
    null,
    null
  )
),
(
  'expensive',
  public.marketplace_admin_save_item(
    (select id from market_fixture where label = 'admin'),
    null,
    'icon',
    'Couronne',
    'Trop cher',
    200,
    'published',
    '^*',
    null,
    null,
    null
  )
);

create temporary table purchase_once (
  credits_balance integer,
  already_owned boolean,
  hint_content text
);
insert into purchase_once
select * from public.purchase_marketplace_item(
  (select id from market_fixture where label = 'buyer'),
  (select id from market_item where label = 'cheap')
);
select pg_temp.assert(
  (select credits_balance = 60 and already_owned = false and hint_content is null from purchase_once),
  'first purchase debits the wallet and hides hint text');
select pg_temp.assert(
  (select count(*) = 1 from public.marketplace_purchases
    where user_id = (select id from market_fixture where label = 'buyer')
      and item_id = (select id from market_item where label = 'cheap')
      and price_paid = 40)
  and (select count(*) = 1 from public.credit_transactions
    where user_id = (select id from market_fixture where label = 'buyer')
      and item_id = (select id from market_item where label = 'cheap')
      and kind = 'marketplace_purchase'
      and amount = -40),
  'purchase writes one paid row and one negative ledger row');

delete from purchase_once;
insert into purchase_once
select * from public.purchase_marketplace_item(
  (select id from market_fixture where label = 'buyer'),
  (select id from market_item where label = 'cheap')
);
select pg_temp.assert(
  (select credits_balance = 60 and already_owned = true from purchase_once)
  and (select balance = 60 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer'))
  and (select count(*) = 1 from public.credit_transactions
    where user_id = (select id from market_fixture where label = 'buyer')
      and kind = 'marketplace_purchase'),
  'second purchase is idempotent and does not debit again');

do $$
begin
  perform * from public.purchase_marketplace_item(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'expensive')
  );
  raise exception 'ASSERTION FAILED: expensive purchase succeeded';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'insufficient_credits' then
    raise exception 'ASSERTION FAILED: expected insufficient_credits, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  (select balance = 60 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer'))
  and not exists (
    select 1 from public.marketplace_purchases
    where item_id = (select id from market_item where label = 'expensive')
  ),
  'insufficient balance does not create a purchase');

do $$
begin
  perform * from public.purchase_marketplace_item(
    (select id from market_fixture where label = 'suspended'),
    (select id from market_item where label = 'cheap')
  );
  raise exception 'ASSERTION FAILED: suspended purchase succeeded';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  not exists (
    select 1 from public.marketplace_purchases
    where user_id = (select id from market_fixture where label = 'suspended')
  ),
  'suspended account does not receive the item');

do $$
begin
  update public.marketplace_items
  set kind = 'animation', animation_key = 'scanline'
  where id = (select id from market_item where label = 'cheap');
  raise exception 'ASSERTION FAILED: kind changed';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'kind_immutable' then
    raise exception 'ASSERTION FAILED: expected kind_immutable, got %', sqlerrm;
  end if;
end;
$$;

do $$
begin
  update public.marketplace_items
  set status = 'draft'
  where id = (select id from market_item where label = 'cheap');
  raise exception 'ASSERTION FAILED: purchased item returned to draft';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'purchased_item_not_draft' then
    raise exception 'ASSERTION FAILED: expected purchased_item_not_draft, got %', sqlerrm;
  end if;
end;
$$;

do $$
begin
  delete from public.marketplace_items
  where id = (select id from market_item where label = 'cheap');
  raise exception 'ASSERTION FAILED: purchased item was deleted';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'purchased_item_not_deletable' then
    raise exception 'ASSERTION FAILED: expected purchased_item_not_deletable, got %', sqlerrm;
  end if;
end;
$$;

insert into market_item (label, id) values ('broken_hint', gen_random_uuid());
insert into public.marketplace_items (id, kind, title, price_credits, status, challenge_id)
select id, 'hint', 'Indice casse', 10, 'published',
  (select id from market_fixture where label = 'challenge')
from market_item where label = 'broken_hint';
do $$
begin
  perform * from public.purchase_marketplace_item(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'broken_hint')
  );
  raise exception 'ASSERTION FAILED: hint without secret was purchased';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'unavailable' then
    raise exception 'ASSERTION FAILED: expected unavailable, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  (select balance = 60 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer'))
  and not exists (
    select 1 from public.marketplace_purchases
    where item_id = (select id from market_item where label = 'broken_hint')
  ),
  'hint without a secret is unavailable and does not debit');

insert into market_item (label, id)
values (
  'hint',
  public.marketplace_admin_save_item(
    (select id from market_fixture where label = 'admin'),
    null, 'hint', 'Borne', 'Explication', 30, 'published', '',
    null,
    (select id from market_fixture where label = 'challenge'),
    'La borne haute est exclue'
  )
);
do $$
begin
  perform public.marketplace_hint_content(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'hint')
  );
  raise exception 'ASSERTION FAILED: hint readable before purchase';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  public.marketplace_hint_content(
    (select id from market_fixture where label = 'admin'),
    (select id from market_item where label = 'hint')
  ) = 'La borne haute est exclue',
  'active admin reads a hint without owning it');
do $$
begin
  perform public.marketplace_hint_content(
    (select id from market_fixture where label = 'suspended'),
    (select id from market_item where label = 'hint')
  );
  raise exception 'ASSERTION FAILED: suspended user read a hint';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
delete from purchase_once;
insert into purchase_once
select * from public.purchase_marketplace_item(
  (select id from market_fixture where label = 'buyer'),
  (select id from market_item where label = 'hint')
);
select pg_temp.assert(
  (select credits_balance = 30 and already_owned = false
     and hint_content = 'La borne haute est exclue' from purchase_once),
  'hint purchase returns the secret and debits once');
select pg_temp.assert(
  public.marketplace_hint_content(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'hint')
  ) = 'La borne haute est exclue',
  'buyer reads the hint after purchase');

do $$
begin
  perform public.equip_marketplace_item(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'expensive')
  );
  raise exception 'ASSERTION FAILED: unowned item was equipped';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
select public.marketplace_admin_archive_item(
  (select id from market_fixture where label = 'admin'),
  (select id from market_item where label = 'cheap')
);
select pg_temp.assert(
  (select status = 'archived' from public.marketplace_items
    where id = (select id from market_item where label = 'cheap')),
  'admin archives the purchased icon');
select public.equip_marketplace_item(
  (select id from market_fixture where label = 'buyer'),
  (select id from market_item where label = 'cheap')
);
select pg_temp.assert(
  exists (
    select 1 from public.user_equipped_items
    where user_id = (select id from market_fixture where label = 'buyer')
      and slot = 'icon'
      and item_id = (select id from market_item where label = 'cheap')
  ),
  'owned archived icon can be equipped');
do $$
begin
  perform public.equip_marketplace_item(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'hint')
  );
  raise exception 'ASSERTION FAILED: hint was equipped';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
select public.unequip_marketplace_item(
  (select id from market_fixture where label = 'buyer'),
  'icon'
);
select pg_temp.assert(
  not exists (
    select 1 from public.user_equipped_items
    where user_id = (select id from market_fixture where label = 'buyer')
  ),
  'unequip removes the equipped icon');

insert into market_item (label, id)
values (
  'archived',
  public.marketplace_admin_save_item(
    (select id from market_fixture where label = 'admin'),
    null, 'icon', 'Retire', 'Archive', 15, 'archived', 'x',
    null, null, null
  )
);
do $$
begin
  perform * from public.purchase_marketplace_item(
    (select id from market_fixture where label = 'buyer'),
    (select id from market_item where label = 'archived')
  );
  raise exception 'ASSERTION FAILED: archived item was purchased';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'unavailable' then
    raise exception 'ASSERTION FAILED: expected unavailable, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  (select balance = 30 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer'))
  and not exists (
    select 1 from public.marketplace_purchases
    where item_id = (select id from market_item where label = 'archived')
  ),
  'archived item is unavailable and does not debit');

do $$
declare
  buyer_id uuid := (select id from market_fixture where label = 'buyer');
  admin_id uuid := (select id from market_fixture where label = 'admin');
  cheap_id uuid := (select id from market_item where label = 'cheap');
begin
  begin
    perform public.marketplace_admin_save_item(
      buyer_id, null, 'icon', 'Pirate', 'Non', 10, 'draft', '', null, null, null);
    raise exception 'ASSERTION FAILED: player saved an item';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.marketplace_admin_archive_item(buyer_id, cheap_id);
    raise exception 'ASSERTION FAILED: player archived an item';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.admin_grant_credits(buyer_id, admin_id, 10, 'no');
    raise exception 'ASSERTION FAILED: player granted credits';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform * from public.marketplace_admin_purchased_ids(buyer_id, array[cheap_id]);
    raise exception 'ASSERTION FAILED: player listed purchased ids';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
end;
$$;

do $$
declare
  admin_id uuid := (select id from market_fixture where label = 'admin');
  buyer_id uuid := (select id from market_fixture where label = 'buyer');
begin
  begin
    perform public.admin_grant_credits(admin_id, buyer_id, 0, 'zero');
    raise exception 'ASSERTION FAILED: zero grant succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.admin_grant_credits(admin_id, buyer_id, 10001, 'too much');
    raise exception 'ASSERTION FAILED: 10001 grant succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.admin_grant_credits(admin_id, buyer_id, 10, '');
    raise exception 'ASSERTION FAILED: empty reason succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.admin_grant_credits(admin_id, buyer_id, 10, '   ');
    raise exception 'ASSERTION FAILED: blank reason succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
  begin
    perform public.admin_grant_credits(admin_id, admin_id, 10, 'self');
    raise exception 'ASSERTION FAILED: admin self-grant succeeded';
  exception when sqlstate 'P0001' then
    if sqlerrm is distinct from 'forbidden' then
      raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
    end if;
  end;
end;
$$;
select pg_temp.assert(
  (select balance = 30 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer'))
  and not exists (
    select 1 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'admin')
  ),
  'rejected grants leave the buyer balance and create no admin wallet');

update public.credit_wallets
set balance = 995000
where user_id = (select id from market_fixture where label = 'buyer');
do $$
begin
  perform public.admin_grant_credits(
    (select id from market_fixture where label = 'admin'),
    (select id from market_fixture where label = 'buyer'),
    10000,
    'over the cap'
  );
  raise exception 'ASSERTION FAILED: grant crossed 1000000';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
select pg_temp.assert(
  (select balance = 995000 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer')),
  'grant that would pass 1000000 is refused before the update');
select pg_temp.assert(
  public.admin_grant_credits(
    (select id from market_fixture where label = 'admin'),
    (select id from market_fixture where label = 'buyer'),
    5000,
    'fill to cap'
  ) = 1000000,
  'grant up to exactly 1000000 is accepted');
do $$
begin
  perform public.admin_grant_credits(
    (select id from market_fixture where label = 'admin'),
    (select id from market_fixture where label = 'buyer'),
    1,
    'past the cap'
  );
  raise exception 'ASSERTION FAILED: grant past 1000000 succeeded';
exception when sqlstate 'P0001' then
  if sqlerrm is distinct from 'forbidden' then
    raise exception 'ASSERTION FAILED: expected forbidden, got %', sqlerrm;
  end if;
end;
$$;
do $$
begin
  update public.credit_wallets
  set balance = 1000001
  where user_id = (select id from market_fixture where label = 'buyer');
  raise exception 'ASSERTION FAILED: balance above 1000000 was stored';
exception when check_violation then
  null;
end;
$$;
select pg_temp.assert(
  (select balance = 1000000 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer')),
  'wallet check keeps the balance at the 1000000 ceiling');

delete from auth.users
where id = (select id from market_fixture where label = 'buyer');
select pg_temp.assert(
  not exists (
    select 1 from public.profiles
    where id = (select id from market_fixture where label = 'buyer')
  )
  and not exists (
    select 1 from public.credit_wallets
    where user_id = (select id from market_fixture where label = 'buyer')
  )
  and not exists (
    select 1 from public.marketplace_purchases
    where user_id = (select id from market_fixture where label = 'buyer')
  )
  and not exists (
    select 1 from public.credit_transactions
    where user_id = (select id from market_fixture where label = 'buyer')
  )
  and not exists (
    select 1 from public.user_equipped_items
    where user_id = (select id from market_fixture where label = 'buyer')
  )
  and exists (
    select 1 from public.marketplace_items
    where id = (select id from market_item where label = 'cheap')
  ),
  'deleting a buyer cascades wallet, purchases and ledger but keeps the item');

rollback;
\echo 'marketplace SQL assertions passed (fixtures rolled back)'
