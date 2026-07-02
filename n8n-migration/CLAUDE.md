# CLAUDE.md — n8n-migration/

Panduan untuk Claude Code saat bekerja di folder ini.

## Apa folder ini

Rancangan + bahan migrasi backend bot keuangan dari **VPS/Node.js (finance-service + messaging-service)** ke **self-hosted n8n di Sumopod**. Tujuan akhir: seluruh alur WA bot jalan sebagai workflow n8n, sehingga owner bisa fokus bangun aplikasi mobile (Android/iOS → Supabase langsung).

**Folder ini TIDAK berisi kode yang di-deploy dari repo ini.** Isinya dokumen rancangan, SQL tambahan untuk Supabase, dan snippet JS untuk di-copy-paste ke Code node n8n lewat browser. Source of truth logic bisnis tetap `../finance-service/src/` sampai migrasi selesai.

## Struktur folder (flat, satu urutan bernomor)

- `README.md` — index semua file + arsitektur + pemetaan komponen + fase migrasi. **Mulai dari sini.**
- `01–11` — dokumentasi proyek (overview, arsitektur, roles, auth, database, admin, API, roadmap, future, mobile, backlog).
- `12-prasyarat.md`, `13-workflow-design.md`, `14-init-database.sql`, `15-feature-comparison.md`, `16-nodes-n8n-architecture.md`, `code-nodes/` — bahan eksekusi migrasi.
- `14-init-database.sql` = inisiasi database LENGKAP (schema lama + `rate_limits` + `insight_cache`), idempotent (aman di-run ulang, tidak menghapus data), komentar deskriptif per blok untuk owner. Menggantikan schema tambahan yang dulu terpisah; `finance-service/Supabase/schema.sql` tetap ada sebagai schema historis bot lama.

## Aturan kerja di folder ini

- **Jangan menyalin ulang fungsi murni dari `finance-service` ke folder ini.** `helpers.js`, `validateIntent`, `normalizeRekening`, dst tinggal di-copy dari source aslinya saat menempel ke n8n — `13-workflow-design.md` menunjuk file+baris mana. Duplikasi di sini = drift.
- Satu-satunya kode yang di-port di folder ini adalah yang **wajib ditulis ulang** untuk lingkungan n8n (axios → fetch, config → env). Saat ini cuma `code-nodes/classify.js`.
- Keputusan arsitektur yang sudah dibahas & disepakati (jangan re-litigasi):
  - Baileys → **Official WhatsApp Cloud API** (gratis untuk service conversation di Indonesia).
  - Rate limiter & AI insight cache **pindah ke tabel Supabase** (n8n tidak punya shared memory antar eksekusi).
  - Concurrency: mode default n8n dulu; **queue mode (Redis+worker) hanya kalau kepakai rame**. Owner berencana pakai Redis, tapi itu belum diperlukan hari pertama.
  - Dashboard web / mobile app **bukan** bagian n8n — mobile tembak Supabase langsung (anon key + RLS untuk read; write tetap lewat webhook n8n karena ada logic saldo/limit).
- Bahasa dokumen: Indonesia (owner bukan programmer profesional). Istilah teknis tetap Inggris.
- Owner minta angka terverifikasi, bukan perkiraan — kalau menyebut limit/harga/perilaku n8n, cek dokumen resminya dulu.

## Konteks harga/platform (per Jul 2026)

- Sumopod = PaaS container Indonesia, n8n self-hosted ~Rp15–60rb/bln, **tanpa limit eksekusi** (beda dengan n8n cloud yang bayar per eksekusi).
- n8n self-hosted default: concurrency control OFF. Container 2core/2GB cukup untuk pemakaian pribadi/keluarga; 50 user serentak butuh load test dulu (k6/autocannon) sebelum yakin.
- Code node self-hosted bisa pakai module eksternal hanya jika `NODE_FUNCTION_ALLOW_EXTERNAL` di-set — di Sumopod belum tentu bisa. **Semua snippet di folder ini karena itu pakai `fetch` bawaan, bukan axios.**
