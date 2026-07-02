# 15 — Feature Comparison: Node.js (sekarang) vs n8n (target)

Perbandingan **per fitur**: bagaimana implementasinya di codebase Node.js sekarang, bagaimana jadinya di n8n, dan apa yang berubah. Dipakai sebagai checklist paritas saat fase validasi — setiap baris di sini harus berperilaku sama di kedua sistem sebelum cutover.

**Legenda kolom "Perubahan":**
- 🟢 **Sama persis** — logic/kode disalin verbatim, cuma wadahnya beda
- 🟡 **Adaptasi kecil** — logic sama, ada penyesuaian teknis (axios→fetch, dsb)
- 🔴 **Redesign** — cara kerjanya beda karena sifat n8n (in-memory → DB, dsb)

---

## 1. Gateway WhatsApp

| Aspek | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Terima pesan | Baileys socket — `messaging-service` harus online 24/7 menjaga sesi WA Web; scan QR saat setup; risiko banned (unofficial) | Meta **push** ke Webhook node lewat WA Cloud API resmi — tidak ada proses yang menunggu, tidak ada QR, tidak ada risiko banned | 🔴 |
| Kirim balasan | `sock.sendMessage()` via socket Baileys | HTTP Request node → `POST graph.facebook.com/v19.0/{PHONE_ID}/messages` + Bearer token | 🔴 |
| Filter pesan | `messaging-service` strip group/broadcast/self | Code node "Extract": hanya proses `type === "text"`, payload non-pesan berhenti diam-diam | 🟡 |
| Format payload | `{from, body}` buatan sendiri | Payload webhook Meta → di-extract jadi `{from, body}` di node pertama — kontrak inti tetap hidup | 🟡 |
| Nomor WA | Nomor pribadi yang di-link | Nomor baru khusus bot (syarat Cloud API) — bonus: bisa test paralel dengan bot lama | 🔴 |

**Kenapa redesign ini menguntungkan:** komponen paling rapuh di sistem lama (sesi Baileys putus = bot mati sampai di-scan ulang) hilang total. Tidak ada padanan "session health check" karena tidak ada sesi.

## 2. Autentikasi & keamanan

| Aspek | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Deteksi email / kode verify | Regex di `finance.route.js:111-128`, dicek sebelum `checkAuth` | IF node dengan regex **yang sama persis** | 🟢 |
| Buat & kirim kode 6 digit | RPC `generate_auth_code` → Resend via axios | RPC yang sama → **Resend node resmi** | 🟢 |
| Validasi kode | RPC `verify_auth_code` (sekali pakai, expire 10 menit) | RPC yang sama, tidak disentuh | 🟢 |
| Cek user tiap pesan | `checkAuth()` → RPC `get_user_by_wa` | Supabase node RPC yang sama + IF node | 🟢 |
| Rate limit email/verify | **In-memory Map** (`rate-limit.js`) — hilang saat restart, tidak jalan multi-instance | **Tabel `rate_limits` + RPC `check_rate_limit`** — atomik, survive restart | 🔴 |
| Guard antar-service | `INTERNAL_API_KEY` header check di `index.js` | **Hilang by design** — pemanggil webhook sekarang Meta (tidak kirim header custom kita). Pengaman: Verify Token handshake (Workflow 0) + opsional validasi `X-Hub-Signature-256` | 🔴 (disengaja) |
| Known issue: `code` ikut di response | Ada (auth.service.js:57, buat testing) | **Tidak dibawa** — cabang AUTH dirancang tanpa field ini | 🔴 (disengaja) |
| Bypass test (`TEST_WA_NUMBER`) | `checkAuth` skip DB kalau `from` = `test-runner` (env) | **Tidak dibawa** — test langsung tembak webhook dengan payload Meta palsu berisi nomor test; tidak perlu (dan tidak boleh) ada jalur bypass di production | 🔴 (disengaja) |
| Endpoint `/register` & `/verify` eksplisit | Ada di route (dipakai tooling/testing) | **Tidak dibawa** — alur regex di workflow sudah menutupi; tambah webhook terpisah hanya kalau mobile butuh nanti | 🔴 (disengaja) |
| Endpoint `/health` | `GET /health` selalu terbuka | Health endpoint bawaan instance n8n (`/healthz`) — tidak perlu bikin | 🟡 |

**Catatan:** redesign rate limit ini sebenarnya membayar utang lama — "in-memory tidak survive restart" sudah tercatat sebagai known issue sejak sebelum ada rencana n8n.

