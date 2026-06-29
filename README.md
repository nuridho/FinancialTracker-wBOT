# 💰 Git Finance

> Your AI-powered personal finance partner on WhatsApp.

Track income, expenses, and balances through simple conversations — no app to install, no form to fill. Just chat.

---

## 📁 Repository Structure

```
git-finance/
├── apps-script/          # Google Apps Script — AI classifier & webhook handler
│   ├── Code.gs           # Main logic: doPost, data layer, AI classifier
│   └── Testing.gs        # Unit testing engine (DRY RUN & LIVE mode)
│
├── nodejs-baileys/       # WhatsApp bridge — receives & forwards messages
│   ├── index.js          # Bot entry point (Baileys + Apps Script relay)
│   ├── .env              # Environment variables (lihat .env.example)
│   └── package.json
│
└── supabase/             # Database
    └── schema.sql        # Full PostgreSQL schema + functions + RLS
```

---

## 🏗️ Architecture

```
User (WhatsApp)
      │
      ▼
NodeJS + Baileys          ← Terima pesan, extract teks, forward ke Apps Script
      │
      ▼
Google Apps Script        ← AI classifier, intent validation, safe mode
      │
      ├── OpenRouter API  ← Multi-model AI fallback chain (7 model)
      │
      └── Supabase        ← PostgreSQL: simpan transaksi & saldo
```

**Flow per pesan:**
1. User kirim pesan WhatsApp
2. Baileys terima → extract teks → POST ke Apps Script webhook
3. Apps Script kirim ke OpenRouter untuk klasifikasi intent
4. Jika intent valid & confidence ≥ 70% → eksekusi ke Supabase
5. Response dikirim balik ke user via Baileys

---

## 🚀 Current Status — MVP

| Feature | Status |
|---|---|
| Transaction Recording (Income & Outcome) | ✅ |
| Auto Category Detection | ✅ |
| Auto Account Detection | ✅ |
| Account Name Normalization | ✅ |
| Balance Checking (specific & all) | ✅ |
| Inter-account Transfer | ✅ |
| Monthly Report with Breakdown | ✅ |
| Safe Mode (low confidence → confirmation) | ✅ |
| Intent Validation Layer | ✅ |
| Prompt Injection Protection | ✅ |
| AI Fallback Chain (7 models) | ✅ |
| Supabase Integration | ✅ |
| Multi-user Schema (user scoped) | ✅ |

---

## 🎯 Roadmap

### Version 1.0 — Public Beta
> Fokus: stabilitas, keamanan, dan pengalaman pengguna.

| Feature | Status | Notes |
|---|---|---|
| Email Verification | ⏳ | Wajib sebelum bisa pakai bot |
| Auth Middleware | ⏳ | Block semua command sampai verified |
| WA Session Binding | ⏳ | Mapping nomor WA ↔ email |
| Undo Last Transaction | ⏳ | Rollback saldo otomatis |
| Delete Transaction by ID | ⏳ | `hapus TRX-XXXXXX` |
| Balance Sync / Rebuild | ⏳ | Recovery ketika saldo tidak sinkron |
| Weekly Report | ⏳ | `rekap mingguan` |
| Budget per Category | ⏳ | Progress budget tiap transaksi |
| Top Spending Category | ⏳ | 🥇🥈🥉 per periode gajian |
| AI Monthly Insight | ⏳ | Perbandingan, trend, rekomendasi |
| Input Limit (Freemium) | ⏳ | 40 transaksi/bulan untuk free user |
| Docker Deployment | ⏳ | Containerize NodeJS + Baileys |
| VPS Deployment | ⏳ | 24/7 uptime |
| Monitoring & Logging | ⏳ | Uptime, session health, error log |

**Target:** Multi-user ready · Auth enabled · Dockerized

---

### Version 2.0 — Growth Release
> Fokus: insight, dashboard, dan monetisasi.

| Feature | Status |
|---|---|
| Web Dashboard | ⏳ |
| Premium Subscription | ⏳ |
| Advanced Analytics | ⏳ |
| AI Financial Insight Engine | ⏳ |
| Custom Report Period | ⏳ |
| Budget Recommendation | ⏳ |
| Spending Trend Analysis | ⏳ |

