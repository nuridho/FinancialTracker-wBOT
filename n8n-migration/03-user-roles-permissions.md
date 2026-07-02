# 03 — User Roles & Permissions

## Kondisi sekarang: 2 status, bukan sistem role

Belum ada tabel role/permission. Yang ada adalah **status user** yang menentukan apa yang boleh dilakukan:

| Status | Cara mendapatkannya | Yang boleh dilakukan |
|---|---|---|
| **Unverified** | Chat pertama kali ke bot | Hanya alur pendaftaran: kirim email → terima kode → verify. Semua fitur lain ditolak dengan pesan ajakan daftar |
| **Verified** | Selesai verifikasi email (`is_verified=true` di `users`, `is_active=true` di `wa_sessions`) | Semua fitur bot |

## Pembatas dalam status Verified (freemium)

| Pembatas | Nilai | Disimpan di | Catatan |
|---|---|---|---|
| Input limit | 200 transaksi INCOME/OUTCOME per periode gajian | kolom `users.input_limit` | SWITCH & cek saldo tidak dihitung. Per-user, jadi "premium" = tinggal naikkan angka di kolom ini — tidak butuh sistem role |
| Rate limit email | 3 request/menit | in-memory (→ tabel `rate_limits` setelah n8n) | Anti-spam pendaftaran |
| Rate limit verify | 5 percobaan/menit | in-memory (→ idem) | Anti brute-force kode |

## Isolasi data antar user

Setiap baris `accounts`, `transactions`, `budgets`, `wa_sessions` terikat `user_id`. Semua query di finance-service selalu memfilter `user_id` dari hasil `checkAuth` — user tidak pernah bisa menyentuh data user lain **selama akses lewat bot**.

⚠️ Catatan: RLS policy di schema saat ini permisif (`using (true)`) karena satu-satunya klien adalah server dengan `service_role` key. Ini aman **hanya selama** tidak ada klien lain. Begitu mobile app masuk, RLS per-user wajib ditulis dulu — lihat [10-mobile-apps.md](10-mobile-apps.md).

## Role admin: belum ada (sengaja)

Tidak ada konsep admin di bot. Operasi admin (lihat semua user, ubah input_limit, hapus data) dilakukan langsung lewat **Supabase Studio** oleh pemilik project. Untuk skala sekarang (single operator) itu cukup — sistem role admin baru dibutuhkan kalau ada operator kedua yang tidak boleh pegang akses DB penuh. Lihat [06-admin-dashboard.md](06-admin-dashboard.md).

## Rancangan ke depan (saat mobile + premium masuk)

| Role | Autentikasi | Akses |
|---|---|---|
| User (free) | WA (bot) / Supabase Auth (mobile) | Data sendiri, limit 200/periode |
| User (premium) | idem | Data sendiri, limit dinaikkan/dihapus — cukup update `input_limit`, bukan role baru |
| Admin/Owner | Supabase Studio (sekarang) → dashboard admin (nanti) | Semua data |

Prinsip: **jangan bikin tabel roles/permissions sebelum ada kebutuhan role ketiga yang nyata.** Status boolean + satu kolom limit sudah menutupi free/premium.
