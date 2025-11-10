import React, { useEffect, useState } from "react";

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
    <div style={{ padding: "20px", backgroundColor: "#f2f5f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>📊 My Portfolio (Live)</h1>

      {portfolio.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555" }}>
          No stocks yet! Go buy some from the Stock page 🚀
        </p>
      ) : (
        <table
          style={{
            width: "90%",
            margin: "20px auto",
            borderCollapse: "collapse",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <thead style={{ backgroundColor: "#1e90ff", color: "white" }}>
            <tr>
              <th style={{ padding: "10px" }}>Company</th>
              <th>Symbol</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((stock, index) => (
              <tr key={index} style={{ textAlign: "center", borderBottom: "1px solid #ddd" }}>
                <td>{stock.companyName}</td>
                <td>{stock.symbol}</td>
                <td>${stock.price}</td>
                <td>{stock.quantity}</td>
                <td>${(Number(stock.price || 0) * Number(stock.quantity || 0)).toFixed(2)}</td>
                <td>
                  <button
                    onClick={() => handleSell(stock.symbol)}
                    style={{
                      background: "#ff4d4d",
                      border: "none",
                      padding: "6px 10px",
                      color: "white",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Sell
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PortfolioPage;
