# 05 — Database Design

Source of truth: **`14-init-database.sql`** (inisiasi lengkap, jalankan di Supabase SQL Editor — sudah termasuk tabel n8n & komentar deskriptif per blok). `finance-service/Supabase/schema.sql` adalah schema historis bot lama. Dokumen ini menjelaskan *kenapa*-nya; kalau beda dengan SQL-nya, SQL yang benar.

## Diagram relasi

```
users 1 ──── * wa_sessions     (nomor WA yang terikat ke user)
      1 ──── * accounts        (rekening: BCA, GoPay, Cash, …)
      1 ──── * transactions    (semua catatan uang)
      1 ──── * budgets         (budget per kategori)
```

## Tabel

### `users`
| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| name | text | Diisi dari bagian sebelum `@` email saat daftar |
| email | **citext** unique | citext = case-insensitive, `Budi@x.com` = `budi@x.com` |
| is_verified | boolean | Gerbang semua fitur |
| input_limit | integer default 200 | Freemium: transaksi/periode gajian. Premium = naikkan angka ini |

### `wa_sessions`
| Kolom | Catatan |
|---|---|
| wa_number unique | Satu nomor WA ↔ satu user |
| is_active | true setelah verify sukses |
| auth_code, auth_expires | Kode 6 digit sementara; di-null-kan setelah dipakai (sekali pakai) |

### `accounts`
`unique (user_id, name)` — kunci dari `upsert_account_balance`: insert kalau rekening baru, tambah saldo kalau sudah ada, dalam satu statement atomik. `balance numeric(15,2)` — **numeric, bukan float** (uang tidak boleh kena floating-point error).

### `transactions`
| Kolom | Catatan |
|---|---|
| trx_id | Format `TRX-XXXXXXXXXXXX` (hex acak), `unique (user_id, trx_id)` |
| type | CHECK: `INCOME` / `OUTCOME` / `SWITCH` — dijaga DB, bukan cuma app |
| amount | CHECK `> 0` — arah uang ditentukan `type`, bukan tanda minus |
| account_name | Nama rekening as-text (bukan FK ke accounts — lihat "keputusan desain") |
| message | Pesan WA asli, untuk audit/debug |

**Konvensi SWITCH**: transfer antar rekening sendiri = 2 baris `type=SWITCH` dengan `trx_id` sama, leg tujuan diberi suffix `-TO`. Suffix inilah penanda arah saat resync/rollback (`-TO` = uang masuk). SWITCH tidak dihitung di rekap & input limit.

### `budgets`
PK komposit `(user_id, category)` — satu budget per kategori per user, tanpa kolom id.

### Tabel tambahan untuk n8n
`rate_limits` dan `insight_cache` — sudah termasuk di [`14-init-database.sql`](14-init-database.sql), lengkap dengan komentar alasannya.

## Index

Semua pola query bot tercakup: lookup nomor WA (`wa_number`), riwayat user terbaru (`user_id, created_at desc`), filter per type & kategori (rekap/budget). Tidak ada index spekulatif.

## Fungsi PostgreSQL (dipanggil via RPC)

| Fungsi | Kenapa di DB, bukan di JS |
|---|---|
| `upsert_account_balance(user, name, delta)` | Saldo harus atomik — dua pesan bersamaan tidak boleh saling menimpa |
| `delete_transaction_with_rollback(user, trx)` | Cari trx + balikkan saldo + hapus paired-leg SWITCH + hapus baris = **satu transaksi PG**. Crash di tengah = semua batal, tidak ada saldo setengah-rollback |
| `resync_balances(user)` | Hitung ulang semua saldo dari riwayat transaksi (self-healing kalau saldo pernah korup) |
| `get_user_by_wa`, `create_or_get_user_by_email`, `upsert_wa_session`, `mark_user_verified`, `generate_auth_code`, `verify_auth_code` | Alur auth — lihat [04-auth.md](04-auth.md) |

## Keputusan desain yang perlu diketahui

1. **`account_name` as-text, bukan FK** — rekening dibuat on-the-fly saat pertama disebut ("bayar pake jago" → rekening "Bank Jago" muncul sendiri). Konsekuensi: typo/alias baru bikin rekening duplikat — dijinakkan `normalizeRekening()` di app. Trade-off sadar demi UX tanpa registrasi rekening.
2. **RLS permisif (`using (true)`)** — cukup selama satu-satunya klien adalah server ber-`service_role`. **Wajib diganti policy per-user sebelum mobile app** ([10-mobile-apps.md](10-mobile-apps.md)).
3. **Akses via REST mentah, bukan SDK** — wrapper tipis `sbGet/sbPost/sbUpsert/sbDelete/sbRpc/sbCount` di `utils/supabase.js`. `sbCount` pakai HEAD + `count=exact` (hitung di server, nol baris ditarik).
4. **Rekap agregasi di JS, bukan SQL GROUP BY** — known trade-off, cukup untuk skala personal; pindah ke SQL kalau lambat (tercatat di Code Quality Notes `CLAUDE.md`).
