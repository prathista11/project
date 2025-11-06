import React, { useEffect, useState } from "react";

function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => {
    const savedPortfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
    setPortfolio(savedPortfolio);

    // Fetch live prices for each stock
    const fetchLiveData = async () => {
      const updated = await Promise.all(
        savedPortfolio.map(async (stock) => {
          const res = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=YOUR_API_KEY`
          );
          const data = await res.json();
          return {
            ...stock,
            price: data.c, // current price
          };
        })
      );
      setPortfolio(updated);
    };

    fetchLiveData();

    // Optional: Refresh every 15 seconds
    const interval = setInterval(fetchLiveData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSell = (symbol) => {
    const updatedPortfolio = portfolio.filter(stock => stock.symbol !== symbol);
    setPortfolio(updatedPortfolio);
    localStorage.setItem("portfolio", JSON.stringify(updatedPortfolio));
  };

  return (
    <div style={{ padding: "20px", backgroundColor: "#f2f5f9", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>📊 My Portfolio (Live)</h1>
      
      {portfolio.length === 0 ? (
        <p style={{ textAlign: "center", color: "#555" }}>
          No stocks yet! Go buy some from the Stock page 🚀
        </p>
      ) : (
        <table style={{
          width: "90%",
          margin: "20px auto",
          borderCollapse: "collapse",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          background: "white",
          borderRadius: "12px",
          overflow: "hidden"
        }}>
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
                <td>${(stock.price * stock.quantity).toFixed(2)}</td>
                <td>
                  <button
                    onClick={() => handleSell(stock.symbol)}
                    style={{
                      background: "#ff4d4d",
                      border: "none",
                      padding: "6px 10px",
                      color: "white",
                      borderRadius: "6px",
                      cursor: "pointer"
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
