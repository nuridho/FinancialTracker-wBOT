-- ================================================================
-- FINANCIAL TRACKER — Full Schema (drop-safe)
-- Run this in Supabase SQL Editor after dropping all tables
-- ================================================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ================================================================
-- TABLES
-- ================================================================

create table users (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  email        citext      not null unique,
  is_verified  boolean     not null default false,
  input_limit  integer     not null default 200,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table wa_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) on delete cascade,
  wa_number    text        not null unique,
  is_active    boolean     not null default false,
  auth_code    text,
  auth_expires timestamptz,
  last_seen    timestamptz,
  created_at   timestamptz not null default now()
);

create table accounts (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references users(id) on delete cascade,
  name         text          not null,
  balance      numeric(15,2) not null default 0,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now(),
  unique (user_id, name)
);

create table transactions (
  id           uuid          primary key default gen_random_uuid(),
  trx_id       text          not null,
  user_id      uuid          not null references users(id) on delete cascade,
  type         text          not null check (type in ('INCOME', 'OUTCOME', 'SWITCH')),
  category     text          not null default 'Lainnya',
  amount       numeric(15,2) not null check (amount > 0),
  account_name text          not null,
  message      text,
  created_at   timestamptz   not null default now(),
  unique (user_id, trx_id)
);

create table budgets (
  user_id  uuid          not null references users(id) on delete cascade,
  category text          not null,
  amount   numeric(15,2) not null check (amount > 0),
  primary key (user_id, category)
);

-- ================================================================
-- INDEXES
-- ================================================================

create index idx_wa_sessions_user_id   on wa_sessions (user_id);
create index idx_wa_sessions_wa_number on wa_sessions (wa_number);
create index idx_wa_sessions_active    on wa_sessions (user_id) where is_active = true;
create index idx_accounts_user_id      on accounts (user_id);
create index idx_trx_user_created      on transactions (user_id, created_at desc);
create index idx_trx_user_type         on transactions (user_id, type);
create index idx_trx_user_cat          on transactions (user_id, category);
create index idx_budgets_user_id       on budgets (user_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function set_updated_at();

-- ================================================================
-- FUNCTIONS — Financial
-- ================================================================

create or replace function upsert_account_balance(
  p_user_id  uuid,
  p_name     text,
  p_delta    numeric
)
returns numeric
language plpgsql as $$
declare
  v_new_balance numeric;
begin
  insert into accounts (user_id, name, balance)
  values (p_user_id, p_name, p_delta)
  on conflict (user_id, name) do update
    set balance    = accounts.balance + p_delta,
        updated_at = now()
  returning balance into v_new_balance;
  return v_new_balance;
end;
$$;

-- ================================================================
-- FUNCTIONS — Auth
-- ================================================================

create or replace function get_user_by_wa(p_wa_number text)
returns table (
  user_id     uuid,
  name        text,
  email       citext,
  is_verified boolean,
  session_id  uuid,
  is_active   boolean
)
language sql stable as $$
  select
    u.id, u.name, u.email, u.is_verified,
    w.id as session_id, w.is_active
  from wa_sessions w
  join users u on u.id = w.user_id
  where w.wa_number = p_wa_number
  limit 1;
$$;

create or replace function create_or_get_user_by_email(p_email citext)
returns table (id uuid)
language plpgsql as $$
begin
  insert into users (email, name, is_verified)
  values (p_email, split_part(p_email, '@', 1), false)
  on conflict (email) do nothing;
  return query select users.id from users where email = p_email limit 1;
end;
$$;

create or replace function upsert_wa_session(p_user_id uuid, p_wa_number text)
returns void
language plpgsql as $$
begin
  insert into wa_sessions (user_id, wa_number, is_active)
  values (p_user_id, p_wa_number, false)
  on conflict (wa_number) do update
    set user_id = p_user_id;
end;
$$;

create or replace function mark_user_verified(p_user_id uuid)
returns void
language plpgsql as $$
begin
  update users set is_verified = true where id = p_user_id;
end;
$$;

create or replace function generate_auth_code(p_wa_number text)
returns table (code text)
language plpgsql as $$
declare
  v_code text;
begin
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  update wa_sessions
  set auth_code    = v_code,
      auth_expires = now() + interval '10 minutes'
  where wa_number  = p_wa_number;
  return query select v_code;
end;
$$;

create or replace function verify_auth_code(p_wa_number text, p_code text)
returns table (success boolean)
language plpgsql as $$
declare
  v_valid boolean;
begin
  select (auth_code = p_code and auth_expires > now())
  into v_valid
  from wa_sessions
  where wa_number = p_wa_number;

  if v_valid then
    update wa_sessions
    set auth_code    = null,
        auth_expires = null,
        is_active    = true,
        last_seen    = now()
    where wa_number  = p_wa_number;
  end if;

  return query select coalesce(v_valid, false);
end;
$$;

create or replace function resync_balances(p_user_id uuid)
returns void
language plpgsql as $$
begin
  update accounts a
  set balance    = coalesce((
        select sum(
          case
            when t.type = 'INCOME'                            then  t.amount
            when t.type = 'OUTCOME'                           then -t.amount
            -- ponytail: SWITCH uses -TO suffix: -TO leg = money in, non-TO = money out
            when t.type = 'SWITCH' and t.trx_id like '%-TO'  then  t.amount
            when t.type = 'SWITCH'                            then -t.amount
            else 0
          end
        )
        from transactions t
        where t.user_id = p_user_id and t.account_name = a.name
      ), 0),
      updated_at = now()
  where a.user_id = p_user_id;
end;
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table users        enable row level security;
alter table wa_sessions  enable row level security;
alter table accounts     enable row level security;
alter table transactions enable row level security;

create policy "service_role all users"        on users        for all using (true) with check (true);
create policy "service_role all wa_sessions"  on wa_sessions  for all using (true) with check (true);
create policy "service_role all accounts"     on accounts     for all using (true) with check (true);
create policy "service_role all transactions" on transactions for all using (true) with check (true);

-- ================================================================
-- GRANTS
-- ================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
