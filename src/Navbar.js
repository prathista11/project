import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Hamburger Icon */}
      <div style={styles.hamburger} onClick={() => setOpen(!open)}>
        <div style={styles.bar}></div>
        <div style={styles.bar}></div>
        <div style={styles.bar}></div>
      </div>

      {/* Sidebar Menu */}
      <div
        style={{
          ...styles.sidebar,
          transform: open ? "translateX(0)" : "translateX(-100%)",
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

      {/* Overlay to close sidebar */}
      {open && <div style={styles.overlay} onClick={() => setOpen(false)}></div>}
    </>
  );
}

const styles = {
  hamburger: {
  fontSize: "26px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "white",
  position: "absolute",
  top: "15px",
  left: "20px",
  zIndex: 1000,
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
    backgroundColor: "#1e3a8a",
    color: "white",
    padding: "20px",
    boxShadow: "3px 0 10px rgba(0,0,0,0.3)",
    transform: "translateX(-100%)",
    transition: "transform 0.3s ease",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  menuTitle: {
    marginTop: "10px",
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
    transition: "0.3s",
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
};

export default Navbar;
