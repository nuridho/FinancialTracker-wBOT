# 06 — Admin Dashboard

## Kondisi sekarang: Supabase Studio (tidak bikin apa-apa)

Semua kebutuhan admin hari ini sudah tertutup **Supabase Studio** (dashboard bawaan project Supabase):

| Kebutuhan admin | Cara di Supabase Studio |
|---|---|
| Lihat/cari user | Table Editor → `users` |
| Naikkan limit user (premium manual) | Edit kolom `input_limit` |
| Lihat transaksi user tertentu | Table Editor → `transactions` filter `user_id` |
| Perbaiki saldo korup | SQL Editor → `select resync_balances('<user_id>')` |
| Hapus data test | `testing-service`: `npm run reset` |
| Query ad-hoc / laporan | SQL Editor |

**Keputusan: tidak membangun dashboard admin custom sekarang.** Operatornya satu orang (owner) yang punya akses DB penuh — layar tambahan di atas Studio cuma duplikasi.

## Kapan dashboard admin custom layak dibangun

Salah satu dari ini terjadi:
1. Ada **operator kedua** yang tidak boleh pegang `service_role`/akses Studio penuh.
2. Ada operasi rutin yang **berbahaya dilakukan manual** di Table Editor (misal refund berantai) dan butuh tombol satu-klik dengan guard.
3. User premium berbayar masuk → butuh audit trail perubahan limit/status.

## Rancangan saat dibutuhkan (urutan lazy)

1. **Retool / Appsmith** (low-code, connect langsung ke Postgres Supabase) — tabel user + tombol "ubah limit" + view transaksi. Setengah hari kerja, nol frontend code. **Mulai dari sini.**
2. Kalau butuh lebih custom: halaman admin di dalam **web dashboard** yang memang sudah direncanakan untuk Version 2.0 (lihat [09-future-features.md](09-future-features.md)) — jangan bikin app admin terpisah.

Yang mana pun dipilih: akses admin lewat **Supabase Auth + RLS policy role admin**, bukan menanam `service_role` key di frontend.

## Bukan dashboard admin

- **Dashboard customer** (lihat transaksi/budget sendiri) = fitur mobile/web app biasa → [10-mobile-apps.md](10-mobile-apps.md).
- **Monitoring uptime/error** = kebutuhan observability → item MONITORING di [BACKLOG.md](../BACKLOG.md); n8n punya execution log bawaan yang menutup sebagian ini setelah migrasi.
