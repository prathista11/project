import React, { useEffect, useState } from "react";
import "./index.css";
import AlertBox from "./AlertBox";
import Modal from "./Modal";
import {
  buyStock,
  getErrorMessage,
  getPortfolio,
  getQuotes,
  getStock,
} from "./apiClient";

const STOCKS = [
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "TSLA",
  "META",
  "NFLX",
  "NVDA",
  "IBM",
  "INTC",
];

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function formatMarketCap(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toFixed(2)}B` : "-";
}

function getDetailValue(value) {
  return value !== undefined && value !== null && value !== "" ? value : "-";
}

function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeAgo, setTimeAgo] = useState("");
  const [boughtSymbols, setBoughtSymbols] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertTitle, setAlertTitle] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailSummary, setDetailSummary] = useState(null);
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    async function fetchStockData() {
      try {
        const data = await getQuotes(STOCKS);
        setStocks(data);
        setLoading(false);
        setLastUpdated(Date.now());
      } catch (err) {
        console.error("Error fetching stock data:", err);
        setLoading(false);
        setAlertMsg(getErrorMessage(err, "Failed to load stock data."));
        setAlertOpen(true);
      }
    }

    fetchStockData();
    const interval = setInterval(fetchStockData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastUpdated) return undefined;

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
      setTimeAgo(
        seconds < 60 ? `${seconds} sec ago` : `${Math.floor(seconds / 60)} min ago`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const data = await getPortfolio();
        setBoughtSymbols(data.map((item) => item.symbol));
      } catch (err) {
        if (err?.response?.status !== 401) {
          console.error("Error loading portfolio for highlighting", err);
        }
      }
    }

    fetchPortfolio();
  }, []);

  function handleSort(key) {
    const direction =
      sortConfig.key === key && sortConfig.direction === "ascending"
        ? "descending"
        : "ascending";
    setSortConfig({ key, direction });
  }

  function sortedStocks(data) {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (valA === "N/A" || valB === "N/A") return 0;
      if (typeof valA === "string") {
        return sortConfig.direction === "ascending"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortConfig.direction === "ascending" ? valA - valB : valB - valA;
    });
  }

  function handleBuyClick(stock) {
    setSelectedStock(stock);
    setQuantity(1);
    setShowModal(true);
  }

  async function handleDetailsClick(stock) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetailSummary(stock);
    setDetailData(null);

    try {
      const data = await getStock(stock.symbol);
      setDetailData(data);
    } catch (err) {
      console.error("Failed to load stock details", err);
      setDetailError(getErrorMessage(err, "Failed to load stock details."));
    } finally {
      setDetailLoading(false);
    }
  }

  function handleDetailBuy() {
    const quote = detailData?.quote || {};
    const profile = detailData?.profile || {};
    const stock = {
      ...detailSummary,
      symbol: detailSummary?.symbol || profile.ticker,
      name: profile.name || detailSummary?.name || detailSummary?.symbol,
      current: quote.c ?? detailSummary?.current,
    };

    setDetailOpen(false);
    handleBuyClick(stock);
  }

  async function confirmBuy() {
    const qty = parseInt(quantity, 10);

    if (!selectedStock || !qty || qty <= 0) {
      setAlertMsg("Please enter a valid quantity.");
      setAlertTitle("");
      setAlertOpen(true);
      return;
    }

    try {
      await buyStock({
        symbol: selectedStock.symbol,
        companyName: selectedStock.name,
        price: selectedStock.current,
        quantity: qty,
      });
      setBoughtSymbols((prev) =>
        prev.includes(selectedStock.symbol)
          ? prev
          : [...prev, selectedStock.symbol]
      );
      setAlertMsg(`${qty} shares of ${selectedStock.symbol} added to portfolio.`);
      setAlertTitle("");
      setAlertOpen(true);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setAlertMsg(
        err?.response?.status === 401
          ? "Please log in before buying stocks."
          : getErrorMessage(err, "Failed to add to portfolio.")
      );
      setAlertTitle("");
      setAlertOpen(true);
    }
  }

  const filtered = sortedStocks(
    stocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(search.toLowerCase()) ||
        stock.name.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (loading) {
    return <h2 className="stock-loading">Loading live stock data...</h2>;
  }

  return (
    <div className="stock-page">
      <div className="stock-container">
        <h1 className="stock-title">Global Stock Market Dashboard</h1>
        <p className="stock-subtitle">Live Data | Auto-refresh every 1 minute</p>
        {lastUpdated && (
          <p className="stock-lastUpdated">Last updated: {timeAgo}</p>
        )}

        <div className="stock-searchBarContainer">
          <input
            type="text"
            placeholder="Search by company or symbol..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="stock-searchBar"
          />
        </div>

        <div className="stock-tableWrapper">
          <table className="stock-table" aria-label="Stock table">
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
                  "action",
                ].map((key) => (
                  <th
                    key={key}
                    onClick={() => key !== "action" && handleSort(key)}
                    className={`stock-th ${key !== "action" ? "sortable" : ""}`}
                    role={key !== "action" ? "button" : undefined}
                    tabIndex={key !== "action" ? 0 : undefined}
                    aria-label={key}
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
                        ? " ^"
                        : " v"
                      : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((stock, index) => (
                <tr
                  key={stock.symbol}
                  className={`stock-row ${
                    boughtSymbols.includes(stock.symbol) ? "bought" : ""
                  } ${index % 2 === 0 ? "even" : "odd"}`}
                >
                  <td className="stock-td">{stock.symbol}</td>
                  <td className="stock-td stock-name">{stock.name}</td>
                  <td className="stock-td stock-current">
                    {formatNumber(stock.current)}
                  </td>
                  <td
                    className={`stock-td stock-change ${
                      stock.change >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatNumber(stock.change)}
                  </td>
                  <td
                    className={`stock-td stock-percent ${
                      stock.percent >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatNumber(stock.percent)}%
                  </td>
                  <td className="stock-td">{formatNumber(stock.high)}</td>
                  <td className="stock-td">{formatNumber(stock.low)}</td>
                  <td className="stock-td">
                    {stock.volume !== "N/A"
                      ? Number(stock.volume).toLocaleString()
                      : "-"}
                  </td>
                  <td className="stock-td">
                    {stock.marketCap !== "N/A" ? `${stock.marketCap}B` : "-"}
                  </td>
                  <td className="stock-td">
                    {stock.pe !== "N/A" ? formatNumber(stock.pe) : "-"}
                  </td>
                  <td className="stock-td">
                    <div className="stock-actionGroup">
                      <button
                        type="button"
                        className="stock-detailBtn"
                        onClick={() => handleDetailsClick(stock)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="stock-buyBtn"
                        onClick={() => handleBuyClick(stock)}
                      >
                        {boughtSymbols.includes(stock.symbol)
                          ? "Buy again"
                          : "Buy"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="stock-modalOverlay">
          <div
            className="stock-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buy-modal-title"
          >
            <h3 id="buy-modal-title">Buy {selectedStock?.symbol}</h3>
            <p style={{ marginTop: 6, marginBottom: 8 }}>
              {selectedStock?.name}
            </p>

            <input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              min={1}
              step={1}
              onChange={(event) => {
                const val = parseInt(event.target.value, 10);
                setQuantity(Number.isNaN(val) || val <= 0 ? 1 : val);
              }}
              className="stock-input"
              aria-label="Quantity"
            />

            <div className="stock-modalBtns" style={{ marginTop: 12 }}>
              <button className="stock-confirmBtn" onClick={confirmBuy}>
                Confirm
              </button>
              <button
                className="stock-cancelBtn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        modalId="stock-detail-modal"
        title={
          detailSummary
            ? `${detailSummary.symbol} Details`
            : "Stock Details"
        }
      >
        {detailLoading ? (
          <p className="stock-detail-status">Loading stock details...</p>
        ) : detailError ? (
          <p className="stock-detail-error">{detailError}</p>
        ) : (
          (() => {
            const quote = detailData?.quote || {};
            const profile = detailData?.profile || {};
            const current = quote.c ?? detailSummary?.current;
            const change = quote.d ?? detailSummary?.change;
            const percent = quote.dp ?? detailSummary?.percent;
            const high = quote.h ?? detailSummary?.high;
            const low = quote.l ?? detailSummary?.low;
            const marketCap =
              profile.marketCapitalization ?? detailSummary?.marketCap;
            const companyName =
              profile.name || detailSummary?.name || detailSummary?.symbol;
            const priceTrend =
              Number(change) > 0
                ? "positive"
                : Number(change) < 0
                ? "negative"
                : "neutral";

            return (
              <div className="stock-detail">
                <div>
                  <p className="stock-detail-company">{companyName}</p>
                  <p className="stock-detail-symbol">
                    {getDetailValue(profile.exchange)} |{" "}
                    {getDetailValue(profile.currency)}
                  </p>
                </div>

                <div className="stock-detail-priceRow">
                  <span className="stock-detail-price">
                    ${formatNumber(current)}
                  </span>
                  <span className={`stock-detail-change ${priceTrend}`}>
                    {formatNumber(change)} ({formatNumber(percent)}%)
                  </span>
                </div>

                <div className="stock-detail-grid">
                  <div>
                    <span>High</span>
                    <b>${formatNumber(high)}</b>
                  </div>
                  <div>
                    <span>Low</span>
                    <b>${formatNumber(low)}</b>
                  </div>
                  <div>
                    <span>Market Cap</span>
                    <b>{formatMarketCap(marketCap)}</b>
                  </div>
                  <div>
                    <span>P/E Ratio</span>
                    <b>{formatNumber(detailSummary?.pe)}</b>
                  </div>
                  <div>
                    <span>Country</span>
                    <b>{getDetailValue(profile.country)}</b>
                  </div>
                  <div>
                    <span>Industry</span>
                    <b>{getDetailValue(profile.finnhubIndustry)}</b>
                  </div>
                </div>

                {profile.weburl && (
                  <a
                    className="stock-detail-link"
                    href={profile.weburl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Company website
                  </a>
                )}

                <div className="stock-detail-actions">
                  <button
                    type="button"
                    className="stock-confirmBtn"
                    onClick={handleDetailBuy}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className="stock-cancelBtn"
                    onClick={() => setDetailOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </Modal>

      <AlertBox
        open={alertOpen}
        title={alertTitle}
        message={alertMsg}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}

export default StockPage;
