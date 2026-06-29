# Test Runner — finance-service

Test ini langsung hit `finance-service` via HTTP dan **langsung modify Supabase** 
(insert transaksi, update saldo) — sama persis seperti behavior production.

## Setup

```bash
cd test
npm install
```

Tidak perlu `.env` terpisah — runner otomatis baca `.env` dari `../finance-service/.env`.
Atau override URL service dengan env var:

```bash
TEST_FINANCE_URL=http://localhost:3001 node runner.js all
```

## Cara pakai

Pastikan `finance-service` sudah running dulu:
```bash
# terminal 1
cd finance-service && npm start

# terminal 2
cd test
node runner.js all      # semua 57 kasus (Part 1 + Part 2)
node runner.js part1    # Section A-E (32 kasus) — Income/Outcome/Transfer/Balance
node runner.js part2    # Section F-I (25 kasus) — Recap/Ambiguous/General/Security
node runner.js quick    # 2 kasus cepat untuk sanity check
```

Atau via npm:
```bash
npm test          # all
npm run test:part1
npm run test:part2
npm run test:quick
```

## Catatan penting

- **Data test masuk ke Supabase sungguhan** — gunakan user_id testing terpisah jika perlu
- Delay antar test: 1.5 detik (hindari rate limit OpenRouter free tier)
- Jika banyak FAIL di Section A/B/C cek dulu model fallback di OpenRouter
- Section G/H/I (Ambiguous/General/Security) expect `"Bukan Track Keuangan"`
  yang berasal dari intent `GENERAL` atau safe-mode konfirmasi

## Struktur output

```
[01] ✅ PASS  A1 Income - nominal juta desimal
     In : "Gajian bulan ini 7.5 juta masuk ke BCA"
     Out: 📝 *Catatan Keuangan* ‖ ━━━ ‖ ℹ️ *ID:* TRX-... ‖ ...

[02] ❌ FAIL  A2 Income - nominal rb
     In : "Dapat bonus 500rb dari kerja sampingan ke Dana"
     Out: 🤔 Maksudnya ingin mencatat...        ← low confidence → safe mode
```