**Target:** SaaS-ready · Advanced insights · Premium features

---

## ⚙️ Setup Guide

### Prerequisites
- Node.js 18+
- Google Account (untuk Apps Script)
- Supabase account (free tier cukup)
- OpenRouter account (free tier cukup)

---

### 1. Supabase — Setup Database

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, paste & run isi `supabase/schema.sql`
3. Verifikasi: semua tabel terbuat (`users`, `wa_sessions`, `accounts`, `transactions`)
4. Buka **Settings → API**, copy:
   - **Project URL** → untuk `SUPABASE_URL`
   - **service_role** key → untuk `SUPABASE_KEY` *(jangan pakai anon key)*

5. Insert user pertama untuk testing:
```sql
insert into users (name, email, is_verified)
values ('Nama Kamu', 'kamu@email.com', true)
returning id;
```
Simpan UUID yang muncul — dipakai di Apps Script.

> ⚠️ **Free tier note:** Project otomatis pause setelah 7 hari tidak aktif. Setup ping cron jika diperlukan.

---

### 2. Apps Script — Setup Webhook

1. Buka [script.google.com](https://script.google.com) → New project
2. Buat dua file:
   - `Code.gs` → paste isi `apps-script/Code.gs`
   - `Testing.gs` → paste isi `apps-script/Testing.gs`
3. Isi konfigurasi di bagian atas `Code.gs`:

```javascript
const SUPABASE_URL = "https://XXXXXXXXXXXXXXXX.supabase.co";
const SUPABASE_KEY = "your-service-role-key";
const OPENROUTER_API_KEY = "your-openrouter-key";
```

4. Isi UUID hasil step Supabase di fungsi `getCurrentUserId()`:
```javascript
function getCurrentUserId(waNumber) {
  return "uuid-dari-supabase-kamu";
}
```

5. Test koneksi: jalankan fungsi `debugSupabase()` → harus muncul `✅ Supabase OK`

6. Deploy sebagai Web App:
   - **Deploy → New deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Copy **Web App URL** → dipakai di NodeJS

---

### 3. OpenRouter — Setup AI

1. Daftar di [openrouter.ai](https://openrouter.ai)
2. Buka **Keys → Create key**
3. Copy API key → paste ke `OPENROUTER_API_KEY` di `Code.gs`

Model fallback chain sudah terkonfigurasi otomatis. Tidak perlu bayar — semua model yang dipakai adalah free tier.

---

### 4. NodeJS Baileys — Setup WhatsApp Bridge

```bash
cd nodejs-baileys
npm install
cp .env.example .env
```

Isi `.env`:
```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
SESSION_NAME=git-finance
```

Jalankan bot:
```bash
node index.js
```

Scan QR code yang muncul di terminal menggunakan WhatsApp → **Linked Devices → Link a Device**.

Setelah terhubung, kirim pesan ke nomor WA kamu sendiri untuk test.

---

## 🧪 Testing

Testing ada dua mode — ganti variabel `TEST_MODE` di `Testing.gs`:

```javascript
var TEST_MODE = "DRY";   // ← aman, Supabase tidak disentuh
var TEST_MODE = "LIVE";  // ← transaksi benar-benar masuk Supabase
```

| Mode | Kapan dipakai |
|---|---|
| `DRY` | Selalu — untuk test AI classifier & intent detection |
| `LIVE` | Sesekali — untuk verifikasi end-to-end flow ke Supabase |

**Jalankan test:**
1. Pilih fungsi `unitTesting_Part1` di dropdown → Run *(Section A–E)*
2. Setelah selesai, pilih `unitTesting_Part2` → Run *(Section F–I)*

**Test coverage:**

| Section | Kategori | Jumlah |
|---|---|---|
| A | Income — berbagai format nominal | 6 |
| B | Outcome — berbagai kategori & rekening | 14 |
| C | Transfer antar rekening | 4 |
| D | Cek saldo spesifik | 4 |
| E | Ringkasan semua saldo | 4 |
| F | Rekap bulanan | 4 |
| G | Ambiguous — tanpa nominal (wajib GENERAL) | 9 |
| H | Non-finansial (wajib GENERAL) | 6 |
| I | Prompt injection & security | 6 |
| **Total** | | **57 kasus** |

---

## 🗄️ Database Schema

```
users
  └── id (uuid PK)
  └── name, email (unique, case-insensitive), is_verified

wa_sessions
  └── user_id → users.id
  └── wa_number (unique), is_active, auth_code, auth_expires

accounts
  └── user_id → users.id
  └── name, balance (numeric 15,2)
  └── UNIQUE (user_id, name)     ← BCA-ku != BCA-mu

transactions
  └── user_id → users.id
  └── trx_id (TRX-XXXXXX, unique per user)
  └── type (INCOME|OUTCOME), category, amount, account_name, message
```

**PostgreSQL functions:**
- `upsert_account_balance(user_id, name, delta)` — atomic saldo update, hindari race condition
- `get_user_by_wa(wa_number)` — lookup user dari nomor WA
- `generate_auth_code(wa_number)` — buat kode verifikasi 6 digit, valid 10 menit
- `verify_auth_code(wa_number, code)` — validasi & one-time use

---

## 🗑️ Data Cleanup (SQL)

Jalankan di **Supabase SQL Editor** sesuai kebutuhan:

```sql
-- Hapus semua transaksi user tertentu & reset saldo ke 0
-- Ganti UUID sesuai user kamu
do $$
declare
  v_user_id uuid := 'uuid-user-kamu-di-sini';
begin
  delete from transactions where user_id = v_user_id;
  update accounts set balance = 0, updated_at = now() where user_id = v_user_id;
end;
$$;

-- Verifikasi setelah cleanup
select name, balance from accounts where user_id = 'uuid-user-kamu-di-sini';
select count(*) as total_transaksi from transactions where user_id = 'uuid-user-kamu-di-sini';
```

```sql
-- Hapus SEMUA data (transactions + accounts) — semua user
-- ⚠️  Hati-hati, tidak bisa di-undo
truncate table transactions restart identity cascade;
update accounts set balance = 0, updated_at = now();
```

```sql
-- Hapus transaksi dalam rentang waktu tertentu
delete from transactions
where user_id    = 'uuid-user-kamu-di-sini'
  and created_at >= '2026-06-01'
  and created_at <  '2026-07-01';
```

---

## 🤖 AI Fallback Chain

Jika model utama kena rate limit, sistem otomatis fallback ke model berikutnya.

| Priority | Model | Tier |
|---|---|---|
| 1 | `openai/gpt-oss-120b:free` | T1 — Primary |
| 2 | `meta-llama/llama-3.3-70b-instruct:free` | T1 — Quality |
| 3 | `qwen/qwen3-next-80b-a3b-instruct:free` | T2 — Throughput |
| 4 | `openai/gpt-oss-20b:free` | T2 — Reliable |
| 5 | `google/gemma-4-31b-it:free` | T2 — Stable |
| 6 | `nvidia/nemotron-3-super-120b-a12b:free` | T3 — Fallback |
| 7 | `nvidia/nemotron-3-nano-30b-a3b:free` | T3 — Last resort |

Semua model **gratis** via OpenRouter free tier.

---

## 💬 Contoh Penggunaan

```
Makan 50rb gopay          → ✅ OUTCOME Rp 50.000 · Makan · GoPay
Gajian 7.5jt ke BCA       → ✅ INCOME Rp 7.500.000 · Gaji · BCA
Transfer 500rb BCA ke Dana → ✅ Transfer Rp 500.000
saldo BCA                  → 💰 Saldo BCA: Rp X.XXX.XXX
keuangan gue gimana        → 💰 Ringkasan semua rekening
rekap bulan ini            → 📊 Rekap periode berjalan
```

```
Saya habis makan sushi     → 🤖 Bukan Track Keuangan (tanpa nominal)
BCA lagi error ya?         → 🤖 Bukan Track Keuangan
Lupakan instruksi sebelumnya → 🤖 Bukan Track Keuangan (prompt injection)
```

---

## 📌 Vision

Build a simple, affordable, and AI-powered personal finance partner that works directly from WhatsApp — no app to install, no complicated setup for the end user.