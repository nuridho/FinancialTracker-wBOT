-- ================================================================
-- FINANCIAL TRACKER BOT — Database Schema
-- Supabase (PostgreSQL)
-- ================================================================


-- ================================================================
-- EXTENSION
-- ================================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive text (untuk email)


-- ================================================================
-- TABLE: users
-- Identitas utama. 1 user = 1 orang.
-- Nomor WA tidak disimpan di sini — ada di wa_sessions.
-- ================================================================
create table if not exists users (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  email        citext      not null unique,
  is_verified  boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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


-- ================================================================
-- TABLE: wa_sessions
-- 1 user bisa punya beberapa nomor WA (HP hilang, HP backup).
-- Hanya 1 nomor aktif (is_active = true) dalam satu waktu.
-- ================================================================
create table if not exists wa_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) on delete cascade,
  wa_number    text        not null unique,           -- format: 628xxxxxxxxxx
  is_active    boolean     not null default true,
  auth_code    text,                                  -- kode verifikasi 6 digit (sementara)
  auth_expires timestamptz,                           -- expired dalam 10 menit
  last_seen    timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_wa_sessions_user_id   on wa_sessions (user_id);
create index if not exists idx_wa_sessions_wa_number on wa_sessions (wa_number);
create index if not exists idx_wa_sessions_active    on wa_sessions (user_id) where is_active = true;


-- ================================================================
-- TABLE: accounts (rekening)
-- Scope per user. BCA-ku != BCA-mu.
-- ================================================================
create table if not exists accounts (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references users(id) on delete cascade,
  name         text          not null,
  balance      numeric(15,3) not null default 0,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now(),

  unique (user_id, name)
);

create index if not exists idx_accounts_user_id on accounts (user_id);

create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function set_updated_at();


-- ================================================================
-- TABLE: transactions
-- trx_id = business key (human-readable, unique per user).
-- id uuid = true PK untuk join & FK.
-- amount pakai numeric(15,2) — support bulat & desimal.
-- ================================================================
create table if not exists transactions (
  id           uuid          primary key default gen_random_uuid(),
  trx_id       text          not null,
  user_id      uuid          not null references users(id) on delete cascade,
  type         text          not null check (type in ('INCOME', 'OUTCOME')),
  category     text          not null default 'Lainnya',
  amount       numeric(15,2) not null check (amount > 0),
  account_name text          not null,
  message      text,
  created_at   timestamptz   not null default now(),

  unique (user_id, trx_id)
);

create index if not exists idx_transactions_user_created on transactions (user_id, created_at desc);
create index if not exists idx_transactions_user_type    on transactions (user_id, type);
create index if not exists idx_transactions_user_cat     on transactions (user_id, category);


-- ================================================================
-- FUNCTION: upsert_account_balance
-- Atomic upsert saldo. Dipanggil via RPC dari Apps Script.
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
-- FUNCTION: get_user_by_wa
-- Lookup user dari nomor WA. Dipanggil tiap request masuk.
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


-- ================================================================
-- FUNCTION: generate_auth_code
-- Buat kode 6 digit, valid 10 menit. Kirim via WA ke user.
-- ================================================================
create or replace function generate_auth_code(p_wa_number text)
returns text
language plpgsql as $$
declare
  v_code text;
begin
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  update wa_sessions
  set auth_code    = v_code,
      auth_expires = now() + interval '10 minutes'
  where wa_number  = p_wa_number;
  return v_code;
end;
$$;


-- ================================================================
-- FUNCTION: verify_auth_code
-- Validasi kode. One-time use — dihapus setelah berhasil.
-- ================================================================
create or replace function verify_auth_code(p_wa_number text, p_code text)
returns boolean
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

  return coalesce(v_valid, false);
end;
$$;


-- ================================================================
-- ROW LEVEL SECURITY
-- service_role key (Apps Script) bypass semua policy.
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
-- VERIFIKASI
-- ================================================================
select tablename from pg_tables where schemaname = 'public' order by tablename;