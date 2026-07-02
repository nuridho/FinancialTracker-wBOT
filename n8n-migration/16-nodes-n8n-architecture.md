# 16 — Arsitektur Node n8n

Inventaris **semua node** yang akan ada di n8n: nama, tipe node, konfigurasi kunci, dan ke mana output-nya mengalir. `13-workflow-design.md` = *alurnya*; dokumen ini = *daftar belanjaan node* saat drag-drop di browser. Nama node sengaja dibakukan — pakai nama yang sama persis biar execution log gampang dibaca dan dokumen ini tetap nyambung.

Total: **3 workflow, ±40 node**.

---

## Workflow 0 — `WA Webhook Verify` (3 node, sekali pakai)

Handshake pendaftaran webhook di dashboard Meta. Setelah webhook terdaftar, workflow ini nganggur (biarkan aktif, Meta kadang re-verify).

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| 0.1 | `Verify GET` | **Webhook** | Method GET, path `wa`, Respond: *Using Respond to Webhook node* | 0.2 |
| 0.2 | `Check Token` | **Code** | Cocokkan `hub.verify_token` dengan verify token kamu; return `hub.challenge` (kode di `13-workflow-design.md`) | 0.3 |
| 0.3 | `Return Challenge` | **Respond to Webhook** | Respond with: Text, body `{{ $json.challenge }}` | — |

## Workflow 1 — `WA Bot Utama` (±35 node)

### Blok A — Pintu masuk (3 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| A1 | `WA Webhook` | **Webhook** | Method POST, path `wa`, Respond: *Immediately* (syarat Meta: jawab 200 cepat; balasan WA dikirim node terakhir, bukan respons webhook). Authentication: none (Meta tidak kirim custom header; keamanan = verify token saat handshake + payload signature opsional) | A2 |
| A2 | `Extract Pesan` | **Code** | Ambil `{from, body}` dari payload Meta; `return []` kalau bukan pesan teks (status update dll berhenti diam-diam) | A3 |
| A3 | `Cek Tipe Pesan` | **IF** | Ada item? (kosong = berhenti) — opsional, Code node kosong sudah menghentikan alur | B1 |

### Blok B — Auth (9 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| B1 | `Deteksi Email/Verify` | **Switch** | 3 rule regex (verbatim `finance.route.js:111-128`): kirim email / kirim verify / bukan keduanya | email→B2, verify→B5, lainnya→B8 |
| B2 | `Rate Limit Email` | **Supabase** (RPC) | `check_rate_limit('email:'+from, 3)` — true lanjut, false balas "tunggu 1 menit" | true→B3, false→Z1 |
| B3 | `Generate Kode` | **Supabase** (RPC) | `create_or_get_user_by_email` → `upsert_wa_session` → `generate_auth_code` (3 call berurutan; boleh 3 node kecil atau 1 Code node fetch) | B4 |
| B4 | `Kirim Email Kode` | **Resend** | Node resmi Resend; template teks kode 6 digit. ⚠️ Kode TIDAK ikut di reply WA | Z1 |
| B5 | `Rate Limit Verify` | **Supabase** (RPC) | `check_rate_limit('verify:'+from, 5)` | true→B6, false→Z1 |
| B6 | `Validasi Kode` | **Supabase** (RPC) | `verify_auth_code(wa_number, code)` | B7 |
| B7 | `Format Hasil Verify` | **Code** | Sukses → pesan selamat datang; gagal → pesan kode salah/kadaluarsa | Z1 |
| B8 | `Get User` | **Supabase** (RPC) | `get_user_by_wa(from)` → dapat `user_id`, `is_verified` | B9 |
| B9 | `Terverifikasi?` | **IF** | `is_verified && is_active` — false: reply ajakan kirim email | true→C1, false→Z1 |

### Blok C — Rule-based intercept (±8 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| C1 | `Intercept Regex` | **Switch** | 7 rule regex verbatim (undo / hapus TRX / resync / set budget / cek budget / rekap mingguan / rekap tanggal N) + default | per cabang → C2–C8, default→D1 |
| C2 | `Undo` | **Supabase** ×2 | Select trx terakhir → RPC `delete_transaction_with_rollback` → format reply | Z1 |
| C3 | `Hapus TRX` | **Supabase** (RPC) | RPC delete by ID dari regex; kosong = "tidak ditemukan" | Z1 |
| C4 | `Resync` | **Supabase** (RPC) | `resync_balances(user_id)` | Z1 |
| C5 | `Set Budget` | **Supabase** (upsert) | Upsert `budgets(user_id, category, amount)` | Z1 |
| C6 | `Cek Budget` | **Code + Supabase** | `getPeriodeGajian` → select budget + sum OUTCOME → format progress | Z1 |
| C7 | `Rekap Mingguan` | **Code** | Window 7 hari → panggil sub-alur rekap (blok R) | R1 |
| C8 | `Rekap Tanggal N` | **Code** | `getPeriodeGajian(now, N)` clamp 1–28 → blok R | R1 |

