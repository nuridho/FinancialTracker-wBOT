# 08 — Development Roadmap

Status per item ada di dua tempat yang lebih detail — jangan duplikasi ke sini:
- **[BACKLOG.md](../BACKLOG.md)** — daftar item bernomor + status (sumber kebenaran status).
- **README.md root** bagian Roadmap — pengelompokan Must/Should/Could Have untuk Version 1.0.

Dokumen ini memetakan **fase besar** dan urutannya.

## Fase yang sudah selesai

| Fase | Hasil |
|---|---|
| 1. Fondasi | Schema Supabase, bot WA via Baileys, klasifikasi AI + fallback 7 model, pencatatan INCOME/OUTCOME, cek saldo, rekap |
| 2. Keamanan | Verifikasi email 3 langkah, rate limiting, session WA, internal API key, prompt injection guard, Safe Mode |
| 3. Fitur transaksi lanjutan | Undo, hapus by ID (atomik via PG function), resync saldo, SWITCH antar rekening, MULTI input, budget per kategori, input limit freemium |
| 4. Optimasi AI | Rule-based intercept (hemat token), prompt compression ~47%, structured JSON, insight cache 1 jam, rekap mingguan + custom tanggal, top spending medals |
| 5. Testing | 67 test case end-to-end (3 part + quick), unit test offline, Postman collection, reset tooling |

Riwayat per sesi pengembangan: `CLAUDE.md` root bagian *Session Changelog*.

## Fase berjalan / berikutnya (urutan disengaja)

```
6. Migrasi n8n  ──────►  7. Mobile apps  ──────►  8. Version 2.0
   (backend pindah,         (fokus utama owner       (premium, web dashboard,
    ops diserahkan            setelah backend           analytics)
    ke Sumopod)               "jalan sendiri")
```

### Fase 6 — Migrasi n8n (KEPUTUSAN FINAL, belum mulai)
Rencana 5 langkah, bot lama tetap hidup sampai cutover. Detail lengkap: [`README.md`](README.md). Fase ini **menggantikan** rencana lama Docker/VPS deployment (item 32–37 backlog).

### Fase 7 — Mobile apps (menunggu fase 6)
Android/iOS → Supabase langsung. Prasyarat keras: RLS per-user + Supabase Auth (bisa dicicil selama fase 6 karena hanya menyentuh DB, bukan backend). Detail: [10-mobile-apps.md](10-mobile-apps.md).

### Fase 8 — Version 2.0
Premium subscription, web dashboard, advanced analytics, PDF report. Daftar lengkap + alasan penundaan: [09-future-features.md](09-future-features.md).

## Prinsip urutan

1. **Jangan dua migrasi sekaligus** — n8n dulu stabil, baru mobile. Debugging dua sistem baru bersamaan = tidak tahu yang mana yang rusak.
2. **Data layer duluan kalau bisa dicicil** — RLS + Supabase Auth tidak tergantung n8n, boleh dikerjakan paralel.
3. **Fitur baru menunggu platform stabil** — tidak ada fitur bot baru selama fase 6 (dua codebase harus tetap ekuivalen untuk validasi cutover).
