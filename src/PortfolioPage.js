import React, { useEffect, useState } from "react";
import "./index.css";

function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);

  // ✅ Load portfolio from backend and refresh prices via backend proxy
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch("/api/portfolio");
        const savedPortfolio = await res.json();

        // fetch live prices for each entry via backend
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
    // ⏱ keep your 15s refresh
    const interval = setInterval(fetchPortfolio, 15000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Sell via backend and update table
  const handleSell = async (symbol) => {
    try {
      const res = await fetch(`/api/portfolio/${symbol}`, { method: "DELETE" });
      const updated = await res.json();
      setPortfolio(updated);
    } catch (err) {
      console.error("Failed to sell", err);
    }
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
                <th className="p-col">Total Value</th>
                <th className="p-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((stock, index) => (
                <tr key={index} className="portfolio-row">
                  <td className="p-cell">{stock.companyName}</td>
                  <td className="p-cell">{stock.symbol}</td>
                  <td className="p-cell">${stock.price}</td>
                  <td className="p-cell">{stock.quantity}</td>
                  <td className="p-cell">
                    $
                    {(
                      Number(stock.price || 0) * Number(stock.quantity || 0)
                    ).toFixed(2)}
                  </td>
                  <td className="p-cell">
                    <button
                      type="button"
                      className="p-sell-btn"
                      onClick={() => handleSell(stock.symbol)}
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PortfolioPage;
