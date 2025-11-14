import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Hamburger Icon */}
      <button
        className="nav-hamburger"
        onClick={() => setOpen((s) => !s)}
        aria-label="Toggle menu"
      >
        <span className="nav-bar" />
        <span className="nav-bar" />
        <span className="nav-bar" />
      </button>

      {/* Sidebar Menu */}
      <aside className={`nav-sidebar ${open ? "open" : ""}`}>
        <h2 className="nav-menuTitle">📈 Dashboard Menu</h2>
        <button className="nav-menuBtn" onClick={() => { setOpen(false); navigate("/stocks"); }}>
          💹 Stocks
        </button>
        <button className="nav-menuBtn" onClick={() => { setOpen(false); navigate("/portfolio"); }}>
          💼 Portfolio
        </button>
      </aside>

      {/* Overlay to close sidebar */}
      {open && <div className="nav-overlay" onClick={() => setOpen(false)} role="button" aria-label="Close menu" />}
    </>
  );
}

export default Navbar;
