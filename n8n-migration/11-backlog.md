# 11 — BACKLOG (versi n8n)

> Tracking fitur, perbaikan, dan improvement untuk Git Finance Bot — **jalur n8n**.
> Rewrite dari `BACKLOG.md` root: item Docker/VPS/Baileys diganti langkah migrasi n8n; item infra yang tidak relevan di jalur n8n (SSL, Nginx, CI/CD, WA session check) sudah dihapus. `BACKLOG.md` root = arsip rencana jalur VPS lama.
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
| 6 | RATE LIMITING | Mencegah spam email dan brute-force verification code — di jalur n8n pindah ke tabel `rate_limits` + RPC `check_rate_limit` (`14-init-database.sql`) | 🧪 To Be Tested |
| 7 | TRANSACTION | Hapus Transaksi Terakhir | ✅ Done |
| 8 | TRANSACTION | Hapus Transaksi Tertentu | ✅ Done |
| 9 | TRANSACTION | Rebuild / Sync Saldo Rekening — `resyncBalances()` memanggil SQL function `resync_balances`; dipicu via `resync` / `sync saldo` / `rebuild saldo` | ✅ Done |
| 10 | ACCOUNT MANAGEMENT | Switch Uang Antar Rekening — TRANSFER intent dicek: `rek_to` ada di DB → SWITCH 2 baris type=SWITCH tidak masuk rekap; `rek_to` tidak ada → OUTCOME dari `rek_from` saja | ✅ Done |
| 11 | BUDGETING | Budget Per Kategori — set via `set budget [cat] [nominal]`, cek via `budget [cat]`, progress otomatis tampil setelah setiap OUTCOME | ✅ Done |
| 12 | ANALYTICS | Top Spending Category — 🥇🥈🥉 medals pada top 3 kategori di breakdown rekap | ✅ Done |
| 13.1 | REPORTING | Rekap Mingguan — rolling 7 hari mundur, rule-based intercept (no AI), reuse generateRekap | ✅ Done |
| 13.2 | REPORTING | Monthly PDF Report — chart per kategori + AI insight + rekomendasi konkret | ⏳ Planned |
| 14 | REPORTING | AI Insight Rekap Bulanan — `generateInsight()` dipanggil setelah `generateRekap()`; di jalur n8n cache pindah ke tabel `insight_cache` TTL 1 jam | ✅ Done |
| 15 | AI OPTIMIZATION | Intent Router — undo/delete/resync/budget/check-balance dicegat via regex sebelum `classifyMessage()`; di n8n = Switch node | ✅ Done |
| 16 | AI OPTIMIZATION | Rule-Based First Strategy — rule-based intercept menghemat 5–7 AI call per pesan non-transaksi | ✅ Done |
| 17 | AI OPTIMIZATION | Structured JSON Output — prompt enforce pure JSON; system message larang markdown; cleanJson strip backtick sebelum `JSON.parse` | ✅ Done |
| 18 | AI OPTIMIZATION | Prompt Compression — ~47% lebih kecil dari prompt awal; verbose rules dikompres jadi 4 baris; injection guard dipindah ke system message | ✅ Done |
| 19 | AI OPTIMIZATION | Dynamic Context Injection | 🚫 Not Yet — butuh extra DB call sebelum tiap AI request; overhead latency > penghematan token |
| 20 | AI OPTIMIZATION | Multi Model Routing | 🚫 Not Yet — tidak bisa deteksi kompleksitas sebelum memanggil AI; fallback chain 7 model sudah cukup |
| 21 | AI OPTIMIZATION | AI Insight Cache — TTL 1 jam, key = `userId:startISO:endISO`; di jalur n8n = tabel `insight_cache` (bukan in-memory lagi) | ✅ Done |
| 22 | IMPROVEMENT INPUT | Multi Transaksi dalam Satu Chat — intent MULTI: AI split beberapa transaksi dalam 1 pesan jadi `items[]`; loop `recordAdd` per item; reply gabungan dengan total masuk/keluar + budget progress per kategori. Batasan: INCOME/OUTCOME saja, transfer-in-multi belum didukung | ✅ Done |
| 23 | LIMIT INPUT | Freemium Input Limit — default 200 INCOME/OUTCOME per periode gajian; disimpan di kolom `input_limit` tabel users; SWITCH dan balance check tidak dihitung | ✅ Done |
| 24 | TESTING | Comprehensive Unit Testing | ⏳ Planned |
| 25 | TESTING | Integration Testing — di jalur n8n: replay Postman collection ke webhook n8n, bandingkan hasil dengan bot lama | ⏳ Planned |
| 26 | TESTING | API Endpoint Testing — retarget Postman collection ke URL webhook n8n | ⏳ Planned |
| 27 | TESTING | Automated Test Coverage Reporting | ⏳ Planned |
| 28 | CODE QUALITY | Improve Error Handling — di n8n: error branch per node + workflow Error Trigger | ⏳ Planned |
| 29 | CODE QUALITY | Centralized Logger — tertutup sebagian oleh execution log bawaan n8n | ⏳ Planned |
| 30 | CODE QUALITY | Refactor Transaction Service | ⏳ Planned |
| 31 | CODE QUALITY | Refactor Account Service | ⏳ Planned |
| 32 | N8N MIGRATION | Prasyarat: daftar WA Cloud API (Meta Business + nomor baru + permanent token) — `12-prasyarat.md` bagian A | ⏳ Planned |
| 33 | N8N MIGRATION | Prasyarat: sewa n8n di Sumopod + simpan `N8N_ENCRYPTION_KEY` + input 4 credentials — `12-prasyarat.md` bagian B & D | ⏳ Planned |
| 34 | N8N MIGRATION | Jalankan `14-init-database.sql` di Supabase SQL Editor (schema lengkap + `rate_limits` + `insight_cache`, idempotent) | ⏳ Planned |
| 35 | N8N MIGRATION | Bangun workflow inti n8n (webhook → auth → intercept → classify → execute → reply) — ikuti `13-workflow-design.md`, test via Postman | ⏳ Planned |
| 36 | N8N MIGRATION | Sambungkan webhook Meta → n8n; test paralel (nomor lama = bot lama, nomor baru = n8n) | ⏳ Planned |
| 37 | N8N MIGRATION | Validasi (replay skenario Postman, cek konsistensi saldo/rekap) lalu cutover: umumkan nomor baru, matikan bot lama | ⏳ Planned |
| 38 | MONITORING | Application Logging — tergantikan sebagian oleh execution log bawaan n8n (input/output per node, riwayat per run) | ⏳ Planned |
| 40 | MONITORING | Uptime Monitoring — ping URL instance n8n Sumopod | ⏳ Planned |
| 41 | INFRASTRUCTURE | Automated Supabase Backup | ⏳ Planned |
| 44 | INFRASTRUCTURE | Backup workflow n8n berkala — `n8n export:workflow --all` + `N8N_ENCRYPTION_KEY` (tidak ada kode yang di-deploy lagi, cukup backup workflow) | ⏳ Planned |
| 48 | DATABASE | Database Index Optimization — index dasar sudah ada di `14-init-database.sql`; optimasi lanjutan kalau query melambat | ⏳ Planned |
| 49 | ADVANCED REPORTING | Custom Rekap Period — "rekap dari tanggal 25" rule-based intercept, reuse getPeriodeGajian dengan custom payday param | ✅ Done |
| 50 | DOCUMENTATION | Architecture Diagram — ada di `02-system-architecture.md` (sekarang + target) | ✅ Done |
| 51 | DOCUMENTATION | Deployment Guide jalur n8n — `12-prasyarat.md` + `13-workflow-design.md` | ✅ Done |
| 52 | DOCUMENTATION | API Documentation publik — belum perlu (mobile pakai Supabase langsung, lihat `10-mobile-apps.md`) | 🚫 Not Yet |
| 53 | DASHBOARD | Web Dashboard — dibuat setelah backend n8n & mobile stabil (`06-admin-dashboard.md`, `09-future-features.md`) | ⏳ Planned |
| 54 | N8N MIGRATION | **Payung migrasi backend ke n8n (Sumopod)** — KEPUTUSAN FINAL. Langkah eksekusi = item 32–37 di atas. Rancangan: folder ini (`12-prasyarat` → `13-workflow-design` → `14-init-database.sql`) | ⏳ Planned |
| 55 | MOBILE | RLS per-user + Supabase Auth (prasyarat mobile; bisa paralel dengan migrasi n8n) — `10-mobile-apps.md` | ⏳ Planned |
| 56 | MOBILE | App read-only (login → riwayat, saldo, budget) → lalu write via webhook n8n | ⏳ Planned |

