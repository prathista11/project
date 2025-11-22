// src/components/Modal.jsx
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";

/**
 * Reusable Modal (portal).
 *
 * Props:
 * - open: boolean          → controls visibility
 * - title: string?         → heading text
 * - children: ReactNode    → content inside modal
 * - onClose: () => void    → called when user closes
 * - modalId: string?       → used for aria-labelledby
 */
export default function Modal({
  open,
  title,
  children,
  onClose,
  modalId = "modal",
}) {
  // Lock scroll + close on Escape
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="p-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${modalId}-title`}
      onClick={onClose} // close when clicking on backdrop
    >
      <div
        className="p-modal"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()} // don't close when clicking inside
      >
        {title && (
          <h3 id={`${modalId}-title`} className="p-modal-title">
            {title}
          </h3>
        )}

        <div className="p-modal-body">{children}</div>

        <button
          className="p-modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
