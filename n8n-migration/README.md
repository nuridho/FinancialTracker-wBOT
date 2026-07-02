# Migrasi ke n8n (Sumopod) + Dokumentasi Proyek

Backend bot pindah dari 2 service Node.js di VPS ke 1 instance n8n self-hosted di Sumopod. Setelah selesai, tidak ada server yang di-maintain sendiri — tinggal n8n (Sumopod yang urus) + Supabase + WA Cloud API. Owner fokus ke aplikasi mobile.

## 📚 Daftar isi folder (baca berurutan kalau baru mulai)

| # | File | Isi |
|---|---|---|
| 01 | [project-overview](01-project-overview.md) | Apa itu Git Finance, masalah, status, tech stack, filosofi desain |
| 02 | [system-architecture](02-system-architecture.md) | Alur request lengkap sekarang + arsitektur target n8n & mobile |
| 03 | [user-roles-permissions](03-user-roles-permissions.md) | Status user, freemium, kenapa belum ada sistem role |
| 04 | [auth](04-auth.md) | Alur verifikasi email 3 langkah via WA, rate limit, keamanan |
| 05 | [database-design](05-database-design.md) | Semua tabel & fungsi PostgreSQL + alasan desainnya |
| 06 | [admin-dashboard](06-admin-dashboard.md) | Supabase Studio sekarang; kapan & bagaimana dashboard custom |
| 07 | [api-design](07-api-design.md) | Kontrak `{from,body}→{reply}`, endpoint, nasib API pasca-n8n |
| 08 | [development-roadmap](08-development-roadmap.md) | Fase selesai + fase 6 (n8n) → 7 (mobile) → 8 (v2.0) |
| 09 | [future-features](09-future-features.md) | Yang direncanakan + yang sengaja ditunda beserta alasannya |
| 10 | [mobile-apps](10-mobile-apps.md) | Rancangan Android/iOS: Supabase langsung, RLS, read vs write |
| 11 | [backlog](11-backlog.md) | **Backlog versi n8n** (rewrite penuh — item Docker/VPS diganti langkah n8n; root BACKLOG.md = arsip jalur VPS lama) |
| 12 | [prasyarat](12-prasyarat.md) | Checklist SEBELUM buka n8n: WA Cloud API, Sumopod, credentials |
| 13 | [workflow-design](13-workflow-design.md) | Desain node-per-node workflow n8n — peta 1:1 dari `finance.route.js` |
| 14 | [init-database.sql](14-init-database.sql) | **Inisiasi database lengkap** (schema lama + tabel n8n), komentar deskriptif, aman di-run ulang |
| 15 | [feature-comparison](15-feature-comparison.md) | Perbandingan per fitur Node.js vs n8n (🟢 sama / 🟡 adaptasi / 🔴 redesign) — checklist paritas untuk fase validasi |
| 16 | [nodes-n8n-architecture](16-nodes-n8n-architecture.md) | Inventaris semua node n8n (3 workflow, ±40 node): nama baku, tipe, konfigurasi kunci, arah alur — "daftar belanjaan" saat drag-drop |
| — | [code-nodes/classify.js](code-nodes/classify.js) | AI classifier siap-tempel ke Code node (fetch, tanpa axios) |

Dokumen 01–11 = pengetahuan proyek. Dokumen 12–16 + code-nodes = bahan eksekusi migrasi.

## Arsitektur

### Sekarang (VPS)

```
User WA ──► Baileys (messaging-service) ──► POST /process ──► finance-service ──► Supabase
                 [socket persisten,                              [Express, semua logic,
                  harus online 24/7]                              rate limit & cache in-memory]
```

### Target (n8n)

```
User WA ──► Meta WA Cloud API ──► Webhook (push) ──► n8n workflow ──► Supabase
                                                          │
                                                          ├─► OpenRouter (classify + insight)
                                                          ├─► Resend (email OTP)
                                                          └─► Graph API (kirim balasan WA)
```

Perbedaan kunci: tidak ada lagi proses yang "harus tetap hidup" milik kita. Meta push pesan ke webhook n8n; n8n hanya jalan saat ada pesan.

## Pemetaan komponen

| Komponen sekarang | Pengganti di n8n | Catatan |
|---|---|---|
| Baileys (messaging-service) | **Webhook node** (terima dari Meta) + **HTTP Request node** (kirim balasan via Graph API) | Wajib daftar WA Cloud API dulu — lihat `12-prasyarat.md` |
| Express `POST /process` | Webhook node | Payload berubah dari `{from, body}` ke format webhook Meta — di-extract di Code node pertama |
| `INTERNAL_API_KEY` guard | **Tidak ada padanan (hilang by design)** — yang memanggil webhook sekarang Meta, bukan messaging-service. Pengaman: Verify Token saat handshake (Workflow 0) + opsional `X-Hub-Signature-256` | Konsep shared secret antar service tidak relevan lagi |
| Auth flow email/verify (regex step 1–2) | **Switch node** `Deteksi Email/Verify` (regex) → Supabase RPC + **Resend node** (resmi) | RPC `generate_auth_code` / `verify_auth_code` sudah ada di schema.sql — tidak berubah |
| `checkAuth` | Supabase RPC `get_user_by_wa` | Sudah ada |
| Rate limiter in-memory (`rate-limit.js`) | **Tabel `rate_limits` + RPC `check_rate_limit`** | Baru — jalankan `14-init-database.sql`. n8n tidak punya memory antar eksekusi |
| Rule-based intercept (undo/hapus/resync/budget/rekap) | **Switch node** dengan regex yang sama | Regex disalin apa adanya dari `finance.route.js` |
| `classifyMessage` (OpenRouter 7-model fallback) | **Code node** — `code-nodes/classify.js` | Ditulis ulang pakai fetch (axios belum tentu bisa di Sumopod) |
| `validateIntent` + Safe Mode | Code node | Copy fungsi apa adanya dari `finance.route.js:38-94` |
| Semua query/RPC Supabase (`sbGet/sbPost/sbRpc`) | **Supabase node** (resmi) atau HTTP Request | RPC kompleks (`upsert_account_balance`, `delete_transaction_with_rollback`) tetap dipanggil sebagai RPC — logic PG tidak berubah sama sekali |
| `generateInsight` cache in-memory | **Tabel `insight_cache`** | Baru — di `14-init-database.sql` |
| Resend email OTP | **Resend node resmi** | Tinggal pasang API key |
| helpers (`formatRupiah`, `getPeriodeGajian`, `generateTrxId`, `summarizeRecords`) | Copy-paste ke Code node | Fungsi murni, jalan apa adanya. `generateTrxId` ganti `crypto.randomBytes` → `crypto.getRandomValues` (lihat `13-workflow-design.md`) |
| testing-service (67 kasus) | Postman collection retarget ke URL webhook n8n | `runner.js` tidak dipakai lagi; bagian assert direplikasi manual dulu |

## Yang TIDAK berubah

- **Supabase**: semua tabel, RPC, dan schema.sql lama tetap dipakai persis. Migrasi ini tidak menyentuh data.
- **Prompt AI** (`buildPrompt`) dan model fallback chain: disalin verbatim.
- **Format balasan WA** (emoji, garis, dst): disalin verbatim dari `finance.route.js`.

## Urutan fase

Prinsip: **bot lama tetap jalan** sampai fase terakhir. Tidak ada momen "dua-duanya mati".

1. **Prasyarat** (`12-prasyarat.md`) — daftar WA Cloud API, sewa n8n Sumopod, jalankan `14-init-database.sql` di Supabase. Bot lama tidak terganggu.
2. **Workflow inti** (`13-workflow-design.md`) — bangun 3 workflow: Verify (handshake Meta), Utama (webhook → auth → intercept → classify → execute → reply), dan Error Handler. Test pakai Postman (tembak webhook langsung, belum lewat WA).
3. **Sambungkan WA Cloud API** — arahkan webhook Meta ke n8n. Nomor WA **baru** (bukan nomor Baileys), jadi bisa test paralel: nomor lama = bot lama, nomor baru = n8n.
4. **Validasi** — jalankan skenario Postman collection lama ke webhook n8n; cek saldo/rekap konsisten dengan hasil bot lama untuk input yang sama.
5. **Cutover** — umumkan nomor baru ke user, matikan VPS. Simpan `finance-service` di repo sebagai referensi logic (jangan dihapus).

## Risiko yang sudah diketahui (jangan kaget)

- **Concurrency**: default n8n tanpa queue mode kuat untuk pemakaian pribadi/keluarga. Kalau nanti user rame dan mulai lemot: set `N8N_CONCURRENCY_PRODUCTION_LIMIT` dulu (murah), baru pertimbangkan queue mode Redis+worker (mahal, infra tambahan).
- **Code node module**: kalau Sumopod tidak expose `NODE_FUNCTION_ALLOW_EXTERNAL`, hanya built-in JS + fetch yang jalan. Semua snippet folder ini sudah aman untuk batasan itu.
- **Backup workflow**: n8n export JSON per CLI (`n8n export:workflow --all`). Credentials export terpisah dan butuh `N8N_ENCRYPTION_KEY` yang sama untuk restore — simpan key itu di password manager sejak hari pertama.
- **Webhook duplikat dari Meta**: Meta bisa kirim ulang webhook yang sama kalau tidak dapat 200 tepat waktu → risiko kecil satu pesan diproses 2× (transaksi dobel). Setting *Respond: Immediately* di Webhook node membuat ini jarang. Kalau duplikat beneran muncul di log: dedupe pakai `messages[0].id` (wamid, unik per pesan) — simpan id yang sudah diproses di tabel kecil, skip kalau sudah ada. Sengaja belum dibangun (YAGNI) — tambah saat kejadian pertama.
