const { sbRpc } = require("../utils/supabase");

// ================================
// AUTH — USER IDENTITY
//
// Sekarang: hardcode UUID untuk testing.
// Nanti (setelah auth WA siap): uncomment bagian
// sbRpc di bawah dan hapus hardcode return.
// ================================

const HARDCODED_USER_ID = "dc09a82c-1701-4c35-9799-8da5ff555dcc";

/**
 * Resolve user_id from a WhatsApp number.
 * @param {string} waNumber
 * @returns {Promise<string>} UUID
 */
async function getCurrentUserId(waNumber) {
  // ⚠️  TEMPORARY — ganti dengan UUID user kamu dari tabel users
  return HARDCODED_USER_ID;

  // ---- FUTURE: uncomment setelah auth WA siap ----
  // const rows = await sbRpc("get_user_by_wa", { p_wa_number: waNumber });
  // if (!rows || rows.length === 0)
  //   throw new Error("User tidak ditemukan. Silakan registrasi.");
  // if (!rows[0].is_verified)
  //   throw new Error("Nomor WA belum terverifikasi.");
  // return rows[0].user_id;
}

module.exports = { getCurrentUserId };