---

## n8n Migration (menggantikan rencana Containerization + VPS Deployment)

> Keputusan final: backend pindah ke n8n self-hosted di Sumopod. Tidak ada lagi Docker/VPS yang di-maintain sendiri — Sumopod yang urus container, Meta yang urus WhatsApp. Bot lama tetap hidup sampai cutover.

- [ ] Prasyarat A: WA Cloud API — Meta Business Account, nomor HP baru, permanent token, verify token (`12-prasyarat.md`)
- [ ] Prasyarat B: instance n8n Sumopod + simpan `N8N_ENCRYPTION_KEY` di password manager
- [ ] Prasyarat D: 4 credentials di n8n — Supabase (service_role), Resend, OpenRouter, WA token — plus Verify Token dicatat (bukan credential, dipakai di Workflow 0)
- [ ] Jalankan `14-init-database.sql` (aman di-run ulang, tidak menghapus data)
- [ ] Workflow 0: webhook verify Meta (handshake `hub.challenge`)
- [ ] Workflow utama: Extract → Auth → Switch intercept → Classify (Code node) → Validate+Safe Mode → Switch intent → kirim WA via Graph API — urutan bangun & test per langkah di `13-workflow-design.md`
- [ ] Test paralel dua nomor → validasi konsistensi → cutover
- [ ] Kalau nanti user rame & mulai lemot: set `N8N_CONCURRENCY_PRODUCTION_LIMIT` dulu (murah), baru pertimbangkan queue mode Redis+worker (infra tambahan)

