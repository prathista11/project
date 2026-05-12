import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import StockPage from "./stockpage";
import PortfolioPage from "./PortfolioPage";
import AuthPage from "./AuthPage";
import { getCurrentUser, logout } from "./apiClient";

function ProtectedRoute({ user, loading, children }) {
  const location = useLocation();

  if (loading) return <h2 className="stock-loading">Loading...</h2>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const current = await getCurrentUser();
        if (!cancelled) setUser(current);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    setSidebarOpen(false);
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle sidebar"
          >
            Menu
          </button>
          <h2 className="nav-title">Stock Market Simulator</h2>
        </nav>

        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <h2 className="sidebar-title">Dashboard</h2>
          <Link to="/" className="nav-link" onClick={() => setSidebarOpen(false)}>
            Stock Market
          </Link>
          <Link
            to="/portfolio"
            className="nav-link"
            onClick={() => setSidebarOpen(false)}
          >
            Portfolio
          </Link>
          {user ? (
            <button className="nav-link nav-button" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className="nav-link"
              onClick={() => setSidebarOpen(false)}
            >
              Log In
            </Link>
          )}
        </div>

        <div className={`content ${sidebarOpen ? "shifted" : ""}`}>
          <Routes>
            <Route path="/" element={<StockPage />} />
            <Route path="/stocks" element={<Navigate to="/" replace />} />
            <Route
              path="/portfolio"
              element={
                <ProtectedRoute user={user} loading={authLoading}>
                  <PortfolioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={<AuthPage mode="login" user={user} onAuth={setUser} />}
            />
            <Route
              path="/register"
              element={
                <AuthPage mode="register" user={user} onAuth={setUser} />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