### Blok D — AI (3 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| D1 | `AI Classify` | **Code** | Tempel `code-nodes/classify.js` utuh (prompt + 7-model fallback + fetch) | D2 |
| D2 | `Validate + Safe Mode` | **Code** | Copy `validateIntent` + `buildKonfirmasiMsg` verbatim; confidence < 70 → langsung isi reply konfirmasi | valid→D3, safe-mode→Z1 |
| D3 | `Route Intent` | **Switch** | 7 cabang: CHECK_BALANCE / CHECK_BALANCE_ALL / GET_RECAP / TRANSFER / ADD_TRANSACTION / MULTI / GENERAL (default) | E1–E6 / R1 / Z1 |

### Blok E — Eksekusi intent (±10 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| E1 | `Cek Saldo` | **Code + Supabase** | `normalizeRekening` → select `accounts` → format | Z1 |
| E2 | `Cek Semua Saldo` | **Supabase + Code** | Select semua accounts user → format list | Z1 |
| E3 | `Transfer/Switch` | **Supabase + IF + Code** | Cek `rek_to` ada? → ya: 2 insert SWITCH (+`-TO`) + 2 RPC saldo; tidak: 1 insert OUTCOME + 1 RPC. Reply verbatim | Z1 |
| E4 | `Cek Limit Input` | **Supabase ×2** | Count transaksi periode (HEAD count) + select `input_limit` → IF lewat limit → reply batas tercapai | ok→E5, limit→Z1 |
| E5 | `Catat Transaksi` | **Code + Supabase** | `recordAdd`: generateTrxId → normalizeRekening → insert → RPC `upsert_account_balance` → reply + budget progress kalau OUTCOME | Z1 |
| E6 | `Multi Transaksi` | **Code** | Filter items valid → cek limit (count+items.length) → loop fetch insert+RPC per item → reply gabungan + total + budget per kategori unik. Satu Code node (lebih lazy daripada Loop Over Items untuk alur ini) | Z1 |

*GENERAL tidak butuh node — cabang default D3 langsung isi reply statis lalu ke Z1.*

### Blok R — Rekap (4 node, dipakai 3 jalur: C7, C8, GET_RECAP)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| R1 | `Ambil Transaksi Periode` | **Supabase** | Select transaksi user dalam range start–end | R2 |
| R2 | `Agregasi + Medali` | **Code** | Copy logic `recap.service.js`: total, breakdown kategori, 🥇🥈🥉 | R3 |
| R3 | `Cek Cache Insight` | **Supabase** | Select `insight_cache` where key + `expires_at > now()` | hit→Z1, miss→R4 |
| R4 | `AI Insight + Simpan` | **Code + Supabase** | `orFetch` (dari classify.js) → upsert `insight_cache` TTL 1 jam → gabung ke reply | Z1 |

### Blok Z — Balasan (2 node)

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| Z1 | `Merge Reply` | **Merge** / langsung | Semua cabang bermuara sini dengan `{to, reply}` — di n8n praktisnya: semua cabang langsung connect ke Z2 (Merge node opsional, hanya kalau butuh join paralel) | Z2 |
| Z2 | `Kirim WA` | **HTTP Request** | `POST https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`, Bearer token (credential), body `{messaging_product:"whatsapp", to, text:{body: reply}}` | — |

## Workflow 2 — `Error Handler` (2 node, wajib)

Dipasang via setting Workflow 1 → *Error Workflow*. Tanpa ini, error di tengah = user tidak dapat balasan (lihat `15-feature-comparison.md` bagian 7).

| # | Nama node | Tipe node | Konfigurasi kunci | Output ke |
|---|---|---|---|---|
| X1 | `Error Trigger` | **Error Trigger** | Menangkap eksekusi Workflow 1 yang gagal + datanya | X2 |
| X2 | `Kirim Pesan Gangguan` | **HTTP Request** | Sama dengan Z2; to = nomor dari data eksekusi gagal; pesan: "⚠️ Lagi ada gangguan, coba beberapa saat lagi yaa." | — |

---

## Credentials yang dipakai node (4 credential + Verify Token — daftar lengkap di `12-prasyarat.md`)

| Credential | Dipakai node |
|---|---|
| Supabase API (service_role) | Semua node Supabase (B, C, E, R) |
| Resend API | B4 |
| WA token + PHONE_NUMBER_ID | Z2, X2 |
| OpenRouter API key | D1, R4 (di dalam Code node — hardcode dari credential/env) |
| Verify token Meta | 0.2 |

## Prinsip penamaan & penataan

1. **Nama node = bahasa manusia**, bukan tipe teknis — execution log jadi terbaca seperti cerita ("Extract Pesan → Get User → Intercept Regex → Undo").
2. **Kelompokkan pakai huruf blok** (A–Z) sesuai dokumen ini — gampang dicocokkan balik ke sini pas debugging.
3. Semua cabang **selalu berakhir di Z2** — tidak ada jalur yang berhenti tanpa balasan (kecuali A2 menolak payload non-teks, itu memang bisu).
4. Jumlah node bisa sedikit beda saat dibangun (misal B3 jadi 3 node kecil vs 1 Code node) — yang wajib sama adalah *alur dan perilakunya*, bukan hitungan node.
5. **`from`/`body` selalu diambil by-name: `$('Extract Pesan').first().json`** — output tiap node menimpa data item, jadi setelah blok B data asli sudah tertimpa hasil RPC. Nama node `Extract Pesan` karena itu **dilarang diganti** — semua Code node & `Kirim WA` (`to`) menunjuk nama itu. Detail: `13-workflow-design.md` bagian "Aturan aliran data".
