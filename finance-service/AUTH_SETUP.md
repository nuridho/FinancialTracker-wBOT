# Auth Setup — Resend API

Setup autentikasi email menggunakan Resend API untuk verifikasi user sebelum menggunakan financial tracker bot.

---

## Flow

```
User kirim pesan → finance-service cek verifikasi status
├── Belum verified → Minta email
├── Email dikirim → Generate kode 6 digit → Kirim ke email via Resend
└── User kirim email + kode → Verifikasi berhasil → Akses penuh
```

---

## Step-by-step Setup

### 1. Daftar Resend

1. Buka [resend.com](https://resend.com)
2. Signup gratis (3000 email/bulan)
3. Buka **API Keys → Create API Key**
4. Copy API key

### 2. Setup Domain (Optional — Production)

Untuk production, pakai domain sendiri:

1. Buka **Domains → Add Domain**
2. Tambahkan domain (misal: `mail.yourdomain.com`)
3. Ikuti instruksi DNS setup (DKIM, SPF, DMARC)
4. Tunggu verifikasi (biasanya < 5 menit)
5. Gunakan `noreply@mail.yourdomain.com` sebagai `RESEND_FROM_EMAIL`

Untuk testing, pakai default `onboarding@resend.dev` (gratis, langsung bisa).

### 3. Environment Variables

Tambahkan ke `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev  # atau noreply@mail.yourdomain.com
```

### 4. Run Supabase Migration

Jalankan SQL functions yang dibutuhkan:

```bash
# Buka Supabase dashboard → SQL Editor
# Paste & run isi file:
Supabase/auth_functions.sql
```

Functions yang ditambahkan:
- `create_or_get_user_by_email(p_email)` — Buat user baru atau ambil existing
- `upsert_wa_session(p_user_id, p_wa_number)` — Insert/update WA session
- `mark_user_verified(p_user_id)` — Tandai user sebagai verified
- `generate_auth_code(p_wa_number)` — Generate 6 digit code, valid 10 menit
- `verify_auth_code(p_wa_number, p_code)` — Validasi code, one-time use

### 5. Test Flow

Jalankan service:

```bash
npm run dev
```

Test via curl atau messaging-service:

**Step 1: User kirim email**
```json
POST /process
{ "from": "628123456789", "body": "user@example.com" }

Response:
{
  "reply": "📧 Kode verifikasi berhasil dikirim.\n\nUntuk verifikasi, kirim:\nuser@example.com verify-123456"
}
```

**Step 2: Cek inbox email**
Email berisi kode 6 digit.

**Step 3: User kirim email + kode**
```json
POST /process
{ "from": "628123456789", "body": "user@example.com verify-123456" }

Response:
{
  "reply": "✅ Verifikasi berhasil.\n\nSelamat datang di Financial Tracker Bot."
}
```

**Step 4: Akses financial features**
```json
POST /process
{ "from": "628123456789", "body": "Makan siang 25rb" }

Response:
{
  "reply": "📝 *Catatan Keuangan*\n..."
}
```

---

## Rate Limiting

Otomatis aktif untuk mencegah spam:

| Action | Limit |
|--------|-------|
| Email request | 3 per menit |
| Verification attempt | 5 per menit |

Rate limit disimpan di in-memory Map (ponytail: cukup untuk single-instance deployment). Untuk multi-instance, gunakan Redis.

---

## Security Notes

1. **Code expiration**: 10 menit (configurable di `generate_auth_code`)
2. **One-time use**: Code dihapus setelah berhasil diverifikasi
3. **Case-insensitive email**: Otomatis lowercase
4. **WA number binding**: 1 nomor WA = 1 user (enforce di wa_sessions.wa_number unique constraint)

---

## Troubleshooting

**Email tidak terkirim**
- Cek API key valid
- Cek domain verified (untuk custom domain)
- Cek Resend dashboard → Logs untuk error detail

**Kode expired**
- Default 10 menit, kirim ulang email untuk generate kode baru

**Rate limited**
- Tunggu 1 menit sebelum request ulang

**User tidak bisa akses setelah verifikasi**
- Cek `users.is_verified = true` di Supabase
- Cek `wa_sessions.is_active = true`

---

## Next Steps

- [ ] Implement forgot password / reset verification
- [ ] Add session timeout (auto-logout setelah X hari tidak aktif)
- [ ] Multi-device support (1 user, multiple WA numbers)
- [ ] Email template customization via Resend dashboard

Selesai. Auth layer siap production.
