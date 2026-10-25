-- Optional original examples. Drafts only; no users, balances, hints or purchases.
begin;
insert into public.marketplace_items(id,kind,title,description,price_credits,status,preview,animation_key)
values
('a8b10000-0000-4000-8000-000000000001','icon','Terminal','Une icône de terminal pour votre profil.',40,'draft','>_',null),
('a8b10000-0000-4000-8000-000000000002','animation','Ligne de code','Une animation discrète à rejouer sur votre profil.',60,'draft','</>','scanline')
on conflict(id) do nothing;
commit;
