const { sbGet } = require("../../utils/supabase");

async function getInputLimit(userId) {
  const rows = await sbGet("users", `id=eq.${userId}&select=input_limit`);
  return rows?.[0]?.input_limit ?? 200;
}

module.exports = { getInputLimit };
