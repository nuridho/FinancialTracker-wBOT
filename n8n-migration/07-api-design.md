# 07 — API Design

## Kontrak inti (yang membuat semua migrasi mungkin)

```
Request : { "from": "<nomor WA>", "body": "<pesan user>" }
Response: { "reply": "<balasan siap kirim>" }
```

Semua hal lain (Baileys vs Cloud API, Express vs n8n) boleh berubah — **kontrak ini tidak**. Gateway apa pun yang bisa mengirim `{from, body}` dan meneruskan `{reply}` bisa menggantikan messaging-service.

## Endpoint finance-service

Base URL: `http://localhost:3000` (default dev).

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/process` | `x-api-key` | Endpoint utama — seluruh alur bot (auth, intercept, AI, eksekusi). Lihat [02-system-architecture.md](02-system-architecture.md) |
| POST | `/register` | `x-api-key` | Alternatif eksplisit langkah daftar: `{email, waNumber}` → kirim kode. Dipakai testing/tooling |
| POST | `/verify` | `x-api-key` | Alternatif eksplisit verifikasi: `{email, waNumber, code}` |
| GET | `/health` | **terbuka** | `{status:"ok"}` — untuk uptime check |

### Error handling

| Kondisi | Response |
|---|---|
| `body` kosong/bukan string | 400 `{error}` |
| API key tidak cocok (saat `INTERNAL_API_KEY` diset) | 401 |
| Error internal (AI semua gagal, DB down, dst) | 500 `{error}` — messaging-service meneruskan pesan gagal generik ke user |
| Input tidak dimengerti / bukan keuangan | **200** dengan `reply: "Bukan Track Keuangan! beep boop 🤖"` — bukan error, karena bagi user itu jawaban |

## Autentikasi antar service

`INTERNAL_API_KEY` (env, shared secret) → header `x-api-key`. Guard di `finance-service/src/index.js`; no-op saat env tidak diset (mode dev/test). `/health` selalu terbuka. messaging-service & test runner otomatis mengirim header kalau env-nya ada.

## API eksternal yang dikonsumsi

| API | Dipakai untuk | Catatan |
|---|---|---|
| OpenRouter `/chat/completions` | Classify + insight | 7 model free-tier fallback berantai, `temperature: 0`, timeout 30 detik |
| Supabase REST (`/rest/v1/*`) | Semua CRUD + RPC | `service_role` key; wrapper di `utils/supabase.js` |
| Resend `/emails` | Kode verifikasi | |

## Setelah migrasi n8n

- `POST /process` → **webhook n8n** dengan payload Meta (field `{from, body}` diekstrak node pertama — kontrak inti tetap hidup, hanya amplopnya beda).
- `/register`, `/verify` → tidak dibutuhkan (alur regex di workflow menutupinya); tambahkan webhook terpisah hanya kalau mobile butuh endpoint pendaftaran eksplisit.
- `/health` → n8n punya health endpoint bawaan instance.

## API untuk mobile (nanti)

Mobile **tidak** memanggil endpoint bot. Read = Supabase REST langsung (anon key + RLS), write transaksi = webhook n8n. Detail & alasannya: [10-mobile-apps.md](10-mobile-apps.md).
