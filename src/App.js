import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import StockPage from "./stockpage";
import PortfolioPage from "./PortfolioPage";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Ensure no browser default margins or scrollbars cause white gaps
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflowX = "hidden";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
  }, []);

  return (
    <Router>
      <div style={styles.appContainer}>
        {/* Fixed Navbar at the top */}
        <nav style={styles.navbar}>
          {/* Hamburger Button (inside blue navbar) */}
          <button style={styles.menuButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h2 style={styles.navTitle}>💹 Stock Market Simulator</h2>
        </nav>

        {/* Sidebar */}
        <div style={{ ...styles.sidebar, left: sidebarOpen ? "0" : "-450px" }}>
          <h2 style={styles.sidebarTitle}>📈 Dashboard</h2>
          <Link to="/" style={styles.navLink} onClick={() => setSidebarOpen(false)}>
            💹 Stock Market
          </Link>
          <Link to="/portfolio" style={styles.navLink} onClick={() => setSidebarOpen(false)}>
            📊 Portfolio
          </Link>
        </div>

        {/* Main Page Content */}
        <div
          style={{
            ...styles.content,
            marginLeft: sidebarOpen ? "320px" : "0",
          }}
        >
          <Routes>
            <Route path="/" element={<StockPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const styles = {
  appContainer: {
    minHeight: "100vh",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#eaf0f6",
  },
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "65px",
    backgroundColor: "#1e3a8a",
    color: "white",
    display: "flex",
    alignItems: "center",
    padding: "0 25px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    zIndex: 2000,
  },
  menuButton: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "28px",
    cursor: "pointer",
    marginRight: "20px",
    padding: "6px 10px",
  },
  navTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: 0,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "320px", // widened sidebar
    height: "100%",
    background: "linear-gradient(180deg, #1e3a8a, #2563eb)",
    color: "white",
    padding: "90px 20px 20px", // starts below navbar
    boxShadow: "4px 0 12px rgba(0,0,0,0.3)",
    transition: "left 0.3s ease-in-out",
    zIndex: 1500,
  },
  sidebarTitle: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: "40px",
    borderBottom: "2px solid rgba(255,255,255,0.2)",
    paddingBottom: "10px",
  },
  navLink: {
    display: "block",
    color: "white",
    textDecoration: "none",
    fontSize: "18px",
    margin: "20px 0",
    padding: "10px 15px",
    borderRadius: "8px",
    transition: "background 0.2s ease",
  },
  content: {
    paddingTop: "85px", // leaves space for navbar
    transition: "margin-left 0.3s ease-in-out",
  },
};

export default App;
