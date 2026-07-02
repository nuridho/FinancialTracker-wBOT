# 09 — Future Features

Fitur yang **belum** dibangun: yang direncanakan, dan yang sengaja ditolak/ditunda beserta alasannya (supaya diskusinya tidak terulang). Status live: [BACKLOG.md](../BACKLOG.md).

## Direncanakan (sesudah n8n + mobile stabil)

| Fitur | Deskripsi | Ketergantungan |
|---|---|---|
| PDF Report Monthly | Chart per kategori + AI insight + rekomendasi, dikirim via WA | — |
| Premium Subscription | Bayar → `input_limit` naik/hilang. Mekanismenya sudah ada (kolom per-user), tinggal payment | Payment integration |
| Web Dashboard (customer) | Riwayat, grafik, budget di browser | RLS + Supabase Auth (sama dengan mobile) |
| Advanced Analytics / Trend | Analisis tren pengeluaran antar periode | Data beberapa periode |
| Budget Recommendation | AI menyarankan budget dari pola belanja | idem |
| Payment Integration | Gerbang pembayaran untuk premium | — |
| Transfer-in-MULTI | Item TRANSFER di dalam pesan multi-transaksi | Limitation tercatat sejak fitur MULTI dibuat |

## Ditunda dengan alasan teknis tercatat (jangan buka ulang tanpa data baru)

| Fitur | Kenapa ditunda |
|---|---|
| Dynamic Context Injection | Butuh DB call ekstra sebelum tiap AI request — overhead latency > penghematan token |
| Smart / Multi Model Routing | Tidak bisa deteksi kompleksitas pesan sebelum memanggil AI; fallback chain 7 model sudah menutup kebutuhan |
| Alias rekening baru (Seabank, Blu, dst) di `normalizeRekening` | Ditambah reaktif saat alias mismatch muncul di log production, bukan spekulatif |
| Rekap via SQL GROUP BY | Agregasi JS masih cukup untuk skala personal; pindah kalau rekap mulai lambat |
| Sistem role/permission | Boolean `is_verified` + kolom `input_limit` sudah menutup free/premium; role baru saat ada operator kedua ([03](03-user-roles-permissions.md)) |
| Dashboard admin custom | Supabase Studio cukup untuk single operator ([06](06-admin-dashboard.md)) |
| Queue mode n8n (Redis+worker) | Baru kalau user rame & mulai lemot; mulai dari `N8N_CONCURRENCY_PRODUCTION_LIMIT` dulu |

## Ide yang pernah dibahas dan arahnya sudah diputuskan

| Ide | Keputusan |
|---|---|
| Hemat token classifier | Bukan "plugin" — pangkas `buildPrompt()` lebih lanjut / prompt caching. Sudah pernah dikompres ~47%, sisa peluangnya menipis |
| n8n sebagai host dashboard | Ditolak — n8n bukan frontend builder; dashboard = app terpisah |
| Baileys jangka panjang | Diganti WA Cloud API saat migrasi n8n (service conversation gratis di Indonesia) |
