# Finance Service API

Base URL: `http://localhost:3001`

---

## Authentication

### POST /register

Register new user + send verification code.

**Request:**
```json
{
  "email": "user@example.com",
  "waNumber": "628123456789"
}
```

**Response (success):**
```json
{
  "status": "code_sent",
  "message": "📧 Kode verifikasi berhasil dikirim.\n\nUntuk verifikasi, kirim:\nuser@example.com verify-123456"
}
```

**Response (already verified):**
```json
{
  "status": "already_verified",
  "message": "✅ Akun Anda sudah terverifikasi."
}
```

**Response (rate limited):**
```json
{
  "status": "rate_limited",
  "message": "⏳ Terlalu banyak request.\n\nSilakan tunggu 1 menit."
}
```

**Response (email failed):**
```json
{
  "status": "email_failed",
  "message": "❌ Gagal mengirim email: <error>"
}
```

---

### POST /verify

Verify email with 6-digit code.

**Request:**
```json
{
  "email": "user@example.com",
  "waNumber": "628123456789",
  "code": "123456"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "✅ Verifikasi berhasil.\n\nSelamat datang di Financial Tracker Bot."
}
```

**Response (failed):**
```json
{
  "success": false,
  "message": "❌ Kode verifikasi salah atau sudah kadaluarsa.\n\nSilakan kirim email Anda lagi untuk mendapatkan kode baru."
}
```

**Response (rate limited):**
```json
{
  "success": false,
  "message": "⏳ Terlalu banyak percobaan verifikasi.\n\nSilakan tunggu 1 menit."
}
```

---

## Financial Operations

### POST /process

Main endpoint for WhatsApp bot. Handles auth flow + financial commands via natural language.

**Auth flow:**

1. Send email:
```json
{
  "from": "628123456789",
  "body": "user@example.com"
}
```
Response: verification code sent.

2. Send verification:
```json
{
  "from": "628123456789",
  "body": "user@example.com verify-123456"
}
```
Response: verification success.

**Financial commands (requires verified account):**

**Add transaction:**
```json
{
  "from": "628123456789",
  "body": "Makan siang 25rb"
}
```
Response:
```json
{
  "reply": "📝 *Catatan Keuangan*\n━━━━━━━━━━━━━━\nℹ️ *ID:* TRX-ABC123\n↔️ *Tipe:* OUTCOME\n📂 *Kategori:* Makan\n💰 *Jumlah:* Rp 25.000\n💳 *Rekening:* Cash\n━━━━━━━━━━━━━━\nTercatat ✅"
}
```

**Transfer between accounts:**
```json
{
  "from": "628123456789",
  "body": "Transfer 500rb dari BCA ke Dana"
}
```
Response:
```json
{
  "reply": "🔄 *Transfer ✅*\n━━━━━━━━━━━━━━\nℹ️ *ID:* TRX-XYZ789\n💸 *Dari:* BCA\n🏦 *Ke:* Dana\n💰 *Jumlah:* Rp 500.000\n━━━━━━━━━━━━━━\nTercatat ✅"
}
```

**Check balance (specific account):**
```json
{
  "from": "628123456789",
  "body": "saldo BCA"
}
```
Response:
```json
{
  "reply": "💰 Saldo BCA : Rp 1.500.000"
}
```

**Check all balances:**
```json
{
  "from": "628123456789",
  "body": "saldo semua"
}
```
Response:
```json
{
  "reply": "💰 *Ringkasan Saldo*\n━━━━━━━━━━━━━━\nBCA: Rp 1.500.000\nDana: Rp 750.000\nGoPay: Rp 250.000\n━━━━━━━━━━━━━━\n*Total:* Rp 2.500.000"
}
```

**Monthly recap:**
```json
{
  "from": "628123456789",
  "body": "rekap"
}
```
Response:
```json
{
  "reply": "📊 *Rekap Keuangan*\n━━━━━━━━━━━━━━\n📅 *Periode:* 28 Mei - 27 Jun 2025\n\n💰 *Pemasukan:* Rp 7.500.000\n💸 *Pengeluaran:* Rp 3.250.000\n━━━━━━━━━━━━━━\n✅ *Sisa:* Rp 4.250.000\n\n📂 *Top Kategori:*\n1. Makan — Rp 1.200.000\n2. Transport — Rp 800.000\n3. Hiburan — Rp 500.000"
}
```

**Unverified user:**
```json
{
  "from": "628999999999",
  "body": "makan 50rb"
}
```
Response:
```json
{
  "reply": "🔒 Akun belum terverifikasi.\n\nSilakan kirim email Anda.\nContoh:\nuser@example.com"
}
```

**Low confidence / ambiguous:**
```json
{
  "from": "628123456789",
  "body": "makan sushi"
}
```
Response:
```json
{
  "reply": "🤔 Maksudnya ingin mencatat pengeluaran (Makan)?\n\nBalas dengan kalimat yang lebih spesifik, contoh:\n\"Makan Rp 60.000 pake GoPay\""
}
```

**Non-financial:**
```json
{
  "from": "628123456789",
  "body": "Hai, apa kabar?"
}
```
Response:
```json
{
  "reply": "Bukan Track Keuangan! beep boop 🤖"
}
```

---

## Health Check

### GET /health

**Response:**
```json
{
  "status": "ok",
  "service": "finance-service"
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "Field 'body' wajib diisi."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal error: <message>"
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /register | 3 requests/minute per waNumber |
| POST /verify | 5 attempts/minute per waNumber |
| POST /process (auth flow) | Same as above |
| POST /process (financial) | No limit |

---

## AI Intents

Detected by OpenRouter LLM fallback chain:

| Intent | Trigger Examples | Required Fields |
|--------|-----------------|-----------------|
| ADD_TRANSACTION | "makan 25rb", "gajian 5jt" | amt, type (INCOME/OUTCOME), cat, rek |
| TRANSFER | "transfer 500rb BCA ke Dana" | amt, rek_from, rek_to |
| CHECK_BALANCE | "saldo BCA", "berapa BCA?" | rek |
| CHECK_BALANCE_ALL | "saldo semua", "total keuangan" | - |
| GET_RECAP | "rekap", "rekap bulanan" | - |
| GENERAL | anything else | - |

**Confidence threshold:** 70% (configurable via `CONFIDENCE_THRESHOLD` env var)

Below threshold → safe mode confirmation message.

---

## Example curl Commands

**Register:**
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","waNumber":"628123456789"}'
```

**Verify:**
```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","waNumber":"628123456789","code":"123456"}'
```

**Add transaction:**
```bash
curl -X POST http://localhost:3001/process \
  -H "Content-Type: application/json" \
  -d '{"from":"628123456789","body":"Makan siang 25rb gopay"}'
```

**Check balance:**
```bash
curl -X POST http://localhost:3001/process \
  -H "Content-Type: application/json" \
  -d '{"from":"628123456789","body":"saldo BCA"}'
```

**Health check:**
```bash
curl http://localhost:3001/health
```
