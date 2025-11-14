import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./index.css";

// const API_KEY = "..."; // no longer needed because we now call the backend
const STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NFLX", "NVDA", "IBM", "INTC"];

function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "ascending" });
  const [showModal, setShowModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeAgo, setTimeAgo] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  // ✅ Fetch Data (unchanged interval, now via backend)
  useEffect(() => {
    async function fetchStockData() {
      try {
        // call backend aggregation endpoint
        const res = await axios.get(`/api/quotes?symbols=${STOCKS.join(",")}`);
        setStocks(res.data);
        setLoading(false);
        setLastUpdated(Date.now());
      } catch (err) {
        console.error("Error fetching stock data:", err);
      }
    }

    fetchStockData();
    const interval = setInterval(fetchStockData, 60000); // keep 60s
    return () => clearInterval(interval);
  }, []);

  // ✅ Time ago tracker
  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
      setTimeAgo(seconds < 60 ? `${seconds} sec ago` : `${Math.floor(seconds / 60)} min ago`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // ✅ Sorting
  function handleSort(key) {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  }

  function sortedStocks(data) {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === "N/A" || valB === "N/A") return 0;
      if (typeof valA === "string") return valA.localeCompare(valB);
      return sortConfig.direction === "ascending" ? valA - valB : valB - valA;
    });
  }

  // ✅ Modal Handlers
  function handleBuyClick(stock) {
    setSelectedStock(stock);
    setQuantity("");
    setShowModal(true);
  }

  // ✅ Confirm buy — now posts to backend; keeps localStorage highlight behavior
  function confirmBuy() {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    // send to backend portfolio
    const payload = {
      symbol: selectedStock.symbol,
      companyName: selectedStock.name,
      price: selectedStock.current,
      quantity: qty,
    };

    axios
      .post("/api/portfolio", payload)
      .then(() => {
        // maintain your existing highlight logic by also updating localStorage
        const existingPortfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
        const existingStock = existingPortfolio.find((item) => item.symbol === selectedStock.symbol);

        if (existingStock) {
          existingStock.quantity += qty;
        } else {
          existingPortfolio.push({
            symbol: selectedStock.symbol,
            companyName: selectedStock.name,
            price: selectedStock.current,
            quantity: qty,
          });
        }
        localStorage.setItem("portfolio", JSON.stringify(existingPortfolio));

        alert(`${qty} shares of ${selectedStock.symbol} added to portfolio!`);
        setShowModal(false);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to add to portfolio.");
      });
  }

  // ✅ Highlight bought (unchanged)
  const portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
  const boughtSymbols = portfolio.map((s) => s.symbol);

  const filtered = sortedStocks(
    stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) return <h2 className="stock-loading">Loading live stock data...</h2>;

  return (
    <div className="stock-page">
      {/* ✅ Hamburger Icon */}
      <button className="stock-hamburger" onClick={() => setMenuOpen((s) => !s)} aria-label="Toggle menu">
        <span className="stock-bar" />
        <span className="stock-bar" />
        <span className="stock-bar" />
      </button>

      {/* ✅ Sidebar */}
      <aside className={`stock-sidebar ${menuOpen ? "open" : ""}`}>
        <h2 className="stock-menuTitle">📈 Dashboard Menu</h2>
        <button className="stock-menuBtn" onClick={() => navigate("/stocks")}>
          💹 Stocks
        </button>
        <button className="stock-menuBtn" onClick={() => navigate("/portfolio")}>
          💼 Portfolio
        </button>
      </aside>
      {menuOpen && <div className="stock-overlay" onClick={() => setMenuOpen(false)} />}

      {/* ✅ Main Container */}
      <div className="stock-container">
        <h1 className="stock-title">💹 Global Stock Market Dashboard</h1>
        <p className="stock-subtitle">Live Data | Auto-refresh every 1 minute</p>
        {lastUpdated && <p className="stock-lastUpdated">🔄 Last updated: {timeAgo}</p>}

        <div className="stock-searchBarContainer">
          <input
            type="text"
            placeholder="🔍 Search by company or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="stock-searchBar"
          />
        </div>

        <div className="stock-tableWrapper">
          <table className="stock-table">
            <thead>
              <tr>
                {[
                  "symbol",
                  "name",
                  "current",
                  "change",
                  "percent",
                  "high",
                  "low",
                  "volume",
                  "marketCap",
                  "pe",
                  "buy",
                ].map((key) => (
                  <th
                    key={key}
                    onClick={() => key !== "buy" && handleSort(key)}
                    className={`stock-th ${key !== "buy" ? "sortable" : ""}`}
                    role={key !== "buy" ? "button" : undefined}
                    tabIndex={key !== "buy" ? 0 : undefined}
                  >
                    {key === "symbol"
                      ? "Symbol"
                      : key === "name"
                      ? "Company"
                      : key === "current"
                      ? "Current ($)"
                      : key === "change"
                      ? "Change ($)"
                      : key === "percent"
                      ? "Change (%)"
                      : key === "high"
                      ? "High"
                      : key === "low"
                      ? "Low"
                      : key === "volume"
                      ? "Volume"
                      : key === "marketCap"
                      ? "Market Cap ($B)"
                      : key === "pe"
                      ? "P/E Ratio"
                      : "Action"}
                    {sortConfig.key === key ? (sortConfig.direction === "ascending" ? " ▲" : " ▼") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.symbol}
                  className={`stock-row ${boughtSymbols.includes(s.symbol) ? "bought" : ""} ${
                    i % 2 === 0 ? "even" : "odd"
                  }`}
                >
                  <td className="stock-td">{s.symbol}</td>
                  <td className="stock-td stock-name">{s.name}</td>
                  <td className="stock-td stock-current">{s.current ? s.current.toFixed(2) : "—"}</td>
                  <td className={`stock-td stock-change ${s.change >= 0 ? "positive" : "negative"}`}>
                    {s.change ? s.change.toFixed(2) : "—"}
                  </td>
                  <td className={`stock-td stock-percent ${s.percent >= 0 ? "positive" : "negative"}`}>
                    {s.percent ? s.percent.toFixed(2) : "—"}%
                  </td>
                  <td className="stock-td">{s.high ? s.high.toFixed(2) : "—"}</td>
                  <td className="stock-td">{s.low ? s.low.toFixed(2) : "—"}</td>
                  <td className="stock-td">
                    {s.volume !== "N/A" ? s.volume.toLocaleString() : "—"}
                  </td>
                  <td className="stock-td">{s.marketCap !== "N/A" ? s.marketCap + "B" : "—"}</td>
                  <td className="stock-td">{s.pe !== "N/A" ? s.pe.toFixed(2) : "—"}</td>
                  <td className="stock-td">
                    <button className="stock-buyBtn" onClick={() => handleBuyClick(s)}>
                      {boughtSymbols.includes(s.symbol) ? "buy again" : "Buy"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Buy Modal */}
      {showModal && (
        <div className="stock-modalOverlay">
          <div className="stock-modal">
            <h3>Buy {selectedStock?.symbol}</h3>
            <p>{selectedStock?.name}</p>
            <input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="stock-input"
            />
            <div className="stock-modalBtns">
              <button className="stock-confirmBtn" onClick={confirmBuy}>
                Confirm
              </button>
              <button className="stock-cancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockPage;