## 3. Rule-based intercept (perintah tanpa AI)

Semua regex disalin **verbatim** dari `finance.route.js:143-217` ke satu Switch node. Perilaku identik, hemat token AI tetap terjaga.

| Perintah | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| `undo` / `hapus transaksi terakhir` | Regex → `getLastTransaction` → RPC `delete_transaction_with_rollback` | Switch → Supabase select terakhir → RPC yang sama | 🟢 |
| `hapus TRX-XXXX` | Regex → RPC delete by ID | Switch → RPC yang sama | 🟢 |
| `resync` / `sync saldo` | Regex → RPC `resync_balances` | Switch → RPC yang sama | 🟢 |
| `set budget [cat] [num]` | Regex → upsert `budgets` | Switch → Supabase upsert | 🟢 |
| `budget [cat]` | Regex → hitung periode → progress | Switch → langkah yang sama (helper `getPeriodeGajian` di-copy ke Code node) | 🟢 |
| `rekap mingguan` / `rekap 7 hari` | Regex → window 7 hari → `generateRekap` | Switch → langkah yang sama | 🟢 |
| `rekap ... tanggal N` | Regex → `getPeriodeGajian(now, N)` clamp 1–28 | Switch → langkah yang sama | 🟢 |

## 4. AI classification

| Aspek | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Prompt classifier | `buildPrompt()` di `ai.service.js` (hasil kompresi ~47%) | Disalin **verbatim** ke `code-nodes/classify.js` — dilarang diubah saat migrasi | 🟢 |
| 7-model fallback chain | Loop try/catch antar model, `temperature: 0`, timeout 30 detik | Loop yang sama di Code node | 🟢 |
| HTTP client | axios | `fetch` bawaan + `AbortSignal.timeout(30000)` — karena Sumopod belum tentu izinkan module npm eksternal | 🟡 |
| Parse & bersihkan output | strip ```` ```json ```` → `JSON.parse`, gagal → model berikutnya | Sama persis | 🟢 |
| `validateIntent` (downgrade ke GENERAL) | Fungsi di `finance.route.js:38-60` | Copy verbatim ke Code node | 🟢 |
| Safe Mode (confidence < 70) | `buildKonfirmasiMsg` di route | Copy verbatim, threshold sama (70) | 🟢 |
| Prompt injection guard | System message kunci role AI | Sama persis (ikut di classify.js) | 🟢 |

## 5. Eksekusi transaksi

| Fitur | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Catat INCOME/OUTCOME (`recordAdd`) | `generateTrxId` → `normalizeRekening` → insert → RPC `upsert_account_balance` | Langkah sama; `generateTrxId` ganti `crypto.randomBytes` → `crypto.getRandomValues` (Web Crypto global) | 🟡 |
| `normalizeRekening` (alias 80+ bank/e-wallet) | Map hardcoded di `transaction.service.js` | Copy verbatim ke Code node | 🟢 |
| TRANSFER → SWITCH vs OUTCOME | Cek `rek_to` ada di `accounts` → SWITCH 2 baris (+`-TO`) atau OUTCOME | Alur node yang sama: Supabase select → IF → insert+RPC | 🟢 |
| MULTI (beberapa transaksi 1 pesan) | Loop `recordAdd` per item, reply gabungan + total + budget per kategori | Loop Over Items node atau loop di Code node — output identik | 🟡 |
| Input limit freemium (200/periode) | `sbCount` (HEAD + `count=exact`) + `input_limit` dari users, batch MULTI ditolak utuh kalau lewat | Supabase node return count → IF — aturan sama persis | 🟢 |
| Budget progress otomatis setelah OUTCOME | Di-append ke reply tiap OUTCOME (ADD & MULTI per kategori unik) | Langkah yang sama setelah insert | 🟢 |
| Cek saldo / semua saldo | Select `accounts` + format | Node yang sama | 🟢 |
| GENERAL / input tak dikenali | Reply statis "Bukan Track Keuangan! beep boop 🤖" | Cabang default Switch intent — teks sama | 🟢 |
| Format semua balasan (emoji, garis, TRX ID, tanggal `Intl` id-ID) | String template di route + `formatTanggalIndo` | Disalin **verbatim** — penting untuk validasi (diff output lama vs baru harus kosong). `Intl` id-ID tersedia di Node modern bawaan n8n | 🟢 |

## 6. Rekap & insight

| Aspek | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Agregasi rekap | Loop JS in-memory di `recap.service.js` | Logic sama di-copy ke Code node (known trade-off "harusnya SQL GROUP BY" ikut terbawa — perbaikan terpisah, bukan bagian migrasi) | 🟢 |
| Top spending 🥇🥈🥉 | 3-line diff di `recap.service.js` | Ikut ter-copy | 🟢 |
| AI insight 1 kalimat | `generateInsight()` → OpenRouter fallback chain | `orFetch` yang sama dari classify.js | 🟢 |
| Cache insight | **In-memory Map, TTL 1 jam** — hilang saat restart | **Tabel `insight_cache`** (kolom `expires_at`) — bonus: survive restart | 🔴 |

## 7. Operasional (perbedaan paling terasa sehari-hari)

| Aspek | Node.js sekarang | n8n target | Perubahan |
|---|---|---|---|
| Error di tengah proses | Route catch-all → 500 → messaging-service tetap kirim pesan gagal generik ke user | ⚠️ Webhook sudah dijawab 200 di awal (syarat Meta) — kalau workflow error di tengah, **user tidak dapat balasan apa pun** kecuali dibuat **Error Trigger workflow** yang kirim pesan gagal. Wajib dibangun, jangan dilewati | 🔴 (butuh mitigasi) |
| Debugging | Baca `console.log` / stack trace di terminal server | **Execution log visual**: tiap run tercatat, klik node mana pun → lihat input/output persisnya. Alasan utama migrasi ini dipilih | 🔴 |
| Deploy perubahan | Edit file → restart service (atau CI/CD kalau dibangun) | Edit workflow di browser → Save. Tidak ada deploy | 🔴 |
| Server maintenance | Milik sendiri: update OS, patch, restart, uptime | Sumopod yang urus container; Meta yang urus WA | 🔴 |
| Concurrency | Async I/O Node.js — puluhan request bersamaan gratis tanpa config | Default n8n cukup untuk skala pribadi; kalau rame: `N8N_CONCURRENCY_PRODUCTION_LIMIT` dulu, queue mode (Redis+worker) kalau benar-benar perlu | 🔴 |
| Testing | `npm test` — 67 kasus otomatis + unit test offline | Postman collection di-retarget ke webhook; assert otomatis `runner.js` hilang, validasi jadi semi-manual | 🔴 (kompromi terbesar migrasi ini) |
| Version control | `git diff` per baris kode | Export JSON workflow (`n8n export:workflow --all`) — bisa di-commit, tapi diff JSON tidak seenak diff kode | 🔴 |
| Biaya | VPS ~60rb/bln + waktu ops | Sumopod ~15–60rb/bln, ops nyaris nol | 🟡 |

---

## Ringkasan

**🟢 Sama persis (mayoritas):** seluruh logic bisnis — regex intercept, prompt AI, fallback chain, validasi intent, aturan SWITCH/MULTI/limit, format balasan, dan SEMUA fungsi PostgreSQL. Ini yang membuat migrasi ini layak: yang pindah itu *wadah*, bukan *isi*.

**🟡 Adaptasi kecil (detail teknis, perilaku tidak berubah):** axios → fetch, `crypto.randomBytes` → `getRandomValues`, payload Meta → extract `{from, body}`, filter pesan non-teks, `/health` → healthz bawaan n8n.

**🔴 Redesign (5 area):** gateway WA (Baileys → Cloud API — sudah direncanakan sejak lama), rate limit & insight cache (in-memory → tabel — membayar utang lama), debugging/deploy/ops (justru alasan migrasinya), **error di tengah proses** (wajib bikin Error Trigger workflow supaya user tetap dapat balasan saat gagal — lihat `13-workflow-design.md`), dan testing (satu-satunya yang *lebih buruk* di n8n — mitigasi: fase validasi paralel sebelum cutover).

**🔴 Disengaja tidak dibawa (4):** field `code` di reply auth (known issue lama), bypass `TEST_WA_NUMBER` (lubang keamanan kalau kebawa production), endpoint `/register`/`/verify` eksplisit (alur regex sudah menutupi), guard `INTERNAL_API_KEY` (pemanggil webhook sekarang Meta — penggantinya Verify Token + opsional signature).

Baris mana pun yang perilakunya beda antara bot lama dan n8n saat validasi = bug migrasi, bukan "perbedaan wajar" — kecuali yang memang ditandai disengaja di atas.
