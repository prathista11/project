// src/components/AlertBox.jsx
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";

/**
 * Props:
 * - open: boolean
 * - title: string (defaults to window.location.host + " says")
 * - message: string (JSX allowed)
 * - onClose: () => void
 */
export default function AlertBox({ open, title, message, onClose }) {
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Focus the OK button for keyboard users
    okRef.current?.focus();

    // Close on Escape
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="alertbox-portal" role="dialog" aria-modal="true" aria-labelledby="alertbox-title">
      <div className="alertbox">
        

        <div className="alertbox-body">
          {typeof message === "string" ? <p className="alertbox-message">{message}</p> : message}
        </div>

        <div className="alertbox-actions">
          <button
            ref={okRef}
            onClick={onClose}
            className="alertbox-ok"
            aria-label="OK"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
