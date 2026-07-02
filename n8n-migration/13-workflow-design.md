# 13 — Desain Workflow (peta 1:1 dari finance.route.js)

Tiga workflow: **Workflow 0** (handshake Meta, sekali pakai), **Workflow 1** (bot utama), **Workflow 2** (error handler, wajib). Semua referensi `baris X` menunjuk `../finance-service/src/routes/finance.route.js` — **fungsi yang ditandai "copy" disalin verbatim dari sana ke Code node**, jangan ditulis ulang dari ingatan. Nama node harus sama dengan `16-nodes-n8n-architecture.md` (dipakai sebagai rujukan by-name).

## Workflow 0 — Webhook Verify (handshake Meta, sekali pakai)

Meta melakukan GET dengan `hub.challenge` saat webhook didaftarkan.

```
[Webhook GET /wa] → [Code] → [Respond to Webhook]
```

Code node:
```js
const q = $input.first().json.query;
if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === "ISI_VERIFY_TOKEN_KAMU") {
  return [{ json: { challenge: q["hub.challenge"] } }];
}
throw new Error("verify token salah");
```
Respond to Webhook: text, body = `{{ $json.challenge }}`.

## Workflow 1 — Bot Utama

```
[Webhook POST /wa]  ← respond immediately 200 (Meta wajib dijawab cepat; balasan WA dikirim terpisah)
   │
[Code: "Extract Pesan"]  ← ambil {from, body} dari payload Meta; stop kalau bukan pesan teks.
   │                       Nama node JANGAN diganti — jadi rujukan $('Extract Pesan') di node lain
[Switch: "Deteksi Email/Verify"]──email/verify──► cabang AUTH (lihat bawah)
   │ tidak
[Supabase RPC: get_user_by_wa] → [IF verified?]──tidak──► reply "kirim email dulu…"
   │ ya  (userId didapat di sini)
[Switch: Rule-based intercept]   ← regex verbatim dari baris 143–217
   ├─ undo / hapus terakhir      → cabang UNDO
   ├─ hapus TRX-xxxx             → cabang DELETE
   ├─ resync/sync saldo          → cabang RESYNC
   ├─ set budget …               → cabang SET-BUDGET
   ├─ budget …                   → cabang CEK-BUDGET
   ├─ rekap mingguan/7 hari      → cabang REKAP (window 7 hari)
   ├─ rekap …tanggal N           → cabang REKAP (payday custom)
   └─ default (tidak match)
        │
   [Code: Classify]              ← tempel code-nodes/classify.js
        │
   [Code: Validate + Safe Mode]  ← copy validateIntent (baris 38–60) + buildKonfirmasiMsg (76–94)
        │                          + cek confidence < 70 → langsung set reply konfirmasi
   [Switch: intent]
   ├─ CHECK_BALANCE / CHECK_BALANCE_ALL / GET_RECAP / TRANSFER / ADD_TRANSACTION / MULTI / GENERAL
        │  (detail tiap cabang di bawah)
        ▼
[Merge semua cabang → field {to, reply}]
   │
[HTTP Request: kirim WA]
   POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
   Bearer {WA_TOKEN}
   { "messaging_product":"whatsapp", "to": "{{to}}", "text": { "body": "{{reply}}" } }
```

### Code node "Extract Pesan" (node pertama setelah webhook)

```js
const entry = $input.first().json.body;
const msg = entry?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
if (!msg || msg.type !== "text") return [];   // status update / non-teks → berhenti diam-diam
return [{ json: { from: msg.from, body: msg.text.body } }];
```

### ⚠️ Aturan aliran data (penting, sumber bug paling umum)

Di n8n, **output tiap node menimpa data item** — setelah node `Get User` (Supabase), `{from, body}` dari `Extract Pesan` sudah hilang tertimpa hasil RPC. Aturannya: node mana pun yang butuh `from` (nomor WA) atau `body` (pesan) **selalu ambil by-name**:

```js
const { from, body } = $('Extract Pesan').first().json;
```

Berlaku untuk: Code node classify, semua node format reply, dan node `Kirim WA` (`to` = `$('Extract Pesan').first().json.from`). Jangan pakai `$input` untuk dua field ini. (Ini alasan nama node dibakukan di `16-nodes-n8n-architecture.md`.)

### Konstanta & helpers bersama

Tiap Code node yang butuh, tempelkan di atasnya (fungsi murni, jalan apa adanya):
- `formatRupiah`, `getPeriodeGajian`, `summarizeRecords` — copy dari `../finance-service/src/utils/helpers.js` (hapus `config.paydayDate` → tulis angka `28` langsung).
- `normalizeRekening` — copy dari `../finance-service/src/modules/transaction/transaction.service.js`.
- `generateTrxId` — satu-satunya yang diadaptasi (Code node tidak bisa `require("crypto")`, pakai Web Crypto global):
```js
function generateTrxId() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return "TRX-" + [...b].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
```
> **📝 Catatan (risiko kecil, keputusan sadar):** `crypto.getRandomValues` hampir pasti tersedia di Code node (n8n modern jalan di Node 20+), tapi belum diverifikasi di instance Sumopod spesifik. **Test fungsi ini di langkah 1 urutan bangun.** Kalau ternyata error "crypto is not defined": ganti sebaris pakai `Math.random().toString(16)` — acaknya kualitas biasa (bukan kriptografi) tapi cukup untuk ID transaksi; duplikat tetap ditolak DB lewat constraint `unique(user_id, trx_id)`. Fallback sengaja TIDAK ditulis sekarang (YAGNI — benerinnya sebaris kalau beneran kejadian).

