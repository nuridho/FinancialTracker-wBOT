const express = require("express");
const router = express.Router();

const { config } = require("../config");
const { getCurrentUserId } = require("../modules/user/user.service");
const { classifyMessage } = require("../modules/ai/ai.service");
const {
  insertTransaksi,
  normalizeRekening,
  getLastTransaction,
  deleteTransactionWithRollback,
  getTransactionCount,
} = require("../modules/transaction/transaction.service");
const { getInputLimit } = require("../modules/user/user.service");
const { setBudget, getBudgetProgress } = require("../modules/budget/budget.service");
const {
  updateSaldo,
  getSaldo,
  getAllSaldo,
  accountExists,
  resyncBalances,
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
    // RULE-BASED — undo / delete / resync (no AI tokens)
    // ================================
    const userId = auth.userId; // ponytail: from checkAuth instead of getCurrentUserId
    const pesanTrim = pesan.trim();

    // Undo last transaction
    if (/^undo$|^hapus\s+transaksi\s+terakhir$/i.test(pesanTrim)) {
      const last = await getLastTransaction(userId);
      if (!last) return res.json({ reply: "Tidak ada transaksi untuk dihapus." });
      const deleted = await deleteTransactionWithRollback(userId, last.trx_id);
      return res.json({
        reply:
          "🗑️ *Undo Berhasil*\n" +
          "━━━━━━━━━━━━━━\n" +
          `ℹ️ *ID:* ${deleted.trx_id}\n` +
          `📂 *Kategori:* ${deleted.category}\n` +
          `💰 *Jumlah:* Rp ${formatRupiah(deleted.amount)}\n` +
          "━━━━━━━━━━━━━━\n" +
          "Transaksi dihapus ✅",
      });
    }

    // Delete by TRX ID
    const deleteMatch = pesanTrim.match(/^hapus\s+(?:transaksi\s+)?(TRX-[A-F0-9]+(?:-TO)?)$/i);
    if (deleteMatch) {
      const deleted = await deleteTransactionWithRollback(userId, deleteMatch[1].toUpperCase());
      if (!deleted) return res.json({ reply: `❌ Transaksi ${deleteMatch[1].toUpperCase()} tidak ditemukan.` });
      return res.json({
        reply:
          "🗑️ *Transaksi Dihapus*\n" +
          "━━━━━━━━━━━━━━\n" +
          `ℹ️ *ID:* ${deleted.trx_id}\n` +
          `📂 *Kategori:* ${deleted.category}\n` +
          `💰 *Jumlah:* Rp ${formatRupiah(deleted.amount)}\n` +
          "━━━━━━━━━━━━━━\n" +
          "Transaksi dihapus ✅",
      });
    }

    // Resync balances
    if (/^resync$|^sync\s+saldo$|^rebuild\s+saldo$/i.test(pesanTrim)) {
      await resyncBalances(userId);
      return res.json({ reply: "🔄 *Saldo Disinkronkan*\nSemua saldo rekening telah dihitung ulang dari riwayat transaksi. ✅" });
    }

    // Set budget: "set budget makan 500000"
    const setBudgetMatch = pesanTrim.match(/^set\s+budget\s+(.+?)\s+(\d+)$/i);
    if (setBudgetMatch) {
      const cat = setBudgetMatch[1].trim();
      const amt = parseInt(setBudgetMatch[2], 10);
      await setBudget(userId, cat, amt);
      return res.json({ reply: `✅ Budget *${cat}* diset ke Rp ${formatRupiah(amt)} per periode.` });
    }

    // Check budget: "budget makan"
    if (/^budget\s+\S/i.test(pesanTrim)) {
      const cat = pesanTrim.replace(/^budget\s+/i, "").trim();
      const periode = getPeriodeGajian(new Date());
      const progress = await getBudgetProgress(userId, cat, periode.start, periode.end);
      return res.json({
        reply: progress || `Budget *${cat}* belum diset.\n\nKetik: *set budget ${cat} [nominal]*`,
      });
    }

    // ================================
    // FINANCIAL LOGIC — AI classification
    // ================================
    let ai = await classifyMessage(pesanTrim);

    // Intent validation — downgrade to GENERAL if invalid
    const validationError = validateIntent(ai);
    if (validationError) {
      console.warn(
        `Validation failed [${ai.intent}]: ${validationError} | Input: ${pesanTrim}`
      );
      ai.intent = "GENERAL";
    }

    // Safe Mode — low confidence
    const confidence = Number(ai.confidence) || 0;
    if (
      (ai.intent === "ADD_TRANSACTION" || ai.intent === "TRANSFER") &&
      confidence < config.confidenceThreshold
    ) {
      return res.json({ reply: buildKonfirmasiMsg(ai, pesanTrim) });
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

      // ── TRANSFER / SWITCH ────────────────────────
      case "TRANSFER": {
        const rekAsal = normalizeRekening(ai.rek_from || "");
        const rekTujuan = normalizeRekening(ai.rek_to || "");
        const jumlah = ai.amt;

        // If destination is one of the user's own accounts → SWITCH (not counted in recap)
        if (await accountExists(userId, rekTujuan)) {
          const trxIdTo = trxId + "-TO";
          await insertTransaksi(userId, trxId,   "SWITCH", "Switch", jumlah, rekAsal,   pesanTrim);
          await insertTransaksi(userId, trxIdTo, "SWITCH", "Switch", jumlah, rekTujuan, pesanTrim);
          await updateSaldo(userId, "OUTCOME", jumlah, rekAsal);
          await updateSaldo(userId, "INCOME",  jumlah, rekTujuan);

          return res.json({
            reply:
              "🔄 *Switch Rekening ✅*\n" +
              "━━━━━━━━━━━━━━\n" +
              `ℹ️ *ID:* ${trxId}\n` +
              `↔️ *Tipe:* SWITCH\n` +
              `💰 *Jumlah:* Rp ${formatRupiah(jumlah)}\n` +
              "━━━━━━━━━━━━━━\n" +
              `💳 *Rekening Asal:* ${rekAsal}\n` +
              `🏦 *Rekening Tujuan:* ${rekTujuan}\n` +
              "━━━━━━━━━━━━━━\n" +
              "Tercatat ✅\n" +
              "ℹ️ Dicatat sebagai SWITCH (tidak dihitung di rekap).\n" +
              `Jika ini pengeluaran ke orang lain, ketik *undo* atau *hapus ${trxId}*`,
          });
        }

        // Destination unknown → treat as OUTCOME from source account
        await insertTransaksi(userId, trxId, "OUTCOME", "Transfer", jumlah, rekAsal, pesanTrim);
        await updateSaldo(userId, "OUTCOME", jumlah, rekAsal);

        return res.json({
          reply:
            "💸 *Transfer Keluar ✅*\n" +
            "━━━━━━━━━━━━━━\n" +
            `ℹ️ *ID:* ${trxId}\n` +
            `💳 *Dari:* ${rekAsal}\n` +
            `🏦 *Ke:* ${rekTujuan}\n` +
            `💰 *Jumlah:* Rp ${formatRupiah(jumlah)}\n` +
            "━━━━━━━━━━━━━━\n" +
            "Tercatat ✅",
        });
      }

      // ── CATAT TRANSAKSI ─────────────────────────
      case "ADD_TRANSACTION": {
        const periode = getPeriodeGajian(new Date());

        // Input limit check (parallel queries)
        const [txCount, inputLimit] = await Promise.all([
          getTransactionCount(userId, periode.start, periode.end),
          getInputLimit(userId),
        ]);
        if (txCount >= inputLimit) {
          return res.json({
            reply: `⚠️ Batas input periode ini (${inputLimit} transaksi) telah tercapai.\n\nUpgrade ke premium untuk input tanpa batas.`,
          });
        }

        const rekening = normalizeRekening(ai.rek || "Cash");
        await insertTransaksi(userId, trxId, ai.type, ai.cat, ai.amt, rekening, pesanTrim);
        await updateSaldo(userId, ai.type, ai.amt, rekening);

        let reply =
          "📝 *Catatan Keuangan*\n" +
          "━━━━━━━━━━━━━━\n" +
          `ℹ️ *ID:* ${trxId}\n` +
          `↔️ *Tipe:* ${ai.type}\n` +
          `📂 *Kategori:* ${ai.cat}\n` +
          `💰 *Jumlah:* Rp ${formatRupiah(ai.amt)}\n` +
          `💳 *Rekening:* ${rekening}\n` +
          "━━━━━━━━━━━━━━\n" +
          "Tercatat ✅";

        // Append budget progress for OUTCOME if budget is set
        if (ai.type === "OUTCOME") {
          const budgetInfo = await getBudgetProgress(userId, ai.cat, periode.start, periode.end);
          if (budgetInfo) reply += `\n${budgetInfo}`;
        }

        return res.json({ reply });
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
