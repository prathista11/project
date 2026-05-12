import React, { useEffect, useState } from "react";
import "./index.css";
import Modal from "./Modal";
import { getErrorMessage, getPortfolio, getStock, sellStock } from "./apiClient";

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}` : "-";
}

function formatSignedMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const sign = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${sign}$${Math.abs(number).toFixed(2)}`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function trendClass(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "neutral";
  return number > 0 ? "positive" : "negative";
}

function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const [sellOpen, setSellOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [sellQty, setSellQty] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const savedPortfolio = await getPortfolio();
        const updated = await Promise.all(
          savedPortfolio.map(async (stock) => {
            const data = await getStock(stock.symbol);
            return {
              ...stock,
              price: data.quote?.c ?? stock.price ?? 0,
            };
          })
        );
        setPortfolio(updated);
        setError("");
      } catch (err) {
        console.error("Failed to load portfolio", err);
        setError(getErrorMessage(err, "Failed to load portfolio."));
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 15000);
    return () => clearInterval(interval);
  }, []);

  const openSellModal = (stock) => {
    setSelectedStock(stock);
    setSellQty(1);
    setSellOpen(true);
  };

  const confirmSell = async () => {
    if (!selectedStock) return;

    const maxQty = Number(selectedStock.quantity || 0);
    const qty = Number(sellQty);

    if (!qty || qty <= 0) {
      setError("Please enter a valid quantity to sell.");
      return;
    }
    if (qty > maxQty) {
      setError(`You only own ${maxQty} shares of ${selectedStock.symbol}.`);
      return;
    }

    try {
      const updated = await sellStock(selectedStock.symbol, qty);
      setPortfolio(updated);
      setSellOpen(false);
      setSelectedStock(null);
      setError("");
    } catch (err) {
      console.error("Failed to sell", err);
      setError(getErrorMessage(err, "Failed to sell shares."));
    }
  };

  const closeSellModal = () => {
    setSellOpen(false);
    setSelectedStock(null);
  };

  return (
    <div className="portfolio-container">
      <h1 className="portfolio-title">My Portfolio (Live)</h1>
      {error && <p className="portfolio-error">{error}</p>}

      {portfolio.length === 0 ? (
        <p className="portfolio-empty">
          No stocks yet. Go buy some from the Stock page.
        </p>
      ) : (
        <div className="portfolio-table-wrap">
          <table className="portfolio-table">
            <thead className="portfolio-thead">
              <tr>
                <th className="p-col">Company</th>
                <th className="p-col">Symbol</th>
                <th className="p-col">Price</th>
                <th className="p-col">Quantity</th>
                <th className="p-col">Total Invested</th>
                <th className="p-col">Total Value</th>
                <th className="p-col">P/L ($)</th>
                <th className="p-col">P/L (%)</th>
                <th className="p-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((stock, index) => {
                const qty = Number(stock.quantity || 0);
                const priceNow = Number(stock.price || 0);
                const invested =
                  stock.invested != null ? Number(stock.invested) : priceNow * qty;
                const totalValue = priceNow * qty;
                const profitLoss = totalValue - invested;
                const profitLossPercent =
                  invested > 0 ? (profitLoss / invested) * 100 : 0;
                const profitLossClass = trendClass(profitLoss);

                return (
                  <tr key={stock.symbol || index} className="portfolio-row">
                    <td className="p-cell">{stock.companyName}</td>
                    <td className="p-cell">{stock.symbol}</td>
                    <td className="p-cell">{formatMoney(priceNow)}</td>
                    <td className="p-cell">{qty}</td>
                    <td className="p-cell">{formatMoney(invested)}</td>
                    <td className="p-cell">{formatMoney(totalValue)}</td>
                    <td className={`p-cell p-pl-value ${profitLossClass}`}>
                      {formatSignedMoney(profitLoss)}
                    </td>
                    <td className={`p-cell p-pl-value ${profitLossClass}`}>
                      {formatSignedPercent(profitLossPercent)}
                    </td>
                    <td className="p-cell">
                      <button
                        type="button"
                        className="p-sell-btn"
                        onClick={() => openSellModal(stock)}
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={sellOpen}
        onClose={closeSellModal}
        modalId="sell-modal"
        title={selectedStock ? `Sell ${selectedStock.symbol}` : "Sell Stock"}
      >
        {selectedStock && (
          <>
            <p style={{ marginBottom: 8 }}>
              You own <b>{selectedStock.quantity}</b> shares of{" "}
              {selectedStock.companyName}.
            </p>

            <input
              type="number"
              min={1}
              max={selectedStock.quantity}
              step={1}
              value={sellQty}
              onChange={(event) => {
                const val = parseInt(event.target.value, 10);
                if (Number.isNaN(val) || val <= 0) {
                  setSellQty(1);
                } else if (val > Number(selectedStock.quantity)) {
                  setSellQty(selectedStock.quantity);
                } else {
                  setSellQty(val);
                }
              }}
              className="p-sell-input"
              placeholder="Quantity to sell"
            />

            <div className="p-modal-btns">
              <button className="p-confirm-btn" onClick={confirmSell}>
                Confirm Sell
              </button>
              <button className="p-cancel-btn" onClick={closeSellModal}>
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default PortfolioPage;
