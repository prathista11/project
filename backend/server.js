// server.js (backend)
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

/* ---------------- Quotes / Stock endpoints ---------------- */
app.get("/api/quotes", async (req, res) => {
  const symbols = (req.query.symbols || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ error: "symbols required" });
  }

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const [quoteRes, profileRes, metricRes] = await Promise.all([
          axios.get("https://finnhub.io/api/v1/quote", {
            params: { symbol, token: FINNHUB },
          }),
          axios.get("https://finnhub.io/api/v1/stock/profile2", {
            params: { symbol, token: FINNHUB },
          }),
          axios.get("https://finnhub.io/api/v1/stock/metric", {
            params: { symbol, metric: "all", token: FINNHUB },
          }),
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
      axios.get("https://finnhub.io/api/v1/quote", {
        params: { symbol, token: FINNHUB },
      }),
      axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol, token: FINNHUB },
      }),
    ]);
    res.json({ quote: quoteRes.data, profile: profileRes.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch stock" });
  }
});

/* ---------------- Portfolio endpoints (file-backed) ---------------- */

/**
 * GET /api/portfolio
 * returns portfolio array
 */
app.get("/api/portfolio", async (req, res) => {
  res.json(await readPortfolio());
});

/**
 * POST /api/portfolio
 * Add a stock or increase quantity if it already exists.
 * Body: { symbol, companyName, price, quantity }
 * Also tracks: invested = total money spent on this symbol.
 */
app.post("/api/portfolio", async (req, res) => {
  try {
    const body = req.body || {};
    const symbol = (body.symbol || "").toUpperCase();
    const companyName = body.companyName || body.name || "";
    const price = Number(body.price) || 0;
    const qty = Number(body.quantity) || 0;

    if (!symbol || !qty || isNaN(qty)) {
      return res
        .status(400)
        .json({ error: "symbol and numeric quantity required" });
    }

    let portfolio = await readPortfolio();

    const existing = portfolio.find(
      (p) => (p.symbol || "").toUpperCase() === symbol
    );

    if (existing) {
      const oldQty = Number(existing.quantity || 0);
      const oldInvested =
        existing.invested != null
          ? Number(existing.invested)
          : (Number(existing.price) || 0) * oldQty;

      const newQty = oldQty + qty;
      const newInvested = oldInvested + price * qty;

      existing.quantity = newQty;
      existing.invested = newInvested;
      if (price) existing.price = price;
      if (companyName) existing.companyName = companyName;
    } else {
      portfolio.push({
        symbol,
        companyName,
        price,
        quantity: qty,
        invested: price * qty,
      });
    }

    await writePortfolio(portfolio);
    res.status(200).json(portfolio);
  } catch (err) {
    console.error("POST /api/portfolio error:", err);
    res.status(500).json({ error: "failed to add to portfolio" });
  }
});

/**
 * PATCH /api/portfolio/:symbol
 * Increment (or decrement) quantity for a symbol.
 * Body: { quantity: number (positive to add, negative to subtract), price?, companyName? }
 * If quantity makes total <= 0, the item is removed.
 * Also keeps invested consistent (average-cost for selling).
 */
app.patch("/api/portfolio/:symbol", async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    const qtyDelta = Number(req.body.quantity);
    const priceBody =
      req.body.price !== undefined ? Number(req.body.price) : undefined;
    const companyName = req.body.companyName;

    if (!symbol || isNaN(qtyDelta)) {
      return res
        .status(400)
        .json({ error: "symbol and numeric quantity required" });
    }

    let portfolio = await readPortfolio();
    const idx = portfolio.findIndex(
      (p) => (p.symbol || "").toUpperCase() === symbol
    );

    if (idx === -1) {
      if (qtyDelta > 0) {
        const price = priceBody || 0;
        portfolio.push({
          symbol,
          companyName: companyName || "",
          price,
          quantity: qtyDelta,
          invested: price * qtyDelta,
        });
      } else {
        return res.status(404).json({ error: "Stock not found" });
      }
    } else {
      const stock = portfolio[idx];
      const oldQty = Number(stock.quantity || 0);
      const oldInvested =
        stock.invested != null
          ? Number(stock.invested)
          : (Number(stock.price) || 0) * oldQty;

      const priceToUse =
        priceBody !== undefined && !isNaN(priceBody)
          ? priceBody
          : Number(stock.price) || 0;

      if (qtyDelta > 0) {
        const newQty = oldQty + qtyDelta;
        const newInvested = oldInvested + priceToUse * qtyDelta;
        stock.quantity = newQty;
        stock.invested = newInvested;
      } else if (qtyDelta < 0) {
        const sellQty = Math.min(oldQty, Math.abs(qtyDelta));
        const avgCost = oldQty > 0 ? oldInvested / oldQty : 0;
        const newQty = oldQty - sellQty;
        const newInvested = oldInvested - avgCost * sellQty;

        if (newQty <= 0) {
          portfolio.splice(idx, 1);
        } else {
          stock.quantity = newQty;
          stock.invested = newInvested;
        }
      }

      if (!isNaN(priceToUse) && priceToUse) stock.price = priceToUse;
      if (companyName) stock.companyName = companyName;
    }

    await writePortfolio(portfolio);
    res.json(portfolio);
  } catch (err) {
    console.error("PATCH /api/portfolio/:symbol error:", err);
    res.status(500).json({ error: "failed to update portfolio" });
  }
});

/**
 * POST /api/portfolio/sell
 * Sell a specific quantity of a stock
 * Body: { symbol, quantity }
 * Also reduces invested using average cost.
 */
app.post("/api/portfolio/sell", async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const qty = Number(quantity);

    if (!symbol || !qty || qty <= 0) {
      return res.status(400).json({ error: "Invalid sell request" });
    }

    let portfolio = await readPortfolio();
    const idx = portfolio.findIndex(
      (item) =>
        (item.symbol || "").toUpperCase() === (symbol || "").toUpperCase()
    );

    if (idx === -1) {
      return res.status(404).json({ error: "Stock not found in portfolio" });
    }

    const holding = portfolio[idx];
    const qtyHeld = Number(holding.quantity || 0);
    const invested =
      holding.invested != null
        ? Number(holding.invested)
        : (Number(holding.price) || 0) * qtyHeld;

    if (qty > qtyHeld) {
      return res
        .status(400)
        .json({ error: `You only own ${qtyHeld} shares` });
    }

    const avgCost = qtyHeld > 0 ? invested / qtyHeld : 0;

    if (qty === qtyHeld) {
      // sold all
      portfolio.splice(idx, 1);
    } else {
      holding.quantity = qtyHeld - qty;
      holding.invested = invested - avgCost * qty;
    }

    await writePortfolio(portfolio);
    res.json(portfolio);
  } catch (err) {
    console.error("Error in /api/portfolio/sell:", err);
    res.status(500).json({ error: "Failed to sell stock" });
  }
});

/**
 * DELETE /api/portfolio/:symbol
 * Remove symbol entirely from portfolio
 */
app.delete("/api/portfolio/:symbol", async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    let portfolio = await readPortfolio();
    portfolio = portfolio.filter(
      (p) => (p.symbol || "").toUpperCase() !== symbol
    );
    await writePortfolio(portfolio);
    res.json(portfolio);
  } catch (err) {
    console.error("DELETE /api/portfolio/:symbol error:", err);
    res.status(500).json({ error: "failed to delete from portfolio" });
  }
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);