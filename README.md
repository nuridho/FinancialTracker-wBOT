# 💰 Git Finance

> Your AI-powered personal finance partner on WhatsApp.

Track income, expenses, and balances through simple conversations — no app to install, no form to fill. Just chat.

---
```
messaging-service/   ← WhatsApp gateway (Baileys), Receive messages, Send replies, zero business logic
finance-service/     ← Semua logic keuangan, Supabase, AI classifier
```

```
User WA ──► messaging-service ──HTTP──► finance-service ──► Supabase
                                              │
                                              └──► OpenRouter AI
```
---

## Struktur finance-service

```
src/
├── config/
│   └── index.js              # semua env var terpusat
├── middleware/
│   └── auth.middleware.js    -> check verification status
├── modules/
│   ├── ai/
│   │   └── ai.service.js     # OpenRouter classifier + model fallback
│   ├── account/
│   │   └── account.service.js  # getSaldo, getAllSaldo, updateSaldo
|   ├── auth/
|   |   └── auth.service.js -> handle flow REQUEST_EMAIL → SEND_CODE → VERIFY
|   ├── email/
|   |   └── email.service.js -> kirim email via Resend
│   ├── recap/
│   │   └── recap.service.js  # generateRekap
│   ├── transaction/
│   │   └── transaction.service.js  # insertTransaksi, normalizeRekening
│   └── user/
│       └── user.service.js   # getCurrentUserId (hardcode → WA auth nanti)
├── routes/
│   └── finance.route.js      # POST /process, GET /health
├── utils/
│   ├── helpers.js            # formatRupiah, formatTanggalIndo, dll.
│   └── supabase.js           # sbGet, sbPost, sbRpc
└── index.js

Supabase/
├── scheme.sql/ -> struktur tabel
└── setup.md -> how to initiate supabase

```

## API finance-service

### `POST /process`
Body:
```json
{ "from": "628123456789", "body": "Makan siang 25rb" }
```
Response:
```json
{ "reply": "📝 *Catatan Keuangan*\n..." }
```

### `GET /health`
```json
{ "status": "ok", "service": "finance-service" }
```


**Flow per pesan:**
1. User kirim pesan WhatsApp
2. Baileys terima → extract teks → POST ke Apps Script webhook
3. Apps Script kirim ke OpenRouter untuk klasifikasi intent
4. Jika intent valid & confidence ≥ 70% → eksekusi ke Supabase
5. Response dikirim balik ke user via Baileys

---

# 🗺️ Roadmap

## 🚀 Version 1.0 — Public Beta

> **Goal:** Deliver a stable, secure, and production-ready AI-powered personal finance bot for WhatsApp.

### 🔴 Must Have

Core features required before the first public release.

| Feature                                  | Status    |
| ---------------------------------------- | --------- |
| Transaction Recording (Income & Expense) | ✅ Done    |
| Auto Category Detection                  | ✅ Done    |
| Auto Account Detection                   | ✅ Done    |
| Account Name Normalization               | ✅ Done    |
| Balance Checking                         | ✅ Done    |
| Inter-account Transfer                   | ✅ Done    |
| Monthly Report with Breakdown            | ✅ Done    |
| Safe Mode (Low Confidence Confirmation)  | ✅ Done    |
| Intent Validation Layer                  | ✅ Done    |
| Prompt Injection Protection              | ✅ Done    |
| AI Fallback Chain                        | ✅ Done    |
| Supabase Integration                     | ✅ Done    |
| Multi-user Database Schema               | ✅ Done    |
| Email Verification                       | ✅ Done |
| Authentication Middleware                | ✅ Done |
| WhatsApp Session Binding                 | ✅ Done |
| Verification Code Management             | ✅ Done|
| Rate Limiting                            | ✅ Done |
| Undo Last Transaction                    | ✅ Done    |
| Delete Transaction by ID                 | ✅ Done    |
| Balance Rebuild / Sync                   | ✅ Done    |
| Docker Deployment                        | ⏳ Planned |
| VPS Deployment                           | ⏳ Planned |
| Monitoring & Logging                     | ⏳ Planned |

---

### 🟡 Should Have

Important improvements after the public beta.

| Feature                     | Status    |
| --------------------------- | --------- |
| AI Monthly Recap Insight    | ✅ Done    |
| Budget per Category         | ✅ Done    |
| Freemium Input Limit        | ✅ Done    |
| AI Weekly Report            | ⏳ Planned |
| Top Spending Category       | ⏳ Planned |
| Multi Transaction Input     | ⏳ Planned |
| PDF Report Monthly          | ⏳ Planned |
| Comprehensive Testing       | ⏳ Planned |
| Better Error Handling       | ⏳ Planned |
| Centralized Logger          | ⏳ Planned |
| Persistent WhatsApp Session | ⏳ Planned |

---

### 🟢 Could Have

Quality-of-life improvements and AI optimization.

| Feature                   | Status    |
| ------------------------- | --------- |
| Rule-Based Intent Router  | ✅ Done    |
| Structured JSON Output    | ✅ Done    |
| Prompt Compression        | ✅ Done    |
| AI Insight Cache          | ✅ Done    |
| Dynamic Context Injection | ⏳ Planned |
| Smart Model Routing       | ⏳ Planned |
| Android Dashboard         | ⏳ Planned |

