// ...existing code...
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs").promises;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const FINNHUB = process.env.FINNHUB_API_KEY;
const PORT = process.env.PORT || 4000;
const PORTFOLIO_FILE = "./portfolio.json";

async function readPortfolio() {
  try {
    const raw = await fs.readFile(PORTFOLIO_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}
async function writePortfolio(data) {
  await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(data, null, 2));
}

app.get("/api/quotes", async (req, res) => {
  const symbols = (req.query.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) return res.status(400).json({ error: "symbols required" });

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const [quoteRes, profileRes, metricRes] = await Promise.all([
          axios.get("https://finnhub.io/api/v1/quote", { params: { symbol, token: FINNHUB } }),
          axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB } }),
          axios.get("https://finnhub.io/api/v1/stock/metric", { params: { symbol, metric: "all", token: FINNHUB } }),
        ]);
        const quote = quoteRes.data || {};
        const profile = profileRes.data || {};
        const metric = metricRes.data?.metric || {};
        return {
          symbol,
          name: profile.name || "N/A",
          current: quote.c || null,
          change: quote.d || null,
          percent: quote.dp || null,
          high: quote.h || null,
          low: quote.l || null,
          volume: metric["10DayAverageTradingVolume"] || "N/A",
          marketCap: metric.marketCapitalization ?? "N/A",
          pe: metric.peNormalizedAnnual ?? "N/A",
        };
      })
    );
    res.json(results);
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ error: "failed to fetch quotes" });
  }
});

app.get("/api/stock/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const [quoteRes, profileRes] = await Promise.all([
      axios.get("https://finnhub.io/api/v1/quote", { params: { symbol, token: FINNHUB } }),
      axios.get("https://finnhub.io/api/v1/stock/profile2", { params: { symbol, token: FINNHUB } }),
    ]);
    res.json({ quote: quoteRes.data, profile: profileRes.data });
  } catch (err) {
    res.status(500).json({ error: "failed to fetch stock" });
  }
});

// Portfolio (file-backed)
app.get("/api/portfolio", async (req, res) => {
  res.json(await readPortfolio());
});

app.post("/api/portfolio", async (req, res) => {
  const portfolio = await readPortfolio();
  portfolio.push(req.body);
  await writePortfolio(portfolio);
  res.status(201).json(portfolio);
});

app.delete("/api/portfolio/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  let portfolio = await readPortfolio();
  portfolio = portfolio.filter(p => p.symbol !== symbol);
  await writePortfolio(portfolio);
  res.json(portfolio);
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
// ...existing code...