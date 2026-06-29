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
function formatTanggalIndo(d) {
  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Generate a random transaction ID.
 * Example: "TRX-3A9F2C1B"
 */
function generateTrxId() {
  const bytes = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
  );
  return (
    "TRX-" +
    bytes
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
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

module.exports = { formatRupiah, formatTanggalIndo, generateTrxId, getPeriodeGajian };
