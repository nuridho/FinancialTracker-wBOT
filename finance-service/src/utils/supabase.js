const axios = require("axios");
const { config } = require("../config");

const headers = () => ({
  apikey: config.supabase.key,
  Authorization: `Bearer ${config.supabase.key}`,
  "Content-Type": "application/json",
});

/**
 * GET from a Supabase table.
 * @param {string} table
 * @param {string} [queryString] - PostgREST query params, e.g. "user_id=eq.xxx&select=name"
 */
async function sbGet(table, queryString = "") {
  const url = `${config.supabase.url}/rest/v1/${table}${
    queryString ? "?" + queryString : ""
  }`;

  const res = await axios.get(url, { headers: headers() });
  return res.data;
}

/**
 * POST (insert) a row into a Supabase table.
 * @param {string} table
 * @param {object} payload
 */
async function sbPost(table, payload) {
  const url = `${config.supabase.url}/rest/v1/${table}`;

  await axios.post(url, payload, {
    headers: { ...headers(), Prefer: "return=minimal" },
  });
}

/**
 * Upsert a row (insert or update on conflict via primary key).
 * @param {string} table
 * @param {object} payload
 */
async function sbUpsert(table, payload) {
  const url = `${config.supabase.url}/rest/v1/${table}`;
  await axios.post(url, payload, {
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
  });
}

/**
 * DELETE rows from a Supabase table.
 * @param {string} table
 * @param {string} queryString - PostgREST filter, e.g. "user_id=eq.xxx&trx_id=eq.yyy"
 */
async function sbDelete(table, queryString) {
  const url = `${config.supabase.url}/rest/v1/${table}?${queryString}`;
  await axios.delete(url, { headers: { ...headers(), Prefer: "return=minimal" } });
}

/**
 * Parse a PostgREST Content-Range header into a total count.
 * Example: "0-0/42" -> 42 | no rows -> 0 | undefined -> 0
 */
function parseCount(contentRange) {
  return Number(String(contentRange || "").split("/")[1]) || 0;
}

/**
 * Count rows matching a filter without fetching them (HEAD + count=exact).
 * @param {string} table
 * @param {string} [queryString] - PostgREST filter, no select needed
 */
async function sbCount(table, queryString = "") {
  const url = `${config.supabase.url}/rest/v1/${table}${queryString ? "?" + queryString : ""}`;
  const res = await axios.head(url, { headers: { ...headers(), Prefer: "count=exact" } });
  return parseCount(res.headers["content-range"]);
}

/**
 * Call a Supabase RPC function.
 * @param {string} fnName
 * @param {object} params
 */
async function sbRpc(fnName, params) {
  const url = `${config.supabase.url}/rest/v1/rpc/${fnName}`;
  
  try {
    const res = await axios.post(url, params, { headers: headers() });
    return res.data;
  } catch (err) {
    console.error(`[sbRpc] ${fnName} failed:`, err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sbGet, sbPost, sbUpsert, sbDelete, sbRpc, sbCount, parseCount };
