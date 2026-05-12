const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const {
  clearSessionCookie,
  createSession,
  hashPassword,
  readSession,
  sessionCookie,
  verifyPassword,
} = require("./auth");
const { request, serviceToken } = require("./postgrestClient");
const {
  applyQuantityDelta,
  buyHolding,
  listPortfolio,
  removeHolding,
  sellHolding,
} = require("./portfolioService");

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());

const FINNHUB = process.env.FINNHUB_API_KEY;
const PORT = process.env.PORT || 4000;
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
const QUOTE_CACHE_TTL_MS = 30 * 1000;
const quoteCache = new Map();

if (!FINNHUB) {
  console.error("FINNHUB_API_KEY is required. Add it to backend/.env.");
  process.exit(1);
}

function normalizeSymbol(value) {
  const symbol = String(value || "").trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : "";
}

function parsePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function publicUser(user) {
  return { id: user.id, email: user.email };
}

function requireAuth(req, res, next) {
  try {
    const session = readSession(req);
    if (!session?.sub) {
      return res.status(401).json({ error: "login required" });
    }
    req.user = { id: session.sub, email: session.email };
    return next();
  } catch (err) {
    console.error("auth error:", err.message || err);
    return res.status(500).json({ error: "authentication is not configured" });
  }
}

async function findUserByEmail(email) {
  const rows = await request("/users", {
    token: serviceToken(),
    params: {
      email: `eq.${email}`,
      select: "id,email,password_hash",
      limit: "1",
    },
  });
  return rows[0] || null;
}

async function createUser(email, password) {
  const created = await request("/users", {
    method: "POST",
    token: serviceToken(),
    body: {
      email,
      password_hash: await hashPassword(password),
    },
  });
  const user = created[0];
  await request("/portfolios", {
    method: "POST",
    token: serviceToken(),
    body: { user_id: user.id, name: "Default" },
  });
  return user;
}

function sendSession(res, user) {
  res.setHeader("Set-Cookie", sessionCookie(createSession(user)));
  return res.json({ user: publicUser(user) });
}

async function fetchFinnhub(endpoint, params) {
  const response = await axios.get(`https://finnhub.io/api/v1/${endpoint}`, {
    params: { ...params, token: FINNHUB },
    timeout: 10000,
  });
  return response.data || {};
}

async function fetchQuoteSummary(symbol) {
  const cacheKey = `quote-summary:${symbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < QUOTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const [quote, profile, metricResponse] = await Promise.all([
    fetchFinnhub("quote", { symbol }),
    fetchFinnhub("stock/profile2", { symbol }),
    fetchFinnhub("stock/metric", { symbol, metric: "all" }),
  ]);
  const metric = metricResponse.metric || {};

  const data = {
    symbol,
    name: profile.name || "N/A",
    current: Number.isFinite(Number(quote.c)) ? Number(quote.c) : null,
    change: Number.isFinite(Number(quote.d)) ? Number(quote.d) : null,
    percent: Number.isFinite(Number(quote.dp)) ? Number(quote.dp) : null,
    high: Number.isFinite(Number(quote.h)) ? Number(quote.h) : null,
    low: Number.isFinite(Number(quote.l)) ? Number(quote.l) : null,
    volume: metric["10DayAverageTradingVolume"] || "N/A",
    marketCap: metric.marketCapitalization ?? "N/A",
    pe: metric.peNormalizedAnnual ?? "N/A",
  };

  quoteCache.set(cacheKey, { createdAt: Date.now(), data });
  return data;
}

async function fetchStockDetail(symbol) {
  const cacheKey = `stock-detail:${symbol}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < QUOTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const [quote, profile] = await Promise.all([
    fetchFinnhub("quote", { symbol }),
    fetchFinnhub("stock/profile2", { symbol }),
  ]);
  const data = { quote, profile };

  quoteCache.set(cacheKey, { createdAt: Date.now(), data });
  return data;
}

app.get("/api/quotes", async (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map(normalizeSymbol)
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ error: "symbols required" });
  }

  try {
    const uniqueSymbols = [...new Set(symbols)].slice(0, 25);
    const results = await Promise.all(uniqueSymbols.map(fetchQuoteSummary));
    res.json(results);
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ error: "failed to fetch quotes" });
  }
});

