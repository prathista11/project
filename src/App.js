import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import StockPage from "./stockpage";
import PortfolioPage from "./PortfolioPage";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="app-container">
        {/* Fixed Navbar at the top */}
        <nav className="navbar">
          {/* Hamburger Button (inside blue navbar) */}
          <button
            className="menu-button"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h2 className="nav-title">💹 Stock Market Simulator</h2>
        </nav>

        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <h2 className="sidebar-title">📈 Dashboard</h2>
          <Link to="/" className="nav-link" onClick={() => setSidebarOpen(false)}>
            💹 Stock Market
          </Link>
          <Link
            to="/portfolio"
            className="nav-link"
            onClick={() => setSidebarOpen(false)}
          >
            📊 Portfolio
          </Link>
        </div>

        {/* Main Page Content */}
        <div className={`content ${sidebarOpen ? "shifted" : ""}`}>
          <Routes>
            <Route path="/" element={<StockPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
