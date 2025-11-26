import React, { useEffect, useState } from "react";
import "./index.css";
import Modal from "./Modal"; // adjust the path if needed

function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);

  // Sell modal state
  const [sellOpen, setSellOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [sellQty, setSellQty] = useState(1);

  // Load portfolio and refresh prices
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch("/api/portfolio");
        const savedPortfolio = await res.json();

        const updated = await Promise.all(
          savedPortfolio.map(async (stock) => {
            const r = await fetch(`/api/stock/${stock.symbol}`);
            const data = await r.json();
            return {
              ...stock,
              price: data.quote?.c ?? stock.price ?? 0,
            };
          })
        );
        setPortfolio(updated);
      } catch (err) {
        console.error("Failed to load portfolio", err);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 15000);
    return () => clearInterval(interval);
  }, []);

  // Open sell modal
  const openSellModal = (stock) => {
    setSelectedStock(stock);
    setSellQty(1);
    setSellOpen(true);
  };

  // Confirm sell
  const confirmSell = async () => {
    if (!selectedStock) return;

    const maxQty = Number(selectedStock.quantity || 0);
    const qty = Number(sellQty);

    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity to sell.");
      return;
    }
    if (qty > maxQty) {
      alert(`You only own ${maxQty} shares of ${selectedStock.symbol}.`);
      return;
    }

    try {
      const res = await fetch("/api/portfolio/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          quantity: qty,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Sell failed:", errText);
        alert("Failed to sell shares.");
        return;
      }

      const updated = await res.json();
      setPortfolio(updated);
      setSellOpen(false);
      setSelectedStock(null);
    } catch (err) {
      console.error("Failed to sell", err);
      alert("Failed to sell due to a network error.");
    }
  };

  const closeSellModal = () => {
    setSellOpen(false);
    setSelectedStock(null);
  };

  return (
    <div className="portfolio-container">
      <h1 className="portfolio-title">📊 My Portfolio (Live)</h1>

      {portfolio.length === 0 ? (
        <p className="portfolio-empty">
          No stocks yet! Go buy some from the Stock page 🚀
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
                <th className="p-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((stock, index) => {
                const qty = Number(stock.quantity || 0);
                const priceNow = Number(stock.price || 0);

                // invested is stored by backend; for old data, fall back to priceNow * qty
                const invested =
                  stock.invested != null
                    ? Number(stock.invested)
                    : priceNow * qty;

                const totalValue = priceNow * qty;

                return (
                  <tr key={index} className="portfolio-row">
                    <td className="p-cell">{stock.companyName}</td>
                    <td className="p-cell">{stock.symbol}</td>
                    <td className="p-cell">${priceNow.toFixed(2)}</td>
                    <td className="p-cell">{qty}</td>
                    <td className="p-cell">${invested.toFixed(2)}</td>
                    <td className="p-cell">${totalValue.toFixed(2)}</td>
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

      {/* Sell Modal using reusable Modal component */}
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
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val <= 0) {
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
