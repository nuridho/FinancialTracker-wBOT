const { sbGet, sbPost, sbRpc, sbCount } = require("../../utils/supabase");

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
    // ── Bank Nasional ───────────────────────────────────────────
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
    bsi: "BSI",
    "bank bsi": "BSI",
    "bank syariah indonesia": "BSI",
    btn: "BTN",
    "bank btn": "BTN",
    "bank tabungan negara": "BTN",
    bukopin: "KB Bukopin",
    "bank bukopin": "KB Bukopin",
    "kb bukopin": "KB Bukopin",
    cimb: "CIMB Niaga",
    "cimb niaga": "CIMB Niaga",
    "bank cimb": "CIMB Niaga",
    "bank cimb niaga": "CIMB Niaga",
    danamon: "Danamon",
    "bank danamon": "Danamon",
    permata: "Bank Permata",
    "bank permata": "Bank Permata",
    mega: "Bank Mega",
    "bank mega": "Bank Mega",
    ocbc: "OCBC",
    "ocbc nisp": "OCBC",
    "bank ocbc": "OCBC",
    "bank ocbc nisp": "OCBC",
    maybank: "Maybank",
    "bank maybank": "Maybank",
    uob: "UOB",
    "bank uob": "UOB",
    hsbc: "HSBC",
    "bank hsbc": "HSBC",
    citi: "Citibank",
    citibank: "Citibank",
    "standard chartered": "Standard Chartered",
    scb: "Standard Chartered",
    // ── Bank Digital ────────────────────────────────────────────
    jago: "Bank Jago",
    "bank jago": "Bank Jago",
    jenius: "Jenius",
    btpn: "Jenius",
    "bank btpn": "Jenius",
    seabank: "SeaBank",
    "sea bank": "SeaBank",
    "bank seabank": "SeaBank",
    blu: "Blu BCA",
    "blu bca": "Blu BCA",
    "bank blu": "Blu BCA",
    neo: "Neo Bank",
    neobank: "Neo Bank",
    "neo bank": "Neo Bank",
    "bank neo": "Neo Bank",
    "bank neo commerce": "Neo Bank",
    "line bank": "Line Bank",
    linebank: "Line Bank",
    allo: "Allo Bank",
    "allo bank": "Allo Bank",
    allobank: "Allo Bank",
    digibank: "Digibank",
    dbs: "Digibank",
    "bank dbs": "Digibank",
    motion: "Motion Bank",
    "motion bank": "Motion Bank",
    "bank mnc": "Motion Bank",
    // ── E-Wallet ────────────────────────────────────────────────
    gopay: "GoPay",
    "go pay": "GoPay",
    ovo: "OVO",
    dana: "Dana",
    shopeepay: "ShopeePay",
    "shopee pay": "ShopeePay",
    spay: "ShopeePay",
    linkaja: "LinkAja",
    "link aja": "LinkAja",
    flip: "Flip",
    // ── Cash ────────────────────────────────────────────────────
    cash: "Cash",
    tunai: "Cash",
    "uang tunai": "Cash",
    "uang cash": "Cash",
  };

  return aliases[n] || nama.trim();
}

/**
 * Get the most recent transaction for a user.
 */
async function getLastTransaction(userId) {
  const rows = await sbGet(
    "transactions",
    `user_id=eq.${userId}&order=created_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

/**
 * Delete a transaction (and its transfer pair if applicable) and reverse the balance impact.
 * Atomic — runs in a single PostgreSQL transaction via RPC.
 * Returns the deleted main transaction, or null if not found.
 */
async function deleteTransactionWithRollback(userId, trxId) {
  const result = await sbRpc("delete_transaction_with_rollback", {
    p_user_id: userId,
    p_trx_id: trxId,
  });
  return result?.[0] || null;
}

/**
 * Count INCOME + OUTCOME transactions in a date range (used for input limit).
 * Server-side count — no rows pulled into memory.
 */
async function getTransactionCount(userId, start, end) {
  return sbCount(
    "transactions",
    `user_id=eq.${userId}&type=in.(INCOME,OUTCOME)` +
    `&created_at=gte.${start.toISOString()}&created_at=lte.${end.toISOString()}`
  );
}

module.exports = { insertTransaksi, normalizeRekening, getLastTransaction, deleteTransactionWithRollback, getTransactionCount };
