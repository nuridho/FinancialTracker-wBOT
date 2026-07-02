# 12 — Prasyarat (kerjakan sebelum buka n8n)

Checklist berurutan. Semua bisa dikerjakan tanpa mengganggu bot lama.

## A. WhatsApp Cloud API (Meta)

Butuh: **Meta Business Account** + **nomor HP baru** yang belum pernah dipakai WA personal.

1. Buat app di [developers.facebook.com](https://developers.facebook.com) → tipe **Business** → tambah produk **WhatsApp**.
2. Daftarkan nomor HP baru sebagai WhatsApp Business number (verifikasi via SMS).
3. Catat dari dashboard:
   - `PHONE_NUMBER_ID` — dipakai di URL kirim pesan
   - `WABA_ID` (WhatsApp Business Account ID)
   - **Permanent access token** — buat System User di Business Settings → assign app → generate token dengan permission `whatsapp_business_messaging`. Token sementara (24 jam) di dashboard cuma buat coba-coba.
4. Tentukan **Verify Token** sendiri (string bebas, misal hasil generate password) — dipakai saat Meta handshake ke webhook (`13-workflow-design.md` bagian Webhook Verify).
5. **Belum perlu isi webhook URL** — itu nanti setelah workflow n8n jadi (fase 3).

Biaya: service conversation (user chat duluan) = **Rp 0** di Indonesia. Tidak ada langganan.

## B. Sumopod

1. Sewa n8n dari marketplace Sumopod. Mulai dari plan kecil — upgrade gampang, downgrade sayang.
2. Setelah jalan, catat URL instance (`https://xxx.sumopod.app` atau sejenisnya) — ini jadi base URL webhook.
3. **Cek dan simpan `N8N_ENCRYPTION_KEY`**: kalau Sumopod expose env var instance, salin ke password manager. Tanpa key ini, backup credentials tidak bisa di-restore ke instance lain.
4. Cek apakah env var bisa di-set sendiri (buat `NODE_FUNCTION_ALLOW_EXTERNAL` / `N8N_CONCURRENCY_PRODUCTION_LIMIT` nanti). Kalau tidak bisa: tidak apa-apa, semua rancangan folder ini jalan tanpa itu.

## C. Supabase

1. Jalankan **`14-init-database.sql`** di Supabase SQL Editor (project yang sama dengan bot lama — datanya memang sengaja dipakai bersama).
2. Tidak ada perubahan lain. Semua tabel & RPC lama tetap dipakai.

## D. Credentials yang disiapkan untuk dimasukkan ke n8n

Masukkan lewat UI n8n → Credentials (tersimpan terenkripsi di DB n8n):

| Credential | Dipakai untuk | Sumber |
|---|---|---|
| Supabase API (host + `service_role` key) | Supabase node — semua query & RPC | Supabase dashboard → Settings → API |
| Resend API key | Resend node — email OTP | resend.com dashboard (yang sekarang dipakai finance-service bisa dipakai ulang) |
| OpenRouter API key | Code node classify (dikirim sebagai Bearer di fetch) | openrouter.ai (pakai yang sama dengan sekarang) |
| WA permanent token + `PHONE_NUMBER_ID` | HTTP Request node kirim balasan | Langkah A di atas |

Catatan: `INTERNAL_API_KEY` **tidak punya padanan** di n8n — konsep shared secret antar service hilang karena yang memanggil webhook sekarang Meta (bukan messaging-service), dan Meta tidak mengirim header custom kita. Pengamanan webhook = **Verify Token** saat handshake (langkah A.4, dipakai di Workflow 0) + opsional validasi signature `X-Hub-Signature-256` kalau mau lapisan ekstra.

Nilai konfigurasi non-rahasia yang juga dibutuhkan workflow (set sebagai node parameter / satu Code node konstanta):
`CONFIDENCE_THRESHOLD=70`, `PAYDAY_DATE=28`, Verify Token (langkah A.4), model fallback chain (salin dari `finance-service/.env` / `config/index.js`).

## E. Siap lanjut kalau

- [ ] Bisa kirim pesan test dari dashboard Meta ke nomor WA sendiri (tombol "Send test message")
- [ ] Instance n8n Sumopod bisa dibuka & login
- [ ] `14-init-database.sql` sukses tanpa error
- [ ] 4 credentials di tabel atas sudah tersimpan di n8n + Verify Token tercatat
