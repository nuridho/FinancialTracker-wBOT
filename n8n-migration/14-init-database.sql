-- ================================================================
-- 14 — INISIASI DATABASE LENGKAP (Git Finance → n8n)
--
-- Satu file untuk menyiapkan SELURUH database di Supabase:
-- schema lama (finance-service/Supabase/schema.sql) + 2 tabel baru
-- untuk n8n (rate_limits & insight_cache).
--
-- CARA PAKAI: copy seluruh isi file ini → Supabase SQL Editor → Run.
--
-- AMAN DIJALANKAN ULANG: semua perintah pakai "if not exists" /
-- "or replace", jadi kalau tabelnya sudah ada TIDAK dibuat ulang dan
-- DATA TIDAK TERHAPUS. Boleh di-run di project yang sudah berisi data.
-- ================================================================


-- ================================================================
-- BAGIAN 1: EXTENSIONS
-- Fitur tambahan PostgreSQL yang dipakai schema ini.
-- ================================================================

-- pgcrypto: menyediakan gen_random_uuid() — pembuat ID unik acak
create extension if not exists pgcrypto;
-- citext: tipe teks yang tidak peduli huruf besar/kecil.
-- Dipakai untuk email, supaya "Budi@gmail.com" = "budi@gmail.com"
create extension if not exists citext;


-- ================================================================
-- BAGIAN 2: TABEL
-- ================================================================

-- ── users: satu baris = satu orang pengguna bot ──────────────────
create table if not exists users (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,               -- diambil dari bagian depan email saat daftar
  email        citext      not null unique,        -- kunci identitas; case-insensitive
  is_verified  boolean     not null default false, -- true setelah verifikasi email sukses
  input_limit  integer     not null default 200,   -- batas transaksi per periode gajian (freemium);
                                                   -- "premium" = tinggal naikkan angka ini per user
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── wa_sessions: menghubungkan nomor WhatsApp ke user ────────────
-- Satu nomor WA hanya boleh terikat ke satu user (wa_number unique).
create table if not exists wa_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) on delete cascade,
  wa_number    text        not null unique,
  is_active    boolean     not null default false, -- true setelah kode verifikasi benar
  auth_code    text,                               -- kode 6 digit sementara (di-null-kan setelah dipakai)
  auth_expires timestamptz,                        -- kode kadaluarsa 10 menit setelah dibuat
  last_seen    timestamptz,
  created_at   timestamptz not null default now()
);

-- ── accounts: rekening/dompet user (BCA, GoPay, Cash, dll) ───────
-- Rekening dibuat OTOMATIS saat pertama kali disebut di chat —
-- user tidak perlu mendaftarkan rekening dulu.
create table if not exists accounts (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references users(id) on delete cascade,
  name         text          not null,
  balance      numeric(15,2) not null default 0,   -- numeric (bukan float!) supaya hitungan uang
                                                   -- tidak kena error pembulatan komputer
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now(),
  unique (user_id, name)                           -- satu user tidak bisa punya 2 rekening bernama sama;
                                                   -- juga kunci kerja upsert_account_balance di bawah
);

-- ── transactions: semua catatan uang ─────────────────────────────
create table if not exists transactions (
  id           uuid          primary key default gen_random_uuid(),
  trx_id       text          not null,             -- ID ramah-manusia, format TRX-XXXXXXXXXXXX
  user_id      uuid          not null references users(id) on delete cascade,
  type         text          not null check (type in ('INCOME', 'OUTCOME', 'SWITCH')),
                                                   -- INCOME = uang masuk, OUTCOME = keluar,
                                                   -- SWITCH = pindah antar rekening sendiri
                                                   -- (tidak dihitung di rekap & input limit)
  category     text          not null default 'Lainnya',
  amount       numeric(15,2) not null check (amount > 0),
                                                   -- selalu positif; arah uang ditentukan kolom type,
                                                   -- bukan tanda minus
  account_name text          not null,             -- nama rekening sebagai teks (bukan foreign key) —
                                                   -- konsekuensi desain "rekening otomatis"
  message      text,                               -- pesan WA asli, untuk audit/telusur
  created_at   timestamptz   not null default now(),
  unique (user_id, trx_id)
);
-- Catatan SWITCH: transfer antar rekening sendiri = 2 baris SWITCH.
-- Baris tujuan diberi akhiran "-TO" di trx_id (misal TRX-AB12-TO).
-- Akhiran itulah penanda arah uang saat resync/undo.

