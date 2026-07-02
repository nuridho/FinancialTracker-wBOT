# 10 — Mobile Apps (Android & iOS)

Fokus utama owner setelah backend pindah ke n8n. Dokumen ini mengunci keputusan arsitektur yang sudah dibahas supaya pembangunan mobile tidak mengulang diskusinya.

## Arsitektur: mobile bicara langsung ke Supabase

```
Mobile app ──── READ (riwayat, saldo, budget) ────► Supabase REST/SDK
           │        anon key + login user + RLS
           │
           └─── WRITE transaksi baru ─────────────► webhook n8n (jalur yang sama dgn bot)
```

## Keputusan yang sudah final (beserta alasannya)

### 1. READ langsung ke Supabase — TANPA lewat backend
SDK resmi Supabase tersedia untuk Kotlin, Swift, Flutter, React Native. Query riwayat/saldo/budget tidak punya logic bisnis — melewatkannya lewat backend cuma menambah hop dan latency.

### 2. WRITE transaksi TETAP lewat backend (webhook n8n)
Mencatat transaksi ≠ insert satu baris. Ada `upsert_account_balance` (saldo atomik), cek `input_limit` per periode, `normalizeRekening`, deteksi SWITCH vs OUTCOME, budget progress. Kalau app insert langsung ke tabel, semua itu ke-skip dan saldo tidak sinkron. Satu jalur write untuk WA + mobile = satu tempat logic uang.

### 3. Kunci yang boleh ada di app: HANYA `anon` key
`service_role` key **tidak pernah** boleh ditanam di app — siapa pun yang decompile APK bisa ekstrak dan dapat akses penuh semua data semua user. `anon` key memang dirancang untuk client dan aman **selama RLS benar**.

### 4. Auth mobile: Supabase Auth, bukan alur verify WA
Email OTP / magic link bawaan Supabase — tidak perlu bikin sistem login. Jembatan ke data lama: email yang sama = user yang sama (tabel `users` sudah keyed by email citext).

## Prasyarat keras sebelum app menyentuh data (kerjakan duluan)

RLS sekarang permisif (`using (true)`) karena satu-satunya klien adalah server ber-`service_role`. Sebelum `anon` key hidup, tulis policy per-user di `transactions`, `accounts`, `budgets`, `users`:

```sql
-- polanya (finalisasi saat mapping auth.uid() ↔ users.id ditetapkan):
create policy "own rows" on transactions for select
  using (user_id = (select id from users where email = auth.jwt()->>'email'));
```

⚠️ Kolom `users.id` dibuat sebelum Supabase Auth ada, jadi `auth.uid()` ≠ `users.id`. Dua opsi jembatan: (a) map via email seperti contoh di atas, atau (b) tambah kolom `auth_uid uuid` di `users` yang diisi saat pertama login mobile. Putuskan saat mulai — (b) lebih cepat di query, (a) tanpa perubahan schema.

Ini pekerjaan murni di Supabase — **bisa dicicil paralel selama migrasi n8n**, tidak saling menunggu.

## Urutan pembangunan yang disarankan

1. RLS + Supabase Auth di project Supabase (tanpa menyentuh bot).
2. App read-only: login → lihat riwayat, saldo, budget. Nilai langsung terasa, risiko nol ke data.
3. Write: form catat transaksi → POST ke webhook n8n (payload `{from, body}` atau webhook khusus terstruktur — putuskan saat n8n stabil).
4. Fitur lanjutan (chart, export, notifikasi) menyusul dari feedback pemakaian sendiri.

## Yang sengaja TIDAK dilakukan

- Tidak bikin REST API layer khusus mobile — Supabase REST + RLS sudah adalah API-nya.
- Tidak bikin sinkronisasi offline dulu — online-first; tambah kalau kebutuhan nyata muncul.
- Tidak menduplikasi logic pencatatan di app — satu-satunya jalan write adalah jalur bersama dengan bot.
