const express = require("express");
const router = express.Router();

const { config } = require("../config");
const { getCurrentUserId } = require("../modules/user/user.service");
const { classifyMessage } = require("../modules/ai/ai.service");
const {
  insertTransaksi,
  normalizeRekening,
} = require("../modules/transaction/transaction.service");
const {
  updateSaldo,
  getSaldo,
  getAllSaldo,
} = require("../modules/account/account.service");
const { generateRekap } = require("../modules/recap/recap.service");
const {
  generateTrxId,
  formatRupiah,
  getPeriodeGajian,
} = require("../utils/helpers");
const { checkAuth } = require("../middleware/auth.middleware");
const {
  requestEmailVerification,
  verifyAuthCode,
} = require("../modules/auth/auth.service");

// ================================
// INTENT VALIDATION
// ================================
function validateIntent(ai) {
  switch (ai.intent) {
    case "ADD_TRANSACTION":
      if (!ai.amt || Number(ai.amt) <= 0) return "nominal tidak ada / 0";
      if (!ai.type || (ai.type !== "INCOME" && ai.type !== "OUTCOME"))
        return "type tidak valid";
      break;
    case "TRANSFER":
      if (!ai.amt || Number(ai.amt) <= 0)
        return "nominal transfer tidak ada / 0";
      if (!ai.rek_from) return "rekening asal tidak terdeteksi";
      if (!ai.rek_to) return "rekening tujuan tidak terdeteksi";
      break;
    case "CHECK_BALANCE":
      if (!ai.rek) return "nama rekening tidak terdeteksi";
      break;
  }
  return null;
}

// ================================
// SAFE MODE — pesan konfirmasi
// ================================
function buildKonfirmasiMsg(ai, pesanAsli) {
  if (ai.intent === "ADD_TRANSACTION") {
    const tipe = ai.type === "INCOME" ? "pemasukan" : "pengeluaran";
    const kat = ai.cat ? ` (${ai.cat})` : "";
    const nom = ai.amt ? ` Rp ${formatRupiah(ai.amt)}` : "";
    return (
      `🤔 Maksudnya ingin mencatat ${tipe}${kat}${nom}?\n\n` +
      `Balas dengan kalimat yang lebih spesifik, contoh:\n` +
      `"${ai.cat || "Makan"}${nom} pake ${ai.rek || "Cash"}"`
    );
  }
  if (ai.intent === "TRANSFER") {
    return (
      "🤔 Mau transfer, tapi info kurang lengkap.\n\n" +
      'Contoh format yang valid:\n"Transfer 500rb dari BCA ke Gopay"'
    );
  }
  return "Bukan Track Keuangan! beep boop 🤖";
}