---

## Authentication

### ✅ User Verification — Mandatory Email Verification

User wajib memverifikasi email sebelum dapat menggunakan seluruh fitur bot. Di jalur n8n: alur yang sama, dieksekusi cabang AUTH workflow (regex → RPC → Resend node).

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
user@example.com verify-582917
```

**Step 3** — User mengirim kode verifikasi
```
INPUT:  user@example.com verify-582917
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
- ⚠️ Di jalur n8n: **jangan ikutkan `code` di reply** (known issue bot lama, sekalian beres saat migrasi)

---

### ✅ Email Service — Setup Email Provider (Resend)

- Generate verification code
- Send verification email — di n8n pakai **Resend node resmi**
- Handle email delivery failure

### ✅ Auth Middleware — Authentication Middleware

- Check verification status sebelum memproses pesan — di n8n: Supabase RPC `get_user_by_wa` + IF node
- Block seluruh command untuk user yang belum terverifikasi
- Redirect user ke flow verifikasi email

### ✅ Verification Code Management

- Generate random 6 digit code — RPC `generate_auth_code`
- Set expiration time (10 menit)
- Validate verification code — RPC `verify_auth_code`, sekali pakai

### ✅ Session Management — WhatsApp Number Binding

- Simpan relasi nomor WhatsApp ↔ email (`wa_sessions`, wa_number unique)
- Wajib verifikasi ulang jika menggunakan nomor berbeda

### 🧪 Rate Limiting — Verification Request Protection

- Batasi jumlah request kode verifikasi (3/menit) & percobaan verify (5/menit)
- Di jalur n8n: **wajib via tabel** `rate_limits` + RPC `check_rate_limit` (n8n tidak punya memory antar eksekusi) — sudah termasuk `14-init-database.sql`

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
- AI mendeteksi adanya multi input (intent MULTI, `items[]`)
- Loop pencatatan per item — di n8n: Loop Over Items node atau satu Code node
- Reply gabungan: detail tiap leg + total masuk/keluar + budget progress per kategori unik

---

### ✅ Account Management — Switch Uang Antar Rekening

**Input:**
```
"Transfer 500rb dari BCA ke Dana"
"Pindah 1jt dari Jago ke BCA"
```

**Business Rule:**
- Rekening asal & tujuan sama-sama terdaftar → SWITCH (2 baris, tidak masuk rekap)
- Rekening tujuan tidak ditemukan → OUTCOME dari rekening asal
- SWITCH leg tujuan pakai suffix `-TO` pada trx_id (penanda arah saat resync/undo)

**Acceptance Criteria:**
- Saldo asal berkurang, saldo tujuan bertambah sesuai nominal
- SWITCH tidak mempengaruhi total income/outcome
- Bisa dibatalkan via Undo (kedua leg sekaligus, atomik via RPC)

---

### ✅ Reporting — AI Insight Rekap Bulanan

**Input:** `"rekap"` / `"rekap bulanan"`

**Output:** breakdown per kategori + top spending + AI insight 1 kalimat

**Di jalur n8n:** cek tabel `insight_cache` dulu (select `expires_at > now()`) → miss: panggil OpenRouter (`orFetch` di `code-nodes/classify.js`) → upsert cache TTL 1 jam.

---

### ✅ Reporting — Rekap Mingguan

**Input:** `"rekap mingguan"` / `"rekap 7 hari"` — rule-based intercept, rolling 7 hari, no AI token.

---

