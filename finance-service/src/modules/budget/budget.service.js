const { sbGet, sbUpsert } = require("../../utils/supabase");
const { formatRupiah } = require("../../utils/helpers");

async function setBudget(userId, category, amount) {
  await sbUpsert("budgets", { user_id: userId, category, amount });
}

/**
 * Returns formatted budget progress string, or null if no budget set.
 */
async function getBudgetProgress(userId, category, start, end) {
  const budgetRows = await sbGet("budgets", `user_id=eq.${userId}&category=eq.${encodeURIComponent(category)}&select=amount`);
  const budget = budgetRows?.[0]?.amount;
  if (!budget) return null;

  const spentRows = await sbGet(
    "transactions",
    `user_id=eq.${userId}&type=eq.OUTCOME&category=eq.${encodeURIComponent(category)}` +
    `&created_at=gte.${start.toISOString()}&created_at=lte.${end.toISOString()}&select=amount`
  );
  const spent = (spentRows || []).reduce((s, r) => s + Number(r.amount), 0);
  const percent = Math.round((spent / Number(budget)) * 100);

  return `📊 *Budget ${category}*\nRp ${formatRupiah(spent)} / Rp ${formatRupiah(budget)} (${percent}%)`;
}

module.exports = { setBudget, getBudgetProgress };
