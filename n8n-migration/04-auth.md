# 04 — Authentication

## Alur verifikasi 3 langkah (semuanya via chat WA)

```
Langkah 1  User: (pesan apa pun, misal "halo")
           Bot : belum terdaftar → minta kirim email

Langkah 2  User: "budi@gmail.com"
           Bot : - create_or_get_user_by_email (buat user kalau belum ada)
                 - upsert_wa_session (ikat nomor WA ↔ user)
                 - generate_auth_code (kode 6 digit, kadaluarsa 10 menit)
                 - kirim kode via Resend ke email itu
                 - balas: "cek email, lalu kirim: email verify-XXXXXX"

Langkah 3  User: "budi@gmail.com verify-123456"
           Bot : verify_auth_code → cocok & belum kadaluarsa?
                 - ya  → is_active=true, is_verified=true → "terverifikasi ✅"
                 - tidak → pesan gagal (kode salah/kadaluarsa)
```

Deteksi langkah 2 & 3 pakai regex di `finance.route.js:111-128` — dicek **sebelum** `checkAuth`, jadi user unverified tetap bisa mendaftar.

## Properti keamanan

| Properti | Implementasi |
|---|---|
| Kode sekali pakai | `verify_auth_code` (PG function) menghapus `auth_code` setelah sukses |
| Kadaluarsa | `auth_expires = now() + 10 menit`, dicek di query yang sama (atomik) |
| Anti-spam email | Rate limit 3 request/menit per nomor WA |
| Anti brute-force | Rate limit 5 percobaan verify/menit; kode 6 digit + jendela 10 menit membuat tebakan brute-force tidak praktis lewat WA |
| Binding WA ↔ user | `wa_sessions.wa_number` unique — satu nomor WA hanya terikat satu user |

## Setiap request setelah terdaftar

`checkAuth(waNumber)` → RPC `get_user_by_wa` → dapat `{user_id, is_verified, is_active}`. Tidak verified → semua fitur ditolak. `user_id` hasil lookup inilah yang dipakai semua query berikutnya (bukan input user).

## Bypass untuk testing

`TEST_WA_NUMBER=test-runner` + `TEST_USER_ID=<uuid>` di `.env` → `checkAuth` skip DB lookup kalau `from` cocok. Aman karena nomor WA asli tidak mungkin bernilai `"test-runner"`, tapi **wajib unset di production** (known issue).

## Known issues pre-production

1. `auth.service.js:57` — kode verifikasi ikut di-return di response (untuk testing). **Hapus sebelum production.** Saat migrasi n8n, cabang AUTH sudah dirancang tanpa field ini.
2. Rate limiter in-memory — reset saat restart, tidak bekerja multi-instance. Solusi (tabel `rate_limits` + RPC `check_rate_limit`) sudah disiapkan di `14-init-database.sql` — bisa juga diadopsi ke finance-service sekarang tanpa menunggu n8n.

## Auth untuk mobile (nanti — jangan pakai alur WA ini)

Mobile app pakai **Supabase Auth** (email OTP/magic link bawaan), bukan alur verify WA. Dua alur auth ini bertemu di tabel `users` yang sama via email. Detail: [10-mobile-apps.md](10-mobile-apps.md).