-- ── budgets: budget per kategori per user ────────────────────────
create table if not exists budgets (
  user_id  uuid          not null references users(id) on delete cascade,
  category text          not null,
  amount   numeric(15,2) not null check (amount > 0),
  primary key (user_id, category)                  -- satu budget per kategori per user
);

-- ── rate_limits: BARU untuk n8n ──────────────────────────────────
-- Pengganti rate limiter in-memory di finance-service.
-- Kenapa perlu: n8n tidak punya "ingatan" antar eksekusi workflow,
-- jadi hitungan "berapa kali user minta email dalam 1 menit"
-- harus disimpan di database, bukan di RAM.
create table if not exists rate_limits (
  key        text primary key,          -- contoh: 'email:628123456789' / 'verify:628123456789'
  count      int  not null default 0,   -- sudah berapa kali dalam jendela waktu ini
  reset_at   timestamptz not null       -- kapan hitungan di-reset
);

-- ── insight_cache: BARU untuk n8n ────────────────────────────────
-- Pengganti cache AI insight in-memory (TTL 1 jam).
-- Rekap pertama per periode memanggil AI (lambat, 5-30 detik);
-- hasilnya disimpan di sini supaya rekap berikutnya instan.
create table if not exists insight_cache (
  cache_key  text primary key,          -- format: userId:tanggalMulai:tanggalAkhir
  insight    text not null,             -- kalimat insight dari AI
  expires_at timestamptz not null       -- diset now() + 1 jam saat menyimpan
);


-- ================================================================
-- BAGIAN 3: INDEX
-- "Daftar isi" internal supaya pencarian cepat. Setiap index di sini
-- melayani pola query nyata yang dipakai bot — tidak ada yang spekulatif.
-- ================================================================

create index if not exists idx_wa_sessions_user_id   on wa_sessions (user_id);
create index if not exists idx_wa_sessions_wa_number on wa_sessions (wa_number);       -- lookup tiap pesan masuk
create index if not exists idx_wa_sessions_active    on wa_sessions (user_id) where is_active = true;
create index if not exists idx_accounts_user_id      on accounts (user_id);
create index if not exists idx_trx_user_created      on transactions (user_id, created_at desc); -- riwayat terbaru, undo
create index if not exists idx_trx_user_type         on transactions (user_id, type);            -- rekap per tipe
create index if not exists idx_trx_user_cat          on transactions (user_id, category);        -- budget per kategori
create index if not exists idx_budgets_user_id       on budgets (user_id);


-- ================================================================
-- BAGIAN 4: TRIGGER
-- Otomatis mengisi kolom updated_at setiap kali baris di-update,
-- supaya aplikasi tidak perlu (dan tidak bisa lupa) mengisinya.
-- ================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- drop dulu supaya file ini aman dijalankan ulang
-- (PostgreSQL tidak punya "create trigger if not exists")
drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_accounts_updated_at on accounts;
create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function set_updated_at();


-- ================================================================
-- BAGIAN 5: FUNGSI KEUANGAN
-- Operasi uang ditaruh DI DALAM database (bukan di aplikasi/n8n)
-- supaya atomik: semua langkah sukses bersama atau batal bersama.
-- Tidak ada kondisi "saldo setengah berubah" kalau ada crash.
-- ================================================================

-- ── upsert_account_balance: tambah/kurangi saldo secara atomik ───
-- Kalau rekening belum ada → dibuat dengan saldo = delta.
-- Kalau sudah ada → saldo ditambah delta (delta boleh negatif).
-- Dua pesan yang masuk bersamaan tidak akan saling menimpa.
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