## Cabang AUTH

1. **Email masuk** (regex baris 111–115):
   `[Supabase RPC: check_rate_limit(key:'email:'+from, max:3)]` → false → reply "terlalu sering, tunggu 1 menit".
   → true → **3 RPC berurutan** (urutan penting — `generate_auth_code` cuma meng-UPDATE baris `wa_sessions`, jadi user & sesi harus dibuat dulu):
   `create_or_get_user_by_email(email)` → `upsert_wa_session(user_id, from)` → `generate_auth_code(from)`
   → `[Resend node: kirim kode]` → reply format sama dengan `auth.service.js`.
2. **Verify masuk** (regex baris 112, `email verify-XXXXXX`):
   `check_rate_limit(key:'verify:'+from, max:5)` → `[Supabase RPC: verify_auth_code]` → reply sukses/gagal.

Teks balasan disalin dari `../finance-service/src/modules/auth/auth.service.js`. **Jangan ikutkan field `code` di reply** (known issue lama — sekalian beres di migrasi ini).

## Cabang per intent (semua pakai Supabase node)

| Cabang | Langkah (urut) | Sumber teks balasan |
|---|---|---|
| UNDO | select 1 trx terakhir user (order by created desc) → RPC `delete_transaction_with_rollback` | baris 147–156 |
| DELETE | RPC `delete_transaction_with_rollback` dengan trx_id dari regex | baris 164–173 |
| RESYNC | satu RPC `resync_balances(user_id)` — hitung ulang semua saldo di PG, tidak ada logic JS | baris 179 |
| SET-BUDGET | upsert ke tabel `budgets` | baris 188 |
| CEK-BUDGET | hitung `getPeriodeGajian` → select budget + sum OUTCOME kategori itu → format progress (copy dari `budget.service.js`) | baris 196–198 |
| REKAP | select transaksi periode → agregasi + medali 🥇🥈🥉 (copy `recap.service.js`) → cek `insight_cache` (select `expires_at > now()`) → kalau kosong: fetch OpenRouter insight (pakai `orFetch` dari classify.js) → upsert cache | `recap.service.js` |
| CHECK_BALANCE | `normalizeRekening` → select `accounts` | baris 245–251 |
| CHECK_BALANCE_ALL | select semua `accounts` user → format | `account.service.js:getAllSaldo` |
| TRANSFER | cek `rek_to` ada di `accounts`? → ya: 2 insert SWITCH + 2 RPC `upsert_account_balance`; tidak: 1 insert OUTCOME + 1 RPC | baris 267–313 |
| ADD_TRANSACTION | `sbCount` transaksi periode (Supabase node, return count) + select `input_limit` → cek limit → insert + RPC saldo (= `recordAdd`) → append budget progress kalau OUTCOME | baris 316–350 |
| MULTI | filter items INCOME/OUTCOME & amt>0 → cek limit (count + items.length) → loop insert per item → summarize + budget per kategori unik | baris 353–397 |
| GENERAL | reply statis "Bukan Track Keuangan! beep boop 🤖" | baris 402 |

Loop MULTI di n8n: pakai **Loop Over Items** node, atau lebih lazy — satu Code node yang loop `fetch` ke Supabase REST langsung (pola sama dengan `sbPost`).

## Workflow 2 — Error Handler (wajib, jangan dilewati)

Webhook dijawab 200 di awal (syarat Meta), jadi kalau workflow utama error di tengah, **user tidak dapat balasan apa pun** — beda dengan bot lama yang selalu kirim pesan gagal generik (route catch-all → 500 → messaging-service tetap balas). Solusi: satu workflow kecil dengan **Error Trigger node**, lalu di setting workflow utama pilih workflow ini sebagai *Error Workflow*:

```
[Error Trigger] → [HTTP Request: kirim WA]
   to    : nomor user dari data eksekusi yang gagal
   pesan : "⚠️ Lagi ada gangguan, coba beberapa saat lagi yaa."
```

Tanpa ini, error = bot "menghilang" tanpa kabar — paritas dengan bot lama gagal (lihat `15-feature-comparison.md` bagian 7).

## Urutan bangun (test tiap langkah sebelum lanjut)

1. Workflow 0 + Webhook utama + Extract + reply "echo" → test dari Postman (POST payload Meta palsu).
2. Auth cabang (get_user_by_wa + IF) → test user terdaftar vs tidak.
3. Switch intercept + cabang paling sederhana dulu: RESYNC, SET-BUDGET, CEK-BUDGET.
4. Classify + Validate + CHECK_BALANCE / CHECK_BALANCE_ALL / GENERAL.
5. ADD_TRANSACTION (termasuk limit + budget append).
6. TRANSFER/SWITCH, MULTI, UNDO/DELETE, REKAP (paling banyak langkah — terakhir).
7. Workflow 2 (Error Handler) + pasang di setting workflow utama → test: bikin satu node sengaja gagal, pastikan pesan gangguan terkirim.
8. Baru daftarkan webhook di dashboard Meta (fase 3 README).

Test payload Meta palsu (simpan di Postman):
```json
{ "entry": [{ "changes": [{ "value": { "messages": [
  { "from": "628123456789", "type": "text", "text": { "body": "warteg 25rb bca" } }
] } }] }] }
```
