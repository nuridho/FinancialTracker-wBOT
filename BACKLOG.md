# BACKLOG

> Tracking fitur, perbaikan, dan improvement untuk Git Finance Bot.
> Status: ✅ Done · 🧪 To Be Tested · ⏳ Planned · 🚫 Not Yet (deferred)

---

## Ranking List

| # | Kategori | Item | Status |
|---|----------|------|--------|
| 1.1 | DATABASE | Design SQL Database Schema | ✅ Done |
| 1.2 | DATABASE | Migrate Data Layer ke PostgreSQL Supabase | ✅ Done |
| 1 | USER VERIFICATION | Fondasi keamanan utama sebelum bot digunakan secara publik | 🧪 To Be Tested |
| 2 | EMAIL SERVICE | Dibutuhkan untuk mengirim verification code kepada user | 🧪 To Be Tested |
| 3 | AUTH MIDDLEWARE | Memastikan seluruh fitur hanya dapat diakses oleh user terverifikasi | 🧪 To Be Tested |
| 4 | VERIFICATION CODE | Core authentication flow tidak dapat berjalan tanpa validasi kode | 🧪 To Be Tested |
| 5 | SESSION MANAGEMENT | Menghubungkan nomor WhatsApp dengan identitas user yang telah diverifikasi | 🧪 To Be Tested |
| 6 | RATE LIMITING | Mencegah spam email dan brute-force verification code | 🧪 To Be Tested |
| 7 | TRANSACTION | Hapus Transaksi Terakhir | ✅ Done |
| 8 | TRANSACTION | Hapus Transaksi Tertentu | ✅ Done |
| 9 | TRANSACTION | Rebuild / Sync Saldo Rekening — `resyncBalances()` memanggil SQL function `resync_balances`; dipicu via `resync` / `sync saldo` / `rebuild saldo` | ✅ Done |
| 10 | ACCOUNT MANAGEMENT | Switch Uang Antar Rekening — TRANSFER intent dicek: `rek_to` ada di DB → SWITCH 2 baris type=SWITCH tidak masuk rekap; `rek_to` tidak ada → OUTCOME dari `rek_from` saja | ✅ Done |
| 11 | BUDGETING | Budget Per Kategori — set via `set budget [cat] [nominal]`, cek via `budget [cat]`, progress otomatis tampil setelah setiap OUTCOME | ✅ Done |
| 12 | ANALYTICS | Top Spending Category | ⏳ Planned |
| 13.1 | REPORTING | Rekap Mingguan | ⏳ Planned |
| 13.2 | REPORTING | Monthly PDF Report — chart per kategori + AI insight + rekomendasi konkret | ⏳ Planned |
| 14 | REPORTING | AI Insight Rekap Bulanan — `generateInsight()` dipanggil setelah `generateRekap()`, di-cache in-memory 1 jam per user per periode | ✅ Done |
| 15 | AI OPTIMIZATION | Intent Router — undo/delete/resync/budget/check-balance dicegat via regex sebelum `classifyMessage()` | ✅ Done |
| 16 | AI OPTIMIZATION | Rule-Based First Strategy — rule-based intercept menghemat 5–7 AI call per pesan non-transaksi | ✅ Done |
| 17 | AI OPTIMIZATION | Structured JSON Output — prompt enforce pure JSON; system message larang markdown; cleanJson strip backtick sebelum `JSON.parse` | ✅ Done |
| 18 | AI OPTIMIZATION | Prompt Compression — ~47% lebih kecil dari prompt awal; verbose rules dikompres jadi 4 baris; injection guard dipindah ke system message | ✅ Done |
| 19 | AI OPTIMIZATION | Dynamic Context Injection | 🚫 Not Yet — butuh extra DB call sebelum tiap AI request; overhead latency > penghematan token |
| 20 | AI OPTIMIZATION | Multi Model Routing | 🚫 Not Yet — tidak bisa deteksi kompleksitas sebelum memanggil AI; fallback chain 7 model sudah cukup |
| 21 | AI OPTIMIZATION | AI Insight Cache — in-memory Map TTL 1 jam, key = `userId:startISO:endISO`; cache miss hanya pada rekap pertama per periode | ✅ Done |
| 22 | IMPROVEMENT INPUT | Multi Transaksi dalam Satu Chat — intent MULTI: AI split beberapa transaksi dalam 1 pesan jadi `items[]`; route loop `recordAdd` per item; reply gabungan dengan total masuk/keluar + budget progress per kategori. Batasan: INCOME/OUTCOME saja, transfer-in-multi belum didukung | ✅ Done |
| 23 | LIMIT INPUT | Freemium Input Limit — default 200 INCOME/OUTCOME per periode gajian; disimpan di kolom `input_limit` tabel users; SWITCH dan balance check tidak dihitung | ✅ Done |
| 24 | TESTING | Comprehensive Unit Testing | ⏳ Planned |
| 25 | TESTING | Integration Testing — integrasi AI, Supabase, dan WhatsApp | ⏳ Planned |
| 26 | TESTING | API Endpoint Testing | ⏳ Planned |
| 27 | TESTING | Automated Test Coverage Reporting | ⏳ Planned |
| 28 | CODE QUALITY | Improve Error Handling | ⏳ Planned |
| 29 | CODE QUALITY | Centralized Logger | ⏳ Planned |
| 30 | CODE QUALITY | Refactor Transaction Service | ⏳ Planned |
| 31 | CODE QUALITY | Refactor Account Service | ⏳ Planned |
| 32 | CONTAINERIZATION | Dockerization | ⏳ Planned |
| 33 | CONTAINERIZATION | Persistent WhatsApp Session | ⏳ Planned |
| 34 | CONTAINERIZATION | Environment Variable Management | ⏳ Planned |
| 35 | CONTAINERIZATION | Production Ready Docker Image | ⏳ Planned |
| 36 | INFRASTRUCTURE | Deploy to VPS | ⏳ Planned |
| 37 | INFRASTRUCTURE | Automated Restart Policy | ⏳ Planned |
| 38 | MONITORING | Application Logging | ⏳ Planned |
| 39 | MONITORING | WhatsApp Session Health Check | ⏳ Planned |
| 40 | MONITORING | Uptime Monitoring | ⏳ Planned |
| 41 | INFRASTRUCTURE | Automated Supabase Backup | ⏳ Planned |
| 42 | INFRASTRUCTURE | Setup SSL (Let's Encrypt) | ⏳ Planned |
| 43 | INFRASTRUCTURE | Configure Nginx Reverse Proxy | ⏳ Planned |
| 44 | INFRASTRUCTURE | Setup CI/CD with GitHub Actions | ⏳ Planned |
| 48 | DATABASE | Database Index Optimization | ⏳ Planned |
| 49 | ADVANCED REPORTING | Custom Rekap Period | ⏳ Planned |
| 50 | DOCUMENTATION | Architecture Diagram | ⏳ Planned |
| 51 | DOCUMENTATION | Deployment Guide | ⏳ Planned |
| 52 | DOCUMENTATION | API Documentation | ⏳ Planned |
| 53 | DASHBOARD | Web Dashboard — sebaiknya dibuat setelah backend, auth, dan database sudah stabil | ⏳ Planned |

---

## Authentication

### ✅ User Verification — Mandatory Email Verification

User wajib memverifikasi email sebelum dapat menggunakan seluruh fitur bot.

**Flow:**

**Step 1** — User mengirim pesan apa saja
```
OUTPUT:
🔒 Akun belum terverifikasi.
Silakan kirim email Anda.
Contoh:
user@example.com
```

**Step 2** — User mengirim email
```
INPUT:  user@example.com
ACTION: Generate verification code → kirim ke email
OUTPUT:
📧 Kode verifikasi berhasil dikirim.
Untuk verifikasi, kirim:
user@example.com verify-5829174630
```

**Step 3** — User mengirim kode verifikasi
```
INPUT:  user@example.com verify-5829174630
ACTION: Validasi kode → simpan mapping WA ↔ email → tandai VERIFIED
OUTPUT:
✅ Verifikasi berhasil.
Selamat datang di Financial Tracker Bot.
```

**Access Rule:**
- User yang belum terverifikasi tidak dapat menggunakan fitur bot
- Seluruh transaksi, saldo, rekap, dan fitur AI ditolak sampai verifikasi berhasil

**Business Rule:**
- Setelah verifikasi berhasil, nomor WhatsApp dikaitkan dengan email
- Jika user menggunakan nomor WhatsApp yang berbeda, wajib melakukan verifikasi ulang

---

### ✅ Email Service — Setup Email Provider (Resend)

- Generate verification code
- Send verification email
- Handle email delivery failure

### ✅ Auth Middleware — Authentication Middleware

- Check verification status sebelum memproses pesan
- Block seluruh command untuk user yang belum terverifikasi
- Redirect user ke flow verifikasi email

### ✅ Verification Code Management

- Generate random 6 digit code
- Set expiration time
- Validate verification code

**Rule:**
- Code berlaku 6 menit
- Code hanya dapat digunakan satu kali

### ✅ Session Management — WhatsApp Number Binding

- Simpan relasi nomor WhatsApp ↔ email
- Wajib verifikasi ulang jika menggunakan nomor berbeda

### ✅ Rate Limiting — Verification Request Protection

- Batasi jumlah request kode verifikasi
- Cegah spam email
- Cegah brute force verification code

---

## Mandatory Features

### ✅ Improvement Input — Multi Transaksi dalam Satu Chat

**Input:**
```
"warteg 25 rb bca bensin 50k gopay"
"gaji 7.4 juta jago transfer ke gopay 1.5 juta"
"sushi 60rb gopay cashback 20rb gopay"
```

**Action:**
- AI mendeteksi adanya multi input
- AI mengklasifikasi beberapa input dalam 1 bubble chat
- Jika status input dan output ada dalam 1 chat → tampilkan detail input dan output dalam 1 pesan response
- Jika kategorinya berbeda (misal warteg = makan, bensin = transportasi) → tampilkan detail keduanya dalam 1 pesan response

---

### ✅ Account Management — Switch Uang Antar Rekening

**Input:**
```
"Transfer 500rb dari BCA ke Dana"
"Pindah 1jt dari Jago ke BCA"
```

**Action:**
- Saldo rekening asal berkurang
- Saldo rekening tujuan bertambah

**Output:** Tipe: `SWITCH`

**Business Rule:**
- Jika rekening asal dan tujuan sama-sama terdaftar pada sistem → transaksi dikategorikan sebagai SWITCH
- SWITCH tidak dihitung sebagai pemasukan maupun pengeluaran, karena hanya perpindahan saldo antar rekening pribadi
- Jika rekening tujuan tidak ditemukan pada daftar rekening pengguna → transaksi dikategorikan sebagai OUTCOME

**Proofing / Ambiguity Check:**
- Setelah transaksi SWITCH berhasil dicatat, sistem menampilkan informasi bahwa transaksi telah dikategorikan sebagai SWITCH
- Sistem juga memberikan panduan koreksi apabila interpretasi transaksi tidak sesuai dengan maksud pengguna

**Acceptance Criteria:**
- Saldo rekening asal berkurang sesuai nominal transfer
- Saldo rekening tujuan bertambah sesuai nominal transfer
- Riwayat transaksi SWITCH tercatat
- SWITCH tidak mempengaruhi total income maupun outcome
- User dapat membatalkan transaksi menggunakan fitur Undo

---

### ✅ Reporting — AI Insight Rekap Bulanan

**Input:**
```
"rekap"
"rekap bulanan"
```

**Output:**
- Perbandingan bulan sebelumnya
- Top spending category
- Trend pengeluaran
- Budget analysis
- AI recommendation

---

### ⏳ Reporting — Rekap Mingguan

**Input:** `"rekap mingguan"`

**Output:**
- Total pemasukan
- Total pengeluaran
- Top kategori
- Ringkasan minggu berjalan

---

### ⏳ Reporting — Report PDF Bulanan

**Action:** Kirim via Resend API

**Output:**
- Chart pengeluaran per kategori
- AI Insight

---

### ✅ Transaction — Hapus Transaksi Terakhir

**Input:**
```
"undo"
"hapus transaksi terakhir"
```

**Action:**
- Menghapus transaksi terakhir
- Mengembalikan saldo rekening terkait ke tabel accounts

**Business Rule:**
- INCOME → saldo rekening dikurangi kembali
- OUTCOME → saldo rekening ditambahkan kembali
- SWITCH → saldo rekening asal dikembalikan dan saldo rekening tujuan dikurangi kembali

**Output:** `"Transaksi {trxId} yang merupakan kategori {cat} berhasil dihapus"`

---

### ✅ Transaction — Hapus Transaksi Tertentu

**Input:**
```
"hapus transaksi TRX-{trxId}"
"hapus {trxId}"
```

**Action:**
- Menghapus transaksi berdasarkan `{trxId}`
- Mengembalikan perubahan saldo yang disebabkan transaksi tersebut ke tabel accounts
- Memvalidasi bahwa transaksi masih tersedia

**Business Rule:**
- INCOME → saldo rekening dikurangi kembali
- OUTCOME → saldo rekening ditambahkan kembali
- SWITCH → saldo rekening asal dikembalikan dan saldo rekening tujuan dikurangi kembali

**Output:** `"Transaksi TRX-{trxId} yang merupakan kategori {cat} berhasil dihapus"`

**Acceptance Criteria:**
- Data transaksi terhapus dari tabel transactions
- Saldo rekening kembali ke kondisi sebelum transaksi dibuat
- Tabel accounts selalu sinkron dengan tabel transactions
- Tidak boleh terjadi saldo ganda atau rollback ganda
- Jika TRX ID tidak ditemukan, tampilkan pesan error yang sesuai

---

### ✅ Budgeting — Budget Per Kategori

**Pre-condition:** Budget disimpan pada tabel budgets di Supabase

**Input:**
```
"budget makan"
"budget transport"
```

**Output:**
```
Progress Budget:
Rp450.000 / Rp1.500.000 (30%)
```

**Additional:** Tampilkan progress budget setiap transaksi OUTCOME dicatat

---

### ⏳ Analytics — Top Spending Category

**Output:**
```
🥇 Makan
🥈 Transport
🥉 Hiburan
```

**Condition:** Berdasarkan total pengeluaran periode berjalan, dari awal gajian

---

## AI Optimization

### ✅ Intent Router — Route Non-AI Commands

**Action:**
- Saldo → Rule Based
- Rekap → Rule Based
- Undo → Rule Based
- Delete Transaction → Rule Based
- Budget → Rule Based

**Goal:** Mengurangi request ke LLM, mempercepat response time

---

### ✅ Rule-Based First — AI as Fallback Strategy

**Action:**
- Jalankan parser regex terlebih dahulu
- Gunakan AI hanya jika intent tidak terdeteksi

**Goal:** Menghemat token, mengurangi biaya inference

---

### ✅ Prompt Optimization — Prompt Compression

**Action:**
- Kurangi instruksi yang berulang
- Ringkas daftar kategori dan rekening
- Hilangkan context yang tidak relevan

**Goal:** Mengurangi token input

---

### 🚫 Dynamic Context — Context Injection

> Deferred: butuh extra DB call sebelum tiap AI request; overhead latency > penghematan token untuk use case ini

**Action:**
- Hanya kirim rekening yang relevan
- Hanya kirim kategori yang relevan
- Hanya kirim data yang dibutuhkan model

**Goal:** Meminimalkan context window

---

### ✅ Structured Output — JSON Output Standardization

**Action:**
- Seluruh output AI menggunakan JSON Schema
- Hindari output naratif yang panjang

**Example:**
```json
{
  "type": "OUTCOME",
  "amount": 25000,
  "account": "Dana",
  "category": "Makan"
}
```

**Goal:** Mengurangi token output, mempermudah parsing response

---

### 🚫 Multi Model Routing — Smart Model Selection

> Deferred: tidak bisa deteksi kompleksitas sebelum memanggil AI; fallback chain 7 model sudah cukup

**Action:**
- Parsing sederhana → Small Model
- Parsing kompleks → Large Model
- AI Insight → Premium Model

**Goal:** Mengoptimalkan biaya dan performa

---

### ✅ Caching — AI Insight Cache

**Action:**
- Simpan hasil AI Insight Bulanan
- Simpan hasil AI Insight Mingguan
- Reuse hasil yang masih valid

**Goal:** Mengurangi request berulang

---

### ⏳ Conversation Memory — Stateless Processing

**Action:**
- Tidak mengirim seluruh histori chat
- Hanya mengirim input aktif dan context yang diperlukan

**Goal:** Mengurangi token usage, meningkatkan performa

---

### ⏳ Fallback System — Improve Fallback Chain

**Action:**
- Retry otomatis ketika rate limit
- Fallback ke model berikutnya
- Logging model failure

**Goal:** Meningkatkan reliability AI service

---

### ⏳ Observability — AI Usage Monitoring

**Action:**
- Track token usage
- Track cost estimation
- Track model success rate
- Track fallback frequency

**Goal:** Mengontrol biaya operasional AI

---

## Optional Features

### ⏳ Advanced Reporting — Custom Rekap Period

**Input:** `"rekap dari tanggal 25"`

**Action:** Periode mengikuti tanggal gajian user

**Default:** 28 → 27 bulan berikutnya

---

### ⏳ Dashboard — Web Dashboard

> Sebaiknya dibuat setelah backend, auth, dan database sudah stabil

**Features:**
- Daftar transaksi
- Daftar rekening
- Rekap bulanan
- Rekap mingguan
- Budget tracking
- Top spending category
- AI insight

---

## Database

### ✅ Design Database — SQL Schema

**Tables:** users · accounts · transactions · categories · budgets

### ✅ Database Migration — Google Sheet → Supabase PostgreSQL

### ⏳ Database Optimization — Index

```
INDEX:
- transaction_date
- category
- account_id
- transaction_type
```

---

## Technical Improvement

### Testing

- [ ] Comprehensive Unit Testing — menjamin logic bisnis tetap stabil ketika fitur bertambah
- [ ] Integration Testing — memastikan integrasi AI, Supabase, dan WhatsApp berjalan baik
- [ ] API Endpoint Testing — mengurangi risiko regression pada endpoint internal
- [ ] Automated Test Coverage Reporting — menjaga kualitas codebase dalam jangka panjang

### Code Quality

- [ ] Refactor transaction service
  - `getTransactionCount` ✅ Done — pakai `sbCount` = HEAD + `count=exact`, tidak pull rows ke memory
  - `deleteTransactionWithRollback` — dua `sbDelete` sequential tidak atomic → partial rollback jika crash; pindahkan ke Supabase RPC transaction. Sementara: gunakan `resync` sebagai recovery
- [ ] Refactor account service
- [ ] Improve error handling — mengurangi crash dan memperjelas penyebab error
- [ ] Centralized logger — mempermudah debugging dan monitoring aplikasi
- [ ] Fix `generateRekap` aggregation — saat ini loop JS in-memory; ganti ke SQL `GROUP BY` via `sbRpc` untuk performa yang benar di scale besar
- [ ] Extend `normalizeRekening` — tambah alias Seabank, Blu BCA, dll saat ada laporan akun duplikat di production

### Security

- [x] Shared secret messaging-service ↔ finance-service (`INTERNAL_API_KEY`)
  - Guard middleware di `finance-service/src/index.js`; tolak 401 jika key diset + header `x-api-key` tidak cocok. `/health` tetap terbuka
  - messaging-service + testing-service/runner.js kirim header otomatis jika `INTERNAL_API_KEY` ada di `.env`. Unset = guard nonaktif (dev/test)

### Containerization

- [ ] Create Docker Compose Configuration
- [ ] Environment Variable Management
- [ ] Persistent Session Volume
- [ ] Multi-stage Docker Build
- [ ] Production-ready Docker Image

### Infrastructure

- [ ] Deploy Docker Container to VPS
- [ ] Configure Nginx Reverse Proxy
- [ ] Setup SSL (Let's Encrypt)
- [ ] Setup CI/CD with GitHub Actions
- [ ] Automated Supabase Backup
- [ ] Automated Container Restart Policy

### Monitoring

- [ ] Application logging — menyediakan observability dasar pada production
- [ ] Uptime monitoring — memberikan notifikasi ketika service down
- [ ] WhatsApp session health check — mengurangi risiko bot tidak merespons akibat disconnect

### Documentation

- [ ] API Documentation — berguna ketika API mulai digunakan oleh pihak lain
- [ ] Deployment Guide — mempermudah setup dan maintenance server
- [ ] Architecture Diagram — membantu memahami struktur sistem secara keseluruhan
- [ ] Self Hosting Guide

---

## Monetization

### ✅ Limit Input — Freemium Tier

- Setiap freemium user mendapat input limit 200 INCOME/OUTCOME per periode gajian
- [ ] Setiap paid user unlock semua fitur dan no minimum limit input

### ⏳ User Plan Management

### ⏳ Payment Integration *(Future)*
