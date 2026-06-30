# Supabase Setup

## 1. Drop existing tables

Supabase Dashboard → SQL Editor → run:

```sql
drop table if exists transactions cascade;
drop table if exists accounts cascade;
drop table if exists wa_sessions cascade;
drop table if exists users cascade;
```

## 2. Run schema

Paste entire `Supabase/schema.sql` into SQL Editor → Execute.

Creates:
- 4 tables (users, wa_sessions, accounts, transactions)
- 7 functions (auth + financial)
- RLS policies (service_role bypass)

## 3. Verify

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
```

Should show: accounts, transactions, users, wa_sessions

## 4. Get credentials

Settings → API:
- Copy **Project URL** → `SUPABASE_URL`
- Copy **service_role** key → `SUPABASE_KEY`

Paste ke `.env`.

Done.