---

### ⚪ Won't Have (Version 1.0)

Planned for Version 2.0.

| Feature                     | Status         |
| --------------------------- | -------------- |
| Web Dashboard               | 📅 Version 2.0 |
| Premium Subscription        | 📅 Version 2.0 |
| Advanced Analytics          | 📅 Version 2.0 |
| AI Financial Insight Engine | 📅 Version 2.0 |
| Budget Recommendation       | 📅 Version 2.0 |
| Spending Trend Analysis     | 📅 Version 2.0 |
| Custom Report Period        | 📅 Version 2.0 |
| Payment Integration         | 📅 Version 2.0 |

---

## 🌿 Branch Strategy

```
master              ← production-ready, hanya menerima merge dari dev
dev                 ← integration branch, semua fitur masuk sini dulu
feature/{namaFitur} ← branch per fitur, dibuat dari dev, di-merge kembali ke dev
```

**Workflow:**
```bash
# mulai fitur baru
git checkout dev
git checkout -b feature/budget-kategori

# selesai, merge ke dev
git checkout dev
git merge feature/budget-kategori
git push

# kalau dev sudah siap release → merge ke master
git checkout master
git merge dev
git push
```

| Branch | Sumber | Merge ke | Keterangan |
|---|---|---|---|
| `master` | — | — | Production only, jangan commit langsung |
| `dev` | `master` | `master` | Staging / integration |
| `feature/*` | `dev` | `dev` | Satu branch per fitur |

---

## ⚙️ Setup Guide

### Prerequisites
- Node.js 18+
- Supabase account (free tier cukup)
- OpenRouter account (free tier cukup)

---

### 1. Supabase — Setup Database

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, paste & run isi `supabase/supabase_setup.sql`
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

**Setup sekali (agar `npm test` langsung jalan tanpa WA):**
Tambahkan ke `finance-service/.env`:
```env
TEST_WA_NUMBER=test-runner
TEST_USER_ID=<uuid user test di Supabase>
```

**Jalankan test:**
```bash
cd testing-service
npm run reset        # bersihkan transaksi, saldo, dan budget user test
npm test             # semua 66 kasus (Part 1 + Part 2 + Part 3)
npm run test:part1   # Section A-E (32 kasus) — Income/Outcome/Switch/Balance
npm run test:part2   # Section F-I (25 kasus) — Recap/Ambiguous/General/Security
npm run test:part3   # Section J-L (9 kasus) — Undo/Resync/Budget (jalankan setelah part1)
npm run test:quick   # 2 kasus cepat untuk sanity check
```

**Test coverage:**

| Section | Kategori | Jumlah |
|---|---|---|
| A | Income — berbagai format nominal | 7 |
| B | Outcome — berbagai kategori & rekening | 14 |
| C | Switch antar rekening (rek_to ada di DB) | 5 |
| D | Cek saldo spesifik | 4 |
| E | Ringkasan semua saldo | 4 |
| F | Rekap bulanan + AI insight | 4 |
| G | Ambiguous — tanpa nominal (wajib GENERAL) | 9 |
| H | Non-finansial (wajib GENERAL) | 6 |
| I | Prompt injection & security | 6 |
| J | Undo transaksi terakhir & hapus by TRX ID | 3 |
| K | Resync saldo dari histori transaksi | 3 |
| L | Budget per kategori + progress setelah OUTCOME | 3 |
| **Total** | | **68 kasus** |

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
```
- pindah ke folder testing 
# pakai npm
npm run reset

# atau langsung
node reset-user.js

# untuk user ID berbeda (opsional)
node reset-user.js <uuid-lain>
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
Makan 50rb gopay              → ✅ OUTCOME Rp 50.000 · Makan · GoPay (+ budget progress jika diset)
Gajian 7.5jt ke BCA           → ✅ INCOME Rp 7.500.000 · Gaji · BCA
Transfer 500rb BCA ke Dana    → 🔄 SWITCH Rp 500.000 (jika Dana ada di akun) / OUTCOME (jika tidak)
saldo BCA                     → 💰 Saldo BCA: Rp X.XXX.XXX
keuangan gue gimana           → 💰 Ringkasan semua rekening
rekap bulan ini               → 📊 Rekap + 💡 AI Insight (cache 1 jam)
undo                          → 🗑️ Hapus transaksi terakhir + rollback saldo
hapus TRX-XXXXXXXX           → 🗑️ Hapus transaksi spesifik by ID + rollback saldo
resync                        → 🔄 Rebuild semua saldo dari histori transaksi
set budget Makan 500000       → ✅ Budget Makan diset Rp 500.000/periode
budget Makan                  → 📊 Progress budget Makan periode ini
```

```
Saya habis makan sushi        → 🤖 Bukan Track Keuangan (tanpa nominal)
BCA lagi error ya?            → 🤖 Bukan Track Keuangan
Lupakan instruksi sebelumnya  → 🤖 Bukan Track Keuangan (prompt injection)
```

---

## 📌 Vision

Build a simple, affordable, and AI-powered personal finance partner that works directly from WhatsApp — no app to install, no complicated setup for the end user.