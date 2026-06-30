const { Resend } = require("resend");
const { config } = require("../../config");

const resend = new Resend(config.resend.apiKey);

/**
 * Send verification email via Resend API
 * @param {string} email - Target email
 * @param {string} code - 6 digit verification code
 */
async function sendVerificationEmail(email, code) {
  if (!config.resend.apiKey) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return { success: false, message: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: config.resend.fromEmail,
      to: email,
      subject: "🔐 Verifikasi Akun Finance Tracker",
      html: `
        <h2>Kode Verifikasi Anda</h2>
        <p>Untuk menyelesaikan verifikasi, balas ke WhatsApp dengan format:</p>
        <pre>${email} verify-${code}</pre>
        <p>Kode berlaku <b>10 menit</b>.</p>
        <p>Jika Anda tidak meminta kode ini, abaikan email ini.</p>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("Resend email error:", err.message);
    return { success: false, message: err.message };
  }
}

module.exports = { sendVerificationEmail };
