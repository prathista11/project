const { request, userToken } = require("./postgrestClient");

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mapHolding(row) {
  return {
    symbol: row.symbol,
    companyName: row.company_name || "",
    price: toNumber(row.price),
    quantity: toNumber(row.quantity),
    invested: toNumber(row.invested),
  };
}

async function getDefaultPortfolio(userId) {
  const token = userToken(userId);
  const rows = await request("/portfolios", {
    token,
    params: {
      user_id: `eq.${userId}`,
      select: "id,user_id,name",
      limit: "1",
      order: "created_at.asc",
    },
  });

  if (rows.length) return rows[0];

  const created = await request("/portfolios", {
    method: "POST",
    token,
    body: { user_id: userId, name: "Default" },
  });
  return created[0];
}

async function listPortfolio(userId) {
  const portfolio = await getDefaultPortfolio(userId);
  const rows = await request("/holdings", {
    token: userToken(userId),
    params: {
      portfolio_id: `eq.${portfolio.id}`,
      select: "symbol,company_name,price,quantity,invested",
      order: "symbol.asc",
    },
  });
  return rows.map(mapHolding);
}

async function getHolding(userId, portfolioId, symbol) {
  const rows = await request("/holdings", {
    token: userToken(userId),
    params: {
      portfolio_id: `eq.${portfolioId}`,
      symbol: `eq.${symbol}`,
      select: "id,symbol,company_name,price,quantity,invested",
      limit: "1",
    },
  });
  return rows[0] || null;
}

async function createHolding(userId, portfolioId, holding) {
  await request("/holdings", {
    method: "POST",
    token: userToken(userId),
    body: {
      portfolio_id: portfolioId,
      symbol: holding.symbol,
      company_name: holding.companyName || "",
      price: holding.price,
      quantity: holding.quantity,
      invested: holding.invested,
    },
  });
}

async function updateHolding(userId, id, changes) {
  const body = {};
  if (changes.companyName !== undefined) body.company_name = changes.companyName;
  if (changes.price !== undefined) body.price = changes.price;
  if (changes.quantity !== undefined) body.quantity = changes.quantity;
  if (changes.invested !== undefined) body.invested = changes.invested;

  await request("/holdings", {
    method: "PATCH",
    token: userToken(userId),
    params: { id: `eq.${id}` },
    body,
  });
}

async function deleteHolding(userId, id) {
  await request("/holdings", {
    method: "DELETE",
    token: userToken(userId),
    params: { id: `eq.${id}` },
  });
}

async function buyHolding(userId, payload) {
  const portfolio = await getDefaultPortfolio(userId);
  const existing = await getHolding(userId, portfolio.id, payload.symbol);

  if (!existing) {
    await createHolding(userId, portfolio.id, {
      symbol: payload.symbol,
      companyName: payload.companyName,
      price: payload.price,
      quantity: payload.quantity,
      invested: payload.price * payload.quantity,
    });
    return listPortfolio(userId);
  }

  await updateHolding(userId, existing.id, {
    companyName: payload.companyName || existing.company_name || "",
    price: payload.price,
    quantity: toNumber(existing.quantity) + payload.quantity,
    invested: toNumber(existing.invested) + payload.price * payload.quantity,
  });
  return listPortfolio(userId);
}

async function applyQuantityDelta(userId, payload) {
  const portfolio = await getDefaultPortfolio(userId);
  const existing = await getHolding(userId, portfolio.id, payload.symbol);

  if (!existing) {
    if (payload.quantity < 0) {
      const err = new Error("Stock not found");
      err.status = 404;
      throw err;
    }
    await createHolding(userId, portfolio.id, {
      symbol: payload.symbol,
      companyName: payload.companyName,
      price: payload.price || 0,
      quantity: payload.quantity,
      invested: (payload.price || 0) * payload.quantity,
    });
    return listPortfolio(userId);
  }

  const oldQty = toNumber(existing.quantity);
  const oldInvested = toNumber(existing.invested);
  const priceToUse =
    payload.price !== undefined ? payload.price : toNumber(existing.price);

  if (payload.quantity > 0) {
    await updateHolding(userId, existing.id, {
      companyName: payload.companyName || existing.company_name || "",
      price: priceToUse,
      quantity: oldQty + payload.quantity,
      invested: oldInvested + priceToUse * payload.quantity,
    });
    return listPortfolio(userId);
  }

  const sellQty = Math.min(oldQty, Math.abs(payload.quantity));
  const avgCost = oldQty > 0 ? oldInvested / oldQty : 0;
  const newQty = oldQty - sellQty;

  if (newQty <= 0) await deleteHolding(userId, existing.id);
  else {
    await updateHolding(userId, existing.id, {
      price: priceToUse > 0 ? priceToUse : undefined,
      quantity: newQty,
      invested: oldInvested - avgCost * sellQty,
    });
  }

  return listPortfolio(userId);
}

async function sellHolding(userId, symbol, quantity) {
  const portfolio = await getDefaultPortfolio(userId);
  const existing = await getHolding(userId, portfolio.id, symbol);
  if (!existing) {
    const err = new Error("Stock not found in portfolio");
    err.status = 404;
    throw err;
  }

  const qtyHeld = toNumber(existing.quantity);
  if (quantity > qtyHeld) {
    const err = new Error(`You only own ${qtyHeld} shares`);
    err.status = 400;
    throw err;
  }

  return applyQuantityDelta(userId, { symbol, quantity: -quantity });
}

async function removeHolding(userId, symbol) {
  const portfolio = await getDefaultPortfolio(userId);
  const existing = await getHolding(userId, portfolio.id, symbol);
  if (existing) await deleteHolding(userId, existing.id);
  return listPortfolio(userId);
}

module.exports = {
  applyQuantityDelta,
  buyHolding,
  listPortfolio,
  removeHolding,
  sellHolding,
};
