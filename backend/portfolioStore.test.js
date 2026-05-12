const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeHolding, normalizePortfolio } = require("./portfolioStore");

test("normalizeHolding preserves average-cost fields", () => {
  assert.deepEqual(
    normalizeHolding({
      symbol: " aapl ",
      companyName: "Apple Inc",
      price: "150.25",
      quantity: "2",
      invested: "275.50",
    }),
    {
      symbol: "AAPL",
      companyName: "Apple Inc",
      price: 150.25,
      quantity: 2,
      invested: 275.5,
    }
  );
});

test("normalizePortfolio removes invalid and empty holdings", () => {
  assert.deepEqual(
    normalizePortfolio([
      { symbol: "MSFT", price: 300, quantity: 1 },
      { symbol: "", price: 10, quantity: 1 },
      { symbol: "TSLA", price: 200, quantity: 0 },
    ]),
    [
      {
        symbol: "MSFT",
        companyName: "",
        price: 300,
        quantity: 1,
        invested: 300,
      },
    ]
  );
});