-- ── resync_balances: hitung ulang semua saldo dari riwayat ───────
-- "Tombol darurat" kalau saldo tidak sinkron: saldo tiap rekening
-- dihitung ulang murni dari tabel transactions.
-- Dipicu user dengan pesan "resync" / "sync saldo".
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
            -- SWITCH pakai akhiran -TO: -TO = uang masuk, tanpa -TO = uang keluar
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

-- ── delete_transaction_with_rollback: hapus + balikkan saldo ─────
-- Dipakai fitur "undo" dan "hapus TRX-XXXX". Dalam SATU transaksi DB:
--   1. cari transaksinya (tidak ketemu → return kosong)
--   2. kembalikan saldo (kebalikan dari efek transaksi)
--   3. kalau SWITCH: cari & hapus pasangannya (leg -TO) + balikkan saldonya juga
--   4. hapus baris transaksi
-- Crash di tengah = SEMUA batal — tidak mungkin saldo terbalikkan
-- tapi transaksi masih ada (atau sebaliknya).
create or replace function delete_transaction_with_rollback(
  p_user_id uuid,
  p_trx_id  text
)
returns table (
  trx_id       text,
  type         text,
  category     text,
  amount       numeric,
  account_name text
)
language plpgsql as $$
declare
  v_trx       record;
  v_paired    record;
  v_paired_id text;
  v_delta     numeric;
begin
  select * into v_trx
  from transactions
  where user_id = p_user_id and trx_id = p_trx_id
  limit 1;

  if not found then
    return;  -- transaksi tidak ada → hasil kosong, pemanggil yang balas "tidak ditemukan"
  end if;

  -- cari pasangan leg untuk SWITCH / kategori Transfer
  if v_trx.type = 'SWITCH' or v_trx.category = 'Transfer' then
    v_paired_id := case
      when v_trx.trx_id like '%-TO' then left(v_trx.trx_id, length(v_trx.trx_id) - 3)
      else v_trx.trx_id || '-TO'
    end;
    select * into v_paired
    from transactions
    where user_id = p_user_id and trx_id = v_paired_id
    limit 1;
  end if;

  -- balikkan saldo leg utama (kebalikan arah transaksi aslinya)
  v_delta := case
    when v_trx.type = 'SWITCH' and v_trx.trx_id like '%-TO' then -v_trx.amount
    when v_trx.type = 'SWITCH'                               then  v_trx.amount
    when v_trx.type = 'INCOME'                               then -v_trx.amount
    else                                                           v_trx.amount
  end;
  perform upsert_account_balance(p_user_id, v_trx.account_name, v_delta);

  -- balikkan saldo + hapus pasangan SWITCH (kalau ada)
  if v_paired.trx_id is not null then
    v_delta := case
      when v_paired.trx_id like '%-TO' then -v_paired.amount
      else                                   v_paired.amount
    end;
    perform upsert_account_balance(p_user_id, v_paired.account_name, v_delta);
    delete from transactions where user_id = p_user_id and trx_id = v_paired.trx_id;
  end if;

  delete from transactions where user_id = p_user_id and trx_id = v_trx.trx_id;

  return query select v_trx.trx_id, v_trx.type, v_trx.category, v_trx.amount, v_trx.account_name;
end;
$$;


-- ================================================================
-- BAGIAN 6: FUNGSI AUTH
-- Alur pendaftaran 3 langkah via chat WA (detail: 04-auth.md).
-- ================================================================

-- ── get_user_by_wa: dipanggil SETIAP pesan masuk ─────────────────
-- Nomor WA → siapa user-nya + sudah verified atau belum.
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

-- ── create_or_get_user_by_email: langkah daftar ──────────────────
-- Email belum terdaftar → buat user baru (nama = bagian depan email).
-- Sudah terdaftar → kembalikan user yang ada. Tidak pernah duplikat.
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

-- ── upsert_wa_session: ikat nomor WA ke user ─────────────────────
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

-- ── mark_user_verified ───────────────────────────────────────────
create or replace function mark_user_verified(p_user_id uuid)
returns void
language plpgsql as $$
begin
  update users set is_verified = true where id = p_user_id;
end;
$$;