### ⏳ Reporting — Report PDF Bulanan

**Action:** kirim via Resend — di n8n: generate → attach di Resend node

**Output:** chart pengeluaran per kategori + AI Insight

---

### ✅ Transaction — Hapus Transaksi Terakhir

**Input:** `"undo"` / `"hapus transaksi terakhir"`

**Action:** select transaksi terakhir → RPC `delete_transaction_with_rollback` (balikkan saldo + hapus paired-leg SWITCH + hapus baris, satu transaksi PG)

---

### ✅ Transaction — Hapus Transaksi Tertentu

**Input:** `"hapus TRX-{trxId}"` / `"hapus transaksi TRX-{trxId}"`

**Acceptance Criteria:**
- Saldo kembali persis ke kondisi sebelum transaksi
- Tidak boleh terjadi saldo ganda atau rollback ganda (dijamin RPC atomik)
- TRX ID tidak ditemukan → pesan error yang sesuai

---

### ✅ Budgeting — Budget Per Kategori

**Input:** `"set budget makan 1500000"` / `"budget makan"`

**Output:**
```
Progress Budget:
Rp450.000 / Rp1.500.000 (30%)
```

**Additional:** progress tampil otomatis setiap OUTCOME dicatat

---

### ✅ Analytics — Top Spending Category

**Output:** 🥇🥈🥉 pada top 3 kategori di breakdown rekap; 4+ pakai ▪️. Periode berjalan dari awal gajian.

---

## AI Optimization

### ✅ Intent Router — Route Non-AI Commands

Saldo/rekap/undo/delete/budget/resync → rule-based. Di n8n: **Switch node** dengan regex yang sama persis dari `finance.route.js` (disalin verbatim, lihat `13-workflow-design.md`).

**Goal:** mengurangi request ke LLM, mempercepat response time

---

### ✅ Rule-Based First — AI as Fallback Strategy

Regex dulu, AI hanya kalau intent tidak terdeteksi. **Goal:** hemat token.

---

### ✅ Prompt Optimization — Prompt Compression

Prompt ~47% lebih kecil; injection guard di system message. Prompt disalin **verbatim** ke `code-nodes/classify.js` — jangan diubah saat migrasi.

---

### 🚫 Dynamic Context — Context Injection

> Deferred: butuh extra DB call sebelum tiap AI request; overhead latency > penghematan token untuk use case ini

---

### ✅ Structured Output — JSON Output Standardization

Seluruh output AI = JSON murni; `cleanJson` strip backtick sebelum parse; JSON rusak → coba model berikutnya.

---

### 🚫 Multi Model Routing — Smart Model Selection

> Deferred: tidak bisa deteksi kompleksitas sebelum memanggil AI; fallback chain 7 model sudah cukup

---

### ✅ Caching — AI Insight Cache

Di jalur n8n: tabel `insight_cache` (TTL 1 jam via kolom `expires_at`) — menggantikan Map in-memory yang hilang saat restart. Bonus: cache sekarang survive restart.

---

### ⏳ Conversation Memory — Stateless Processing

Tidak mengirim histori chat — hanya input aktif. (Sudah stateless by design; tetap dipertahankan di n8n.)

---

### ⏳ Fallback System — Improve Fallback Chain

- Retry otomatis ketika rate limit, fallback ke model berikutnya (sudah jalan di `classify.js`)
- [ ] Logging model failure — di n8n bisa dilihat per execution; alert eksternal kalau semua model gagal

---

### ⏳ Observability — AI Usage Monitoring

Track token usage, cost estimation, model success rate, fallback frequency. **Goal:** kontrol biaya AI.

---

## Optional Features

### ✅ Advanced Reporting — Custom Rekap Period

**Input:** `"rekap dari tanggal 25"` / `"rekap tanggal 15"` — `getPeriodeGajian(now, tgl)` payday custom (1–28), rule-based, no AI token. Default `PAYDAY_DATE=28`.

---

### ⏳ Infrastructure — Official WhatsApp Business API (bagian dari migrasi n8n)

> Menyatu dengan migrasi n8n — `messaging-service` ikut digantikan workflow, jadi ini bukan lagi perubahan service terpisah. Detail: `12-prasyarat.md` bagian A + `13-workflow-design.md` (Workflow 0 & node kirim WA).

**Motivasi:**
- Lebih stabil: tidak ada scan QR ulang, tidak ada risiko banned (masalah khas Baileys)
- Harga: **IDR 0.0000 per service conversation** di Indonesia (user chat duluan, bot membalas)
- Model webhook (Meta push) cocok dengan n8n — tidak butuh proses online 24/7

