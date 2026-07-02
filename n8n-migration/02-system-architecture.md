# 02 — System Architecture

## Arsitektur saat ini (VPS / lokal)

```
                                   ┌──────────────────────────────────────────┐
User WA ──► Baileys socket ──────► │ messaging-service                        │
            (persisten 24/7)       │  - strip group/broadcast/self            │
                                   │  - zero business logic                   │
                                   └───────────────┬──────────────────────────┘
                                                   │ POST /process {from, body}
                                                   │ header x-api-key (INTERNAL_API_KEY)
                                   ┌───────────────▼──────────────────────────┐
                                   │ finance-service (semua logic)            │
                                   │                                          │
                                   │ 1. Guard API key (index.js)              │
                                   │ 2. Auth flow email/verify (regex)        │
                                   │ 3. checkAuth → RPC get_user_by_wa        │
                                   │ 4. Rule-based intercept (regex, no AI):  │
                                   │    undo · hapus TRX · resync · budget    │
                                   │    · rekap mingguan · rekap tanggal N    │
                                   │ 5. classifyMessage → OpenRouter          │
                                   │    (7 model fallback chain)              │
                                   │ 6. validateIntent + Safe Mode (<70%)     │
                                   │ 7. Eksekusi intent → Supabase            │
                                   │ 8. return {reply}                        │
                                   └───────┬──────────────┬───────────┬───────┘
                                           │              │           │
                                      Supabase       OpenRouter    Resend
                                     (PostgreSQL)    (AI classify   (email
                                                      + insight)     OTP)
```

Balasan mengalir balik: `{reply}` → messaging-service → `sock.sendMessage()` → user.

## Komponen & tanggung jawab

| Komponen | Tanggung jawab | Yang SENGAJA tidak dia lakukan |
|---|---|---|
| `messaging-service` | Terima/kirim pesan WA, filter non-personal chat | Tidak ada logic bisnis sama sekali — biar gateway bisa diganti |
| `finance-service` | Auth, klasifikasi AI, transaksi, budget, rekap | Tidak menyentuh WhatsApp langsung |
| Supabase (PG functions) | Operasi atomik: saldo, delete+rollback, auth code | — |
| `testing-service` | 67 test case + reset data test | Tidak ikut deploy |

## Intent yang dikenali AI

`ADD_TRANSACTION` · `TRANSFER` (→ SWITCH kalau rekening tujuan milik sendiri) · `MULTI` (beberapa transaksi dalam 1 pesan) · `CHECK_BALANCE` · `CHECK_BALANCE_ALL` · `GET_RECAP` · `GENERAL` (fallback).

Detail aturan bisnis per intent: lihat `CLAUDE.md` root bagian *Business Rules*.

## State in-memory (penting untuk migrasi)

Dua komponen hidup di RAM proses dan **hilang saat restart** — keduanya wajib pindah ke DB saat migrasi n8n:

1. **Rate limiter** (`rate-limit.js`) — 3 request email/menit, 5 percobaan verify/menit.
2. **AI insight cache** (`ai.service.js`) — TTL 1 jam per `userId:periode`.

## Arsitektur target (setelah n8n + mobile)

```
User WA ──► Meta WA Cloud API ──► Webhook ──► n8n workflow ──► Supabase ◄── Mobile apps
                                              (Sumopod)            ▲          (Android/iOS)
                                                  │                │           read: langsung
                                                  ├─► OpenRouter   │           (anon key + RLS)
                                                  ├─► Resend       │
                                                  └─► Graph API ───┘   write transaksi:
                                                      (balas WA)       via webhook n8n
```

- Rancangan detail n8n: [`README.md`](README.md)
- Rancangan mobile: [10-mobile-apps.md](10-mobile-apps.md)

## Keamanan antar komponen

- messaging ↔ finance: shared secret `INTERNAL_API_KEY` di header `x-api-key` (no-op kalau env tidak diset — mode dev).
- finance ↔ Supabase: `service_role` key (bypass RLS) — **hanya boleh hidup di server/n8n, tidak pernah di client**. Lihat [03-user-roles-permissions.md](03-user-roles-permissions.md).
- Prompt injection: system message AI mengunci role; output non-JSON ditolak; `validateIntent` memvalidasi ulang field.
