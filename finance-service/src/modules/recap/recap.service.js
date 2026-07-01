const { sbGet } = require("../../utils/supabase");
const { formatRupiah, formatTanggalIndo } = require("../../utils/helpers");
const { generateInsight } = require("../ai/ai.service");

/**
 * Generate a spending recap for a given date range.
 * @param {string} userId
 * @param {Date} start
 * @param {Date} end
 * @returns {Promise<string>}
 */
async function generateRekap(userId, start, end) {
  const rows = await sbGet(
    "transactions",
    `user_id=eq.${userId}` +
      `&created_at=gte.${start.toISOString()}` +
      `&created_at=lte.${end.toISOString()}` +
      `&select=type,category,amount` +
      `&order=created_at.asc`
  );

  const transactions = rows || [];
  let totalIncome = 0;
  let totalOutcome = 0;
  const perKategori = {};

  for (const row of transactions) {
    const jumlah = Number(row.amount) || 0;
    if (row.type === "INCOME") {
      totalIncome += jumlah;
    } else if (row.type === "OUTCOME") {
      totalOutcome += jumlah;
      const kat = row.category || "Lainnya";
      perKategori[kat] = (perKategori[kat] || 0) + jumlah;
    }
  }

  let output = "📊 *Rekap Periode*\n";
  output += `${formatTanggalIndo(start)} - ${formatTanggalIndo(end)}\n`;
  output += "━━━━━━━━━━━━━━\n";
  output += `🟢 Pemasukan: Rp ${formatRupiah(totalIncome)}\n`;
  output += `🔴 Pengeluaran: Rp ${formatRupiah(totalOutcome)}\n`;
  output += `💵 Selisih: Rp ${formatRupiah(totalIncome - totalOutcome)}\n`;

  const kategoriList = Object.keys(perKategori);
  if (kategoriList.length > 0) {
    const medals = ["🥇", "🥈", "🥉"];
    output += "━━━━━━━━━━━━━━\n*Breakdown Pengeluaran:*\n";
    kategoriList
      .sort((a, b) => perKategori[b] - perKategori[a])
      .forEach((kat, i) => {
        output += `${medals[i] || "▪️"} ${kat}: Rp ${formatRupiah(perKategori[kat])}\n`;
      });
  }

  // ponytail: insight adds ~5-30s on first call, instant on cache hit
  const cacheKey = `${userId}:${start.toISOString()}:${end.toISOString()}`;
  const insight = await generateInsight(cacheKey, output).catch(() => null);
  if (insight) output += `━━━━━━━━━━━━━━\n💡 *Insight:* ${insight}`;

  return output;
}

module.exports = { generateRekap };
