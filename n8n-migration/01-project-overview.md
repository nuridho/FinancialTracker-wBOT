# 01 — Project Overview

## Apa itu Git Finance

Bot keuangan pribadi berbasis AI di WhatsApp. User kirim pesan bahasa natural (Indonesia/Inggris/campur) ke nomor WA — bot mengklasifikasi maksudnya, mencatat transaksi, cek saldo, dan bikin rekap pengeluaran. **Tanpa install aplikasi apa pun** — WhatsApp adalah antarmukanya.

```
"warteg 25rb bca"                    → tercatat: OUTCOME Makan Rp 25.000 dari BCA
"transfer 500rb dari bca ke gopay"   → tercatat: SWITCH antar rekening sendiri
"saldo gopay"                        → 💰 Saldo GoPay : Rp xxx
"rekap mingguan"                     → breakdown 7 hari + AI insight
```

## Masalah yang diselesaikan

Aplikasi pencatat keuangan gagal karena friksi: buka app → pilih kategori → isi form. Orang menyerah dalam seminggu. Git Finance memindahkan pencatatan ke tempat orang sudah berada tiap hari (WhatsApp) dan menghapus form (AI yang mengekstrak kategori/nominal/rekening dari kalimat biasa).

## Status proyek (Jul 2026)

- **Fitur inti selesai dan tertest** — 67 test case end-to-end + unit test offline. Lihat [08-development-roadmap.md](08-development-roadmap.md).
- **Belum production** — masih jalan lokal/dev; ada beberapa known issue pre-production (lihat `CLAUDE.md` root).
- **Dua rencana besar berikutnya**: migrasi backend ke n8n ([12-n8n-migration.md](12-n8n-migration.md)) dan aplikasi mobile ([10-mobile-apps.md](10-mobile-apps.md)).

## Tech stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Gateway WA | Baileys (unofficial) | Akan diganti Official WA Cloud API saat migrasi n8n |
| Backend | Node.js + Express (2 service terpisah) | Akan digantikan workflow n8n |
| AI | OpenRouter — 7 model free-tier, fallback berantai | Classify intent + generate insight |
| Database | Supabase (PostgreSQL) | Diakses via REST API mentah (axios), bukan SDK |
| Email | Resend | Kirim kode verifikasi 6 digit |
| Testing | Runner custom + Postman collection | `testing-service/` |

## Filosofi desain

1. **Rule-based dulu, AI belakangan** — perintah yang bisa dikenali regex (undo, resync, budget, rekap) dicegat sebelum menyentuh AI. Hemat token, lebih cepat, deterministik.
2. **AI tidak dipercaya begitu saja** — output AI divalidasi ulang (`validateIntent`), confidence rendah → Safe Mode (minta konfirmasi user, tidak ada tulisan ke DB).
3. **Operasi uang harus atomik** — perubahan saldo & delete dilakukan di fungsi PostgreSQL (satu transaksi DB), bukan langkah-langkah terpisah di JS.
4. **Interface antar komponen sengaja tipis** — `{from, body}` → `{reply}`. Gateway WA bisa diganti (Baileys → Cloud API) tanpa menyentuh logic.