app.get("/api/stock/:symbol", async (req, res) => {
  const symbol = normalizeSymbol(req.params.symbol);
  if (!symbol) {
    return res.status(400).json({ error: "valid symbol required" });
  }

  try {
    res.json(await fetchStockDetail(symbol));
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ error: "failed to fetch stock" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !email.includes("@") || password.length < 8) {
      return res
        .status(400)
        .json({ error: "valid email and 8 character password required" });
    }
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: "email already registered" });
    }

    return sendSession(res, await createUser(email, password));
  } catch (err) {
    console.error("POST /api/auth/register error:", err);
    res.status(500).json({ error: "failed to register" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = email ? await findUserByEmail(email) : null;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    return sendSession(res, user);
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    res.status(500).json({ error: "failed to log in" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  try {
    const session = readSession(req);
    res.json({ user: session?.sub ? publicUser({ id: session.sub, email: session.email }) : null });
  } catch {
    res.json({ user: null });
  }
});

app.get("/api/portfolio", requireAuth, async (req, res) => {
  try {
    res.json(await listPortfolio(req.user.id));
  } catch (err) {
    console.error("GET /api/portfolio error:", err);
    res.status(500).json({ error: "failed to load portfolio" });
  }
});

app.post("/api/portfolio", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const symbol = normalizeSymbol(body.symbol);
    const companyName = String(body.companyName || body.name || "").trim();
    const price = parseNonNegativeNumber(body.price);
    const qty = parsePositiveNumber(body.quantity);

    if (!symbol || !qty || price === null) {
      return res
        .status(400)
        .json({ error: "valid symbol, price, and quantity required" });
    }

    const portfolio = await buyHolding(req.user.id, {
      symbol,
      companyName,
      price,
      quantity: qty,
    });
    res.status(200).json(portfolio);
  } catch (err) {
    console.error("POST /api/portfolio error:", err);
    res.status(500).json({ error: "failed to add to portfolio" });
  }
});

app.patch("/api/portfolio/:symbol", requireAuth, async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.params.symbol);
    const qtyDelta = Number(req.body.quantity);
    const hasPrice = req.body.price !== undefined;
    const priceBody = hasPrice ? Number(req.body.price) : undefined;
    const companyName = String(req.body.companyName || "").trim();

    if (!symbol || !Number.isFinite(qtyDelta) || qtyDelta === 0) {
      return res
        .status(400)
        .json({ error: "valid symbol and non-zero quantity required" });
    }
    if (hasPrice && (!Number.isFinite(priceBody) || priceBody < 0)) {
      return res.status(400).json({ error: "price must be zero or greater" });
    }

    const portfolio = await applyQuantityDelta(req.user.id, {
      symbol,
      companyName,
      price: hasPrice ? priceBody : undefined,
      quantity: qtyDelta,
    });
    res.json(portfolio);
  } catch (err) {
    console.error("PATCH /api/portfolio/:symbol error:", err);
    res.status(err.status || 500).json({
      error: err.status ? err.message : "failed to update portfolio",
    });
  }
});

app.post("/api/portfolio/sell", requireAuth, async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.body.symbol);
    const qty = parsePositiveNumber(req.body.quantity);

    if (!symbol || !qty) {
      return res.status(400).json({ error: "Invalid sell request" });
    }

    res.json(await sellHolding(req.user.id, symbol, qty));
  } catch (err) {
    console.error("Error in /api/portfolio/sell:", err);
    res.status(err.status || 500).json({
      error: err.status ? err.message : "Failed to sell stock",
    });
  }
});

app.delete("/api/portfolio/:symbol", requireAuth, async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.params.symbol);
    if (!symbol) {
      return res.status(400).json({ error: "valid symbol required" });
    }

    res.json(await removeHolding(req.user.id, symbol));
  } catch (err) {
    console.error("DELETE /api/portfolio/:symbol error:", err);
    res.status(500).json({ error: "failed to delete from portfolio" });
  }
});

app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
