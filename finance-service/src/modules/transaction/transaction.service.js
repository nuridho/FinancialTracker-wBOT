const { sbPost } = require("../../utils/supabase");

/**
 * Insert a single transaction row.
 */
async function insertTransaksi(userId, trxId, type, category, amount, accountName, message) {
  await sbPost("transactions", {
    user_id: userId,
    trx_id: trxId,
    type,
    category,
    amount,
    account_name: accountName,
    message,
    created_at: new Date().toISOString(),
  });
}

/**
 * Normalize account/rekening aliases to canonical names.
 * @param {string} nama
 * @returns {string}
 */
function normalizeRekening(nama) {
  if (!nama) return nama;
  const n = nama.trim().toLowerCase();

  const aliases = {
    jago: "Bank Jago",
    "bank jago": "Bank Jago",
    bca: "BCA",
    "bank bca": "BCA",
    "bank central asia": "BCA",
    bri: "BRI",
    "bank bri": "BRI",
    "bank rakyat indonesia": "BRI",
    bni: "BNI",
    "bank bni": "BNI",
    "bank negara indonesia": "BNI",
    mandiri: "Mandiri",
    "bank mandiri": "Mandiri",
    gopay: "GoPay",
    "go pay": "GoPay",
    ovo: "OVO",
    dana: "Dana",
    shopeepay: "ShopeePay",
    "shopee pay": "ShopeePay",
    spay: "ShopeePay",
    cash: "Cash",
    tunai: "Cash",
    "uang tunai": "Cash",
    "uang cash": "Cash",
  };

  return aliases[n] || nama.trim();
}

module.exports = { insertTransaksi, normalizeRekening };
