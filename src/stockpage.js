import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_KEY = "d45bfkpr01qsugt9jim0d45bfkpr01qsugt9jimg";
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

  // ✅ Fetch Data
  useEffect(() => {
    async function fetchStockData() {
      try {
        const results = await Promise.all(
          STOCKS.map(async (symbol) => {
            const [quote, profile, metrics] = await Promise.all([
              axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`),
              axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${API_KEY}`),
              axios.get(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${API_KEY}`),
            ]);
            return {
              symbol,
              name: profile.data.name || "N/A",
              current: quote.data.c,
              change: quote.data.d,
              percent: quote.data.dp,
              high: quote.data.h,
              low: quote.data.l,
              volume: metrics.data.metric["10DayAverageTradingVolume"] || "N/A",
              marketCap: metrics.data.metric.marketCapitalization
                ? metrics.data.metric.marketCapitalization.toFixed(2)
                : "N/A",
              pe: metrics.data.metric.peNormalizedAnnual || "N/A",
            };
          })
        );
        setStocks(results);
        setLoading(false);
        setLastUpdated(Date.now());
      } catch (err) {
        console.error("Error fetching stock data:", err);
      }
    }

    fetchStockData();
    const interval = setInterval(fetchStockData, 60000);
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

  function confirmBuy() {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

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
  }

  // ✅ Highlight bought
  const portfolio = JSON.parse(localStorage.getItem("portfolio")) || [];
  const boughtSymbols = portfolio.map((s) => s.symbol);

  const filtered = sortedStocks(
    stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) return <h2 style={styles.loading}>Loading live stock data...</h2>;

  return (
    <div style={styles.page}>
      {/* ✅ Hamburger Icon */}
      <div style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
        <div style={styles.bar}></div>
        <div style={styles.bar}></div>
        <div style={styles.bar}></div>
      </div>

      {/* ✅ Sidebar */}
      <div
        style={{
          ...styles.sidebar,
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <h2 style={styles.menuTitle}>📈 Dashboard Menu</h2>
        <button style={styles.menuBtn} onClick={() => navigate("/stocks")}>
          💹 Stocks
        </button>
        <button style={styles.menuBtn} onClick={() => navigate("/portfolio")}>
          💼 Portfolio
        </button>
      </div>
      {menuOpen && <div style={styles.overlay} onClick={() => setMenuOpen(false)}></div>}

      {/* ✅ Main Container */}
      <div style={styles.container}>
        <h1 style={styles.title}>💹 Global Stock Market Dashboard</h1>
        <p style={styles.subtitle}>Live Data | Auto-refresh every 1 minute</p>
        {lastUpdated && (
          <p style={styles.lastUpdated}>🔄 Last updated: {timeAgo}</p>
        )}

        <div style={styles.searchBarContainer}>
          <input
            type="text"
            placeholder="🔍 Search by company or symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchBar}
          />
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
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
                    style={{
                      ...styles.th,
                      cursor: key !== "buy" ? "pointer" : "default",
                    }}
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
                    {sortConfig.key === key
                      ? sortConfig.direction === "ascending"
                        ? " ▲"
                        : " ▼"
                      : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.symbol}
                  style={{
                    ...styles.tr,
                    background: boughtSymbols.includes(s.symbol)
                      ? "rgba(144, 213, 238, 0.4)"
                      : i % 2 === 0
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(245,250,255,0.7)",
                  }}
                >
                  <td style={styles.td}>{s.symbol}</td>
                  <td style={styles.td}>{s.name}</td>
                  <td style={{ ...styles.td, fontWeight: "600", color: "#1e3a8a" }}>
                    {s.current ? s.current.toFixed(2) : "—"}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      color: s.change >= 0 ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {s.change ? s.change.toFixed(2) : "—"}
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      color: s.percent >= 0 ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {s.percent ? s.percent.toFixed(2) : "—"}%
                  </td>
                  <td style={styles.td}>{s.high ? s.high.toFixed(2) : "—"}</td>
                  <td style={styles.td}>{s.low ? s.low.toFixed(2) : "—"}</td>
                  <td style={styles.td}>{s.volume !== "N/A" ? s.volume.toLocaleString() : "—"}</td>
                  <td style={styles.td}>{s.marketCap !== "N/A" ? s.marketCap + "B" : "—"}</td>
                  <td style={styles.td}>{s.pe !== "N/A" ? s.pe.toFixed(2) : "—"}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.buyBtn}
                      onClick={() => handleBuyClick(s)}
                    >
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
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Buy {selectedStock?.symbol}</h3>
            <p>{selectedStock?.name}</p>
            <input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={styles.input}
            />
            <div style={styles.modalBtns}>
              <button style={styles.confirmBtn} onClick={confirmBuy}>
                Confirm
              </button>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f3f3f3ff 0%, ffffffff(0, 0%, 100%, 1.00) 100%)",
  padding: "0 20px 40px 20px", // ⬅ removed top padding, kept side & bottom
  marginTop: "0",
  fontFamily: "'Poppins', sans-serif",
},
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "rgba(255,255,255,0.85)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    borderRadius: "18px",
    padding: "30px",
    backdropFilter: "blur(10px)",
  },
  hamburger: {
    position: "fixed",
    top: "20px",
    left: "20px",
    cursor: "pointer",
    zIndex: 1001,
  },
  bar: {
    width: "30px",
    height: "3px",
    backgroundColor: "#1e3a8a",
    margin: "6px 0",
    borderRadius: "4px",
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "230px",
    height: "100%",
    background: "rgba(30,58,138,0.85)",
    color: "white",
    padding: "20px",
    boxShadow: "3px 0 10px rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
    transform: "translateX(-100%)",
    transition: "transform 0.3s ease",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  menuTitle: {
    fontSize: "1.3rem",
    borderBottom: "2px solid #93c5fd",
    paddingBottom: "10px",
  },
  menuBtn: {
    background: "white",
    color: "#1e3a8a",
    fontWeight: "600",
    border: "none",
    borderRadius: "8px",
    padding: "10px",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.3)",
    zIndex: 999,
  },
  title: { textAlign: "center", color: "#1e3a8a", fontSize: "2.2rem", marginBottom: "5px" },
  subtitle: { textAlign: "center", color: "#555", marginBottom: "8px" },
  lastUpdated: { textAlign: "center", color: "#333", fontSize: "0.9rem", marginBottom: "25px" },
  searchBarContainer: { display: "flex", justifyContent: "center", marginBottom: "20px" },
  searchBar: {
    width: "60%",
    padding: "10px 15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    outline: "none",
    fontSize: "1rem",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "center" },
  th: {
    padding: "14px 10px",
    background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
    color: "white",
    textTransform: "uppercase",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  tr: { transition: "all 0.3s ease" },
  td: { padding: "12px 10px", borderBottom: "1px solid #e5e7eb" },
  buyBtn: {
    backgroundColor: "#1097b9ff",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "white",
    padding: "25px",
    borderRadius: "10px",
    width: "320px",
    textAlign: "center",
    boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
  },
  input: {
    width: "80%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    margin: "12px 0",
  },
  modalBtns: { display: "flex", justifyContent: "center", gap: "10px" },
  confirmBtn: {
    backgroundColor: "#109ab9ff",
    border: "none",
    color: "white",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#ef4444",
    border: "none",
    color: "white",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  loading: { textAlign: "center", marginTop: "200px", color: "#1e3a8a", fontSize: "1.5rem" },
};

export default StockPage;