// ================================
// POST /process  — main entry point
// Called by messaging-service with { from, body }
// ================================
router.post("/process", async (req, res) => {
  const { from: waNumber, body: pesan } = req.body;

  if (!pesan || typeof pesan !== "string") {
    return res.status(400).json({ error: "Field 'body' wajib diisi." });
  }

  const trxId = generateTrxId();

  try {
    // ================================
    // AUTH FLOW — Email verification
    // ================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const verifyRegex = /^([^\s@]+@[^\s@]+\.[^\s@]+)\s+verify-(\d{6})$/;

    // Step 1: User kirim email untuk request verification code
    if (emailRegex.test(pesan.trim()) && !verifyRegex.test(pesan.trim())) {
      const email = pesan.trim().toLowerCase();
      const result = await requestEmailVerification(waNumber, email);
      return res.json({ reply: result.message });
    }

    // Step 2: User kirim email + verification code
    const verifyMatch = pesan.trim().match(verifyRegex);
    if (verifyMatch) {
      const email = verifyMatch[1].toLowerCase();
      const code = verifyMatch[2];
      const result = await verifyAuthCode(waNumber, email, code);
      return res.json({ reply: result.message });
    }

    // Step 3: Check if user is verified
    const auth = await checkAuth(waNumber);
    if (!auth.verified) {
      return res.json({ reply: auth.message });
    }

    // ================================
    // FINANCIAL LOGIC — AI classification
    // ================================
    const userId = auth.userId; // ponytail: from checkAuth instead of getCurrentUserId
    let ai = await classifyMessage(pesan.trim());

    // Intent validation — downgrade to GENERAL if invalid
    const validationError = validateIntent(ai);
    if (validationError) {
      console.warn(
        `Validation failed [${ai.intent}]: ${validationError} | Input: ${pesan}`
      );
      ai.intent = "GENERAL";
    }

    // Safe Mode — low confidence
    const confidence = Number(ai.confidence) || 0;
    if (
      (ai.intent === "ADD_TRANSACTION" || ai.intent === "TRANSFER") &&
      confidence < config.confidenceThreshold
    ) {
      return res.json({ reply: buildKonfirmasiMsg(ai, pesan) });
    }

    switch (ai.intent) {

      // ── CEK SALDO SPESIFIK ──────────────────────
      case "CHECK_BALANCE": {
        const rekNorm = normalizeRekening(ai.rek || "");
        const saldo = await getSaldo(userId, rekNorm);
        return res.json({
          reply: `💰 Saldo ${rekNorm} : Rp ${formatRupiah(saldo)}`,
        });
      }

      // ── CEK SALDO SEMUA ─────────────────────────
      case "CHECK_BALANCE_ALL": {
        const reply = await getAllSaldo(userId);
        return res.json({ reply });
      }

      // ── REKAP PERIODE ───────────────────────────
      case "GET_RECAP": {
        const periode = getPeriodeGajian(new Date());
        const reply = await generateRekap(userId, periode.start, periode.end);
        return res.json({ reply });
      }

      // ── TRANSFER ────────────────────────────────
      case "TRANSFER": {
        const rekAsal = normalizeRekening(ai.rek_from || "");
        const rekTujuan = normalizeRekening(ai.rek_to || "");
        const jumlah = ai.amt;
        const trxIdTo = trxId + "-TO";

        await insertTransaksi(userId, trxId, "OUTCOME", "Transfer", jumlah, rekAsal, pesan);
        await insertTransaksi(userId, trxIdTo, "INCOME", "Transfer", jumlah, rekTujuan, pesan);
        await updateSaldo(userId, "OUTCOME", jumlah, rekAsal);
        await updateSaldo(userId, "INCOME", jumlah, rekTujuan);

        return res.json({
          reply:
            "🔄 *Transfer ✅*\n" +
            "━━━━━━━━━━━━━━\n" +
            `ℹ️ *ID:* ${trxId}\n` +
            `💸 *Dari:* ${rekAsal}\n` +
            `🏦 *Ke:* ${rekTujuan}\n` +
            `💰 *Jumlah:* Rp ${formatRupiah(jumlah)}\n` +
            "━━━━━━━━━━━━━━\n" +
            "Tercatat ✅",
        });
      }

      // ── CATAT TRANSAKSI ─────────────────────────
      case "ADD_TRANSACTION": {
        const rekening = normalizeRekening(ai.rek || "Cash");

        await insertTransaksi(userId, trxId, ai.type, ai.cat, ai.amt, rekening, pesan);
        await updateSaldo(userId, ai.type, ai.amt, rekening);

        return res.json({
          reply:
            "📝 *Catatan Keuangan*\n" +
            "━━━━━━━━━━━━━━\n" +
            `ℹ️ *ID:* ${trxId}\n` +
            `↔️ *Tipe:* ${ai.type}\n` +
            `📂 *Kategori:* ${ai.cat}\n` +
            `💰 *Jumlah:* Rp ${formatRupiah(ai.amt)}\n` +
            `💳 *Rekening:* ${rekening}\n` +
            "━━━━━━━━━━━━━━\n" +
            "Tercatat ✅",
        });
      }

      // ── GENERAL / FALLBACK ──────────────────────
      case "GENERAL":
      default:
        return res.json({ reply: "Bukan Track Keuangan! beep boop 🤖" });
    }
  } catch (err) {
    console.error("finance-service ERROR:", err.message);
    return res
      .status(500)
      .json({ error: `Internal error: ${err.message}` });
  }
});

// ================================
// POST /register — explicit registration
// ================================
router.post("/register", async (req, res) => {
  const { email, waNumber } = req.body;
  if (!email || !waNumber) {
    return res.status(400).json({ error: "email and waNumber required" });
  }
  try {
    const result = await requestEmailVerification(waNumber, email.toLowerCase());
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================================
// POST /verify — explicit verification
// ================================
router.post("/verify", async (req, res) => {
  const { email, waNumber, code } = req.body;
  if (!email || !waNumber || !code) {
    return res.status(400).json({ error: "email, waNumber, and code required" });
  }
  try {
    const result = await verifyAuthCode(waNumber, email.toLowerCase(), code);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================================
// GET /health
// ================================
router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "finance-service" });
});

module.exports = router;