-- ── generate_auth_code: buat kode verifikasi 6 digit ─────────────
-- Kode disimpan di wa_sessions, kadaluarsa 10 menit.
-- Kode dikirim ke email user via Resend (oleh workflow n8n).
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

-- ── verify_auth_code: cek kode + aktifkan sesi ───────────────────
-- Kode benar & belum kadaluarsa → sesi aktif, kode DIHAPUS
-- (sekali pakai — kode yang sama tidak bisa dipakai dua kali).
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

-- ── check_rate_limit: BARU untuk n8n — anti spam/brute-force ─────
-- Satu panggilan atomik: catat percobaan + jawab boleh/tidak.
-- Return TRUE  = masih boleh (di bawah batas) → workflow lanjut
-- Return FALSE = kena limit → workflow balas "coba lagi nanti"
-- Pemakaian di n8n:
--   minta email : check_rate_limit('email:'  || nomorWA, 3)  → maks 3x/menit
--   coba verify : check_rate_limit('verify:' || nomorWA, 5)  → maks 5x/menit
create or replace function check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int default 60
) returns boolean
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  insert into rate_limits (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    -- jendela waktu sudah lewat → mulai hitung dari 1 lagi;
    -- belum lewat → tambah hitungan
    count    = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
    reset_at = case when rate_limits.reset_at < now()
                    then now() + make_interval(secs => p_window_seconds)
                    else rate_limits.reset_at end
  returning count <= p_max into v_allowed;
  return v_allowed;
end;
$$;
-- ponytail: baris kadaluarsa dibiarkan (tabel kecil, tertimpa saat key
-- yang sama dipakai lagi). Tambah pg_cron cleanup kalau beneran membengkak.


-- ================================================================
-- BAGIAN 7: ROW LEVEL SECURITY (RLS)
-- RLS = penjaga di level baris data. Saat ini policy-nya permisif
-- (boleh semua) karena SATU-SATUNYA yang mengakses DB adalah
-- server/n8n dengan service_role key (kunci penuh).
--
-- ⚠️ PENTING: sebelum aplikasi mobile menyentuh database langsung
-- dengan anon key, policy di bawah WAJIB diganti policy per-user
-- ("user hanya boleh lihat barisnya sendiri") — lihat 10-mobile-apps.md.
-- ================================================================

alter table users        enable row level security;
alter table wa_sessions  enable row level security;
alter table accounts     enable row level security;
alter table transactions enable row level security;
alter table rate_limits  enable row level security;
alter table insight_cache enable row level security;
alter table budgets      enable row level security;

-- drop dulu supaya aman dijalankan ulang
drop policy if exists "service_role all users"         on users;
drop policy if exists "service_role all wa_sessions"   on wa_sessions;
drop policy if exists "service_role all accounts"      on accounts;
drop policy if exists "service_role all transactions"  on transactions;
drop policy if exists "service_role all budgets"       on budgets;
drop policy if exists "service_role all rate_limits"   on rate_limits;
drop policy if exists "service_role all insight_cache" on insight_cache;

create policy "service_role all users"         on users         for all using (true) with check (true);
create policy "service_role all wa_sessions"   on wa_sessions   for all using (true) with check (true);
create policy "service_role all accounts"      on accounts      for all using (true) with check (true);
create policy "service_role all transactions"  on transactions  for all using (true) with check (true);
create policy "service_role all budgets"       on budgets       for all using (true) with check (true);
create policy "service_role all rate_limits"   on rate_limits   for all using (true) with check (true);
create policy "service_role all insight_cache" on insight_cache for all using (true) with check (true);


-- ================================================================
-- BAGIAN 8: GRANTS (hak akses per jenis kunci Supabase)
-- service_role (dipakai n8n) = akses penuh.
-- anon & authenticated baru relevan nanti saat mobile app masuk.
-- ================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- ================================================================
-- SELESAI. Cek cepat: jalankan
--   select tablename from pg_tables where schemaname = 'public';
-- harus muncul 7 tabel: users, wa_sessions, accounts, transactions,
-- budgets, rate_limits, insight_cache.
-- ================================================================
