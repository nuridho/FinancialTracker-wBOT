const crypto = require("crypto");
const { config } = require("../config");

/**
 * Format a number as Indonesian Rupiah string (no "Rp" prefix).
 * Example: 1500000 → "1.500.000"
 */
function formatRupiah(x) {
  const parts = Number(x).toFixed(2).split(".");
  const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimal = parts[1];
  return decimal === "00" ? integer : `${integer},${decimal}`;
}

/**
 * Format a Date as "D Mon YYYY" in Indonesian.
 */
// ponytail: Intl needs full-icu (Node 13+ default). If output looks English, add --icu-data-dir or switch back.
const _tanggalFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
function formatTanggalIndo(d) {
  return _tanggalFmt.format(d);
}

function generateTrxId() {
  return "TRX-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

/**
 * Calculate the current salary/payday period.
 * Period runs from PAYDAY_DATE of last month to PAYDAY_DATE-1 of current month.
 *
 * @param {Date} [refDate=new Date()]
 * @returns {{ start: Date, end: Date }}
 */
function getPeriodeGajian(refDate = new Date()) {
  const day = refDate.getDate();
  const month = refDate.getMonth();
  const year = refDate.getFullYear();
  const payday = config.paydayDate;

  let start, end;
  if (day >= payday) {
    start = new Date(year, month, payday);
    end = new Date(year, month + 1, payday - 1);
  } else {
    start = new Date(year, month - 1, payday);
    end = new Date(year, month, payday - 1);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Sum INCOME vs OUTCOME totals from recorded transactions.
 * @param {Array<{type:string, amt:number}>} records
 * @returns {{income:number, outcome:number}}
 */
function summarizeRecords(records) {
  return records.reduce(
    (acc, r) => {
      if (r.type === "INCOME") acc.income += Number(r.amt) || 0;
      else acc.outcome += Number(r.amt) || 0;
      return acc;
    },
    { income: 0, outcome: 0 }
  );
}

module.exports = { formatRupiah, formatTanggalIndo, generateTrxId, getPeriodeGajian, summarizeRecords };