```
Sekarang (Baileys):
  sock.ev.on("messages.upsert") → forward ke finance-service → sock.sendMessage()

Target (n8n + Cloud API):
  Meta POST → Webhook node n8n → workflow → POST graph.facebook.com/v19.0/{PHONE_ID}/messages
```

**Yang perlu disiapkan:** Meta Business Account + nomor HP baru + webhook URL = instance n8n Sumopod (tidak perlu domain/ngrok/VPS sendiri).

---

### ⏳ Dashboard — Web Dashboard

> Setelah backend n8n & mobile stabil. n8n **bukan** frontend builder — dashboard = app terpisah yang baca Supabase (`06-admin-dashboard.md`).

**Features:** daftar transaksi · rekening · rekap bulanan/mingguan · budget tracking · top spending · AI insight

---

## Database

### ✅ Design Database — SQL Schema

**Tables:** users · wa_sessions · accounts · transactions · budgets — plus jalur n8n: rate_limits · insight_cache. Inisiasi lengkap: `14-init-database.sql`.

### ✅ Database Migration — Google Sheet → Supabase PostgreSQL

### ⏳ Database Optimization — Index

Index dasar (wa_number, user+created_at, user+type, user+category) sudah termasuk `14-init-database.sql`. Optimasi lanjutan hanya kalau query mulai lambat.

---

## Technical Improvement

### Testing

- [ ] Comprehensive Unit Testing — menjamin logic bisnis tetap stabil ketika fitur bertambah
- [ ] Integration Testing — di jalur n8n: replay Postman collection lama ke webhook n8n, bandingkan saldo/rekap dengan bot lama (fase validasi migrasi)
- [ ] API Endpoint Testing — retarget Postman collection ke URL webhook n8n
- [ ] Automated Test Coverage Reporting

### Code Quality

- [ ] Refactor transaction service
  - `getTransactionCount` ✅ Done — pakai `sbCount` = HEAD + `count=exact`; di n8n = Supabase node return count
  - `deleteTransactionWithRollback` ✅ Done — delegasi ke RPC `delete_transaction_with_rollback` (satu PG transaction); n8n memanggil RPC yang sama
  - `normalizeRekening` ✅ Done — alias map diperluas; di-copy verbatim ke Code node
- [ ] Refactor account service
- [ ] Improve error handling — di n8n: error output per node + workflow Error Trigger untuk alert
- [ ] Centralized logger — execution log bawaan n8n menutup kebutuhan dasar
- [ ] Fix `generateRekap` aggregation — loop JS in-memory; ganti SQL `GROUP BY` kalau lambat di scale besar
- [ ] Extend `normalizeRekening` — tambah alias baru saat ada laporan akun duplikat di production

### Security

- [x] Pengamanan webhook — `INTERNAL_API_KEY` tidak punya padanan di n8n (pemanggil sekarang Meta, bukan messaging-service); pengaman = Verify Token handshake (Workflow 0) + opsional validasi `X-Hub-Signature-256`
- [ ] Hapus field `code` dari reply auth (known issue bot lama) — cabang AUTH workflow n8n memang dirancang tanpa field ini
- [ ] RLS per-user sebelum mobile menyentuh DB dengan anon key (`10-mobile-apps.md`)

### n8n Migration (menggantikan Containerization + VPS)

Lihat section **n8n Migration** di atas (setelah Ranking List) — checklist lengkap 8 langkah.

### Infrastructure

- [ ] Automated Supabase Backup
- [ ] Backup workflow n8n berkala — `n8n export:workflow --all` + `export:credentials --all`; restore butuh `N8N_ENCRYPTION_KEY` yang sama

### Monitoring

- [ ] Application logging — execution log n8n (riwayat run, input/output per node); alert eksternal kalau perlu
- [ ] Uptime monitoring — ping URL instance n8n Sumopod

### Documentation

- [x] Dokumentasi proyek lengkap — folder ini, file 01–11
- [x] Setup/Deployment Guide jalur n8n — `12-prasyarat.md` + `13-workflow-design.md`
- [ ] API Documentation publik — baru relevan kalau API dipakai pihak lain

---

## Monetization

### ✅ Limit Input — Freemium Tier

- Setiap freemium user mendapat input limit 200 INCOME/OUTCOME per periode gajian
- [ ] Setiap paid user unlock semua fitur — mekanisme sudah ada: naikkan `input_limit` per user (belum butuh sistem role, lihat `03-user-roles-permissions.md`)

### ⏳ User Plan Management

### ⏳ Payment Integration *(Future)*
