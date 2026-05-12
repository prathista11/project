const fs = require("fs").promises;
const path = require("path");

const PORTFOLIO_FILE = path.join(__dirname, "portfolio.json");

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeHolding(item) {
  const quantity = toFiniteNumber(item.quantity);
  const price = toFiniteNumber(item.price);
  const invested =
    item.invested !== undefined && item.invested !== null
      ? toFiniteNumber(item.invested)
      : price * quantity;

  return {
    symbol: String(item.symbol || "").trim().toUpperCase(),
    companyName: String(item.companyName || item.name || "").trim(),
    price,
    quantity,
    invested,
  };
}

function normalizePortfolio(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(normalizeHolding)
    .filter((item) => item.symbol && item.quantity > 0);
}

async function readPortfolio() {
  try {
    const raw = await fs.readFile(PORTFOLIO_FILE, "utf8");
    return normalizePortfolio(JSON.parse(raw || "[]"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writePortfolio(data) {
  await fs.writeFile(
    PORTFOLIO_FILE,
    JSON.stringify(normalizePortfolio(data), null, 2)
  );
}

module.exports = {
  normalizeHolding,
  normalizePortfolio,
  readPortfolio,
  writePortfolio,
};
