const { sbRpc } = require("../utils/supabase");

/**
 * Check if user is verified before accessing financial features
 * @param {string} waNumber - WhatsApp number
 * @returns {Promise<{verified: boolean, userId?: string, message?: string}>}
 */
async function checkAuth(waNumber) {
  // ponytail: test bypass — set TEST_WA_NUMBER + TEST_USER_ID in .env to skip DB lookup
  if (process.env.TEST_WA_NUMBER && waNumber === process.env.TEST_WA_NUMBER) {
    if (!process.env.TEST_USER_ID) throw new Error("TEST_USER_ID wajib diset jika TEST_WA_NUMBER dipakai");
    return { verified: true, userId: process.env.TEST_USER_ID };
  }

  const result = await sbRpc("get_user_by_wa", { p_wa_number: waNumber });
  
  if (!result || result.length === 0) {
    return {
      verified: false,
      message: "🔒 Akun belum terverifikasi.\n\nSilakan kirim email Anda.\nContoh:\nuser@example.com",
    };
  }

  const user = result[0];
  if (!user.is_verified) {
    return {
      verified: false,
      message: "🔒 Akun belum terverifikasi.\n\nSilakan kirim email Anda.\nContoh:\nuser@example.com",
    };
  }

  return { verified: true, userId: user.user_id };
}

module.exports = { checkAuth };
