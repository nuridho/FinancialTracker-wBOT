const { sbRpc } = require("../../utils/supabase");
const { sendVerificationEmail } = require("../email/email.service");
const { isRateLimited, MAX_EMAIL_REQUESTS, MAX_VERIFY_ATTEMPTS } = require("./rate-limit");

/**
 * Handle email registration request
 * @param {string} waNumber - WhatsApp number (628xxx)
 * @param {string} email - User email
 * @returns {Promise<{status: string, message: string, code?: string}>}
 */
async function requestEmailVerification(waNumber, email) {
  // rate limiting
  if (isRateLimited(`email:${waNumber}`, MAX_EMAIL_REQUESTS)) {
    return {
      status: "rate_limited",
      message: `⏳ Terlalu banyak request.\n\nSilakan tunggu 1 menit.`,
    };
  }
  // ponytail: check if user exists first
  const existingUser = await sbRpc("get_user_by_wa", { p_wa_number: waNumber });
  
  if (existingUser && existingUser.length > 0 && existingUser[0].is_verified) {
    return {
      status: "already_verified",
      message: "✅ Akun Anda sudah terverifikasi.",
    };
  }

  // create or find user by email
  const userResult = await sbRpc("create_or_get_user_by_email", { p_email: email });
  if (!userResult || userResult.length === 0) {
    throw new Error("Failed to create/get user");
  }
  const userId = userResult[0].id;

  // create or update WA session
  await sbRpc("upsert_wa_session", { p_user_id: userId, p_wa_number: waNumber });

  // generate auth code (saved in wa_sessions)
  const codeResult = await sbRpc("generate_auth_code", { p_wa_number: waNumber });
  const code = codeResult[0].code;

  // send email via Resend
  const emailResult = await sendVerificationEmail(email, code);
  
  if (!emailResult.success) {
    return {
      status: "email_failed",
      message: `❌ Gagal mengirim email: ${emailResult.message}`,
    };
  }

  return {
    status: "code_sent",
    message: `📧 Kode verifikasi berhasil dikirim.\n\nUntuk verifikasi, kirim:\n${email} verify-${code}`,
    code, // ponytail: return code for testing, remove in production
  };
}

/**
 * Verify auth code
 * @param {string} waNumber
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function verifyAuthCode(waNumber, email, code) {
  // rate limiting
  if (isRateLimited(`verify:${waNumber}`, MAX_VERIFY_ATTEMPTS)) {
    return {
      success: false,
      message: `⏳ Terlalu banyak percobaan verifikasi.\n\nSilakan tunggu 1 menit.`,
    };
  }

  const result = await sbRpc("verify_auth_code", { p_wa_number: waNumber, p_code: code });
  
  if (!result || result.length === 0 || !result[0].success) {
    return {
      success: false,
      message: "❌ Kode verifikasi salah atau sudah kadaluarsa.\n\nSilakan kirim email Anda lagi untuk mendapatkan kode baru.",
    };
  }

  // mark user as verified
  const userResult = await sbRpc("get_user_by_wa", { p_wa_number: waNumber });
  if (userResult && userResult.length > 0) {
    await sbRpc("mark_user_verified", { p_user_id: userResult[0].user_id });
  }

  return {
    success: true,
    message: "✅ Verifikasi berhasil.\n\nSelamat datang di Financial Tracker Bot.",
  };
}

module.exports = {
  requestEmailVerification,
  verifyAuthCode,
};
