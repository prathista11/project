// src/components/Modal.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";

/**
 * Reusable Modal (portal).
 *
 * Props:
 * - open: boolean
 * - title: string (optional)
 * - children: React nodes (modal body)
 * - onClose: function
 * - modalId: string (optional) - used for aria-labelledby
 */
export default function Modal({ open, title, children, onClose, modalId = "modal" }) {
  useEffect(() => {
    if (!open) return;
    // Prevent background scrolling while modal is open
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Close on Escape
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={`${modalId}-title`}>
      <div className="ui-modal" tabIndex={-1}>
        {title && <h3 id={`${modalId}-title`} className="ui-modal-title">{title}</h3>}
        <div className="ui-modal-body">{children}</div>
        <button className="ui-modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>,
    document.body
  );
}
