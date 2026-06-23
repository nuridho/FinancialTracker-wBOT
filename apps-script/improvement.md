# 💰 Financial Tracker Bot — Roadmap

> WhatsApp-based personal finance tracker powered by AI + Google Sheets

---

## 🚀 MVP Status

### ✅ Sudah Selesai

| Fitur | Deskripsi |
|---|---|
| **Catat Transaksi** | Income & Outcome dengan berbagai format nominal (`rb`, `jt`, `k`, raw) |
| **Auto-detect** | Kategori, rekening, dan tipe transaksi otomatis dari teks natural |
| **Cek Saldo** | Saldo spesifik satu rekening atau ringkasan semua rekening |
| **Transfer Antar Rekening** | Saldo asal berkurang, tujuan bertambah, tercatat di sheet |
| **Rekap Bulanan** | Periode otomatis ikut tanggal gajian + breakdown per kategori |
| **Safe Mode** | Confidence rendah → minta konfirmasi sebelum eksekusi |
| **Intent Validation** | No amount → reject, type invalid → reject |
| **Prompt Injection Guard** | Instruksi berbahaya dalam pesan diabaikan |
| **Normalisasi Rekening** | "Jago" dan "Bank Jago" → dikenali sebagai rekening yang sama |
| **AI Fallback Chain** | 7 model fallback jika primary kena rate limit |

---

## 📋 To-Do

### 🔴 Mandatory Features

#### [TRANSACTION]
- [ ] **Hapus Transaksi Terakhir**
  - Input: `"undo"`, `"hapus transaksi terakhir"`
  - Action: Hapus baris terakhir di sheet Transaksi + kembalikan saldo rekening terkait

#### [BUDGETING]
- [ ] **Budget Per Kategori**
  - Pre-condition: Budget disimpan di spreadsheet/config
  - Input: `"budget makan"`, `"budget transport"`
  - Output:
    ```
    Progress Budget Makan:
    Rp450.000 / Rp1.500.000 (30%)
    ```
  - Additional: Tampilkan progress budget otomatis setiap transaksi outcome dicatat

#### [ANALYTICS]
- [ ] **Top Spending Category**
  - Output:
    ```
    🥇 Makan : Rp1.200.000
    🥈 Transport : Rp700.000
    🥉 Hiburan : Rp500.000
    ```
  - Kondisi: Berdasarkan total pengeluaran periode berjalan (dari awal gajian)

#### [REPORTING]
- [ ] **Rekap Mingguan**
  - Input: `"rekap mingguan"`
  - Output: Total pemasukan, total pengeluaran, top kategori, ringkasan minggu berjalan

- [ ] **AI Insight Rekap Bulanan**
  - Input: `"rekap"`, `"rekap bulanan"`
  - Output:
    - Perbandingan vs bulan sebelumnya
    - Top spending category
    - Trend pengeluaran
    - Budget analysis
    - AI recommendation

---

### 🟡 Optional Features

#### [ADVANCED REPORTING]
- [ ] **Custom Rekap Period**
  - Input: `"rekap dari tanggal 25"`
  - Action: Periode mengikuti tanggal yang diinput user
  - Default: 28 → 27 bulan berikutnya

#### [GOOGLE SHEET]
- [ ] **Sheet Rekap Otomatis**
  - Generate summary otomatis sebagai sumber dashboard

#### [DASHBOARD]
- [ ] **Web Dashboard**
  - Daftar transaksi & rekening
  - Rekap bulanan & mingguan
  - Budget tracking
  - Top spending category
  - AI insight

---

### 🔵 Technical Improvement

#### [TESTING]
- [ ] Comprehensive Unit Testing
- [ ] Integration Testing
- [ ] API Endpoint Testing
- [ ] Automated test coverage reporting

#### [CODE QUALITY]
- [ ] Refactor transaction service
- [ ] Refactor account service
- [ ] Improve error handling
- [ ] Centralized logger

#### [CONTAINERIZATION]
- [ ] Create Docker Compose Configuration
- [ ] Environment Variable Management
- [ ] Persistent Session Volume
- [ ] Multi-stage Docker Build
- [ ] Production-ready Docker Image

#### [INFRASTRUCTURE]
- [ ] Deploy Docker Container to VPS
- [ ] Configure Nginx Reverse Proxy
- [ ] Setup SSL (Let's Encrypt)
- [ ] Setup CI/CD with GitHub Actions
- [ ] Automated Google Sheet Backup
- [ ] Automated Container Restart Policy

#### [MONITORING]
- [ ] Application logging
- [ ] Uptime monitoring
- [ ] WhatsApp session health check

#### [DOCUMENTATION]
- [ ] API Documentation
- [ ] Deployment Guide
- [ ] Architecture Diagram
- [ ] Self Hosting Guide

---

### 🗄️ Database (Future)

- [ ] **Design SQL Schema**
- [ ] **Migrate Data Layer**
- [ ] **Index Optimization**

---

## 📊 Model Fallback Chain

| Priority | Model | Tier |
|---|---|---|
| 1 | `openai/gpt-oss-120b:free` | T1 — Primary terbukti |
| 2 | `meta-llama/llama-3.3-70b-instruct:free` | T1 — Quality tinggi |
| 3 | `qwen/qwen3-next-80b-a3b-instruct:free` | T2 — Throughput tinggi |
| 4 | `openai/gpt-oss-20b:free` | T3 — Versi kecil primary |
| 5 | `nvidia/nemotron-3-super-120b-a12b:free` | T2 — Model besar |
| 6 | `google/gemma-4-31b-it:free` | T2 — Reliable |
| 7 | `nvidia/nemotron-3-nano-30b-a3b:free` | T3 — Paling cepat |