import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";

export default function AlertBox({ open, title, message, onClose }) {
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    okRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="alertbox-portal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "alertbox-title" : undefined}
      aria-label={!title ? "Alert" : undefined}
    >
      <div className="alertbox">
        {title && (
          <div className="alertbox-header">
            <div id="alertbox-title" className="alertbox-title">
              {title}
            </div>
          </div>
        )}

        <div className="alertbox-body">
          {typeof message === "string" ? (
            <p className="alertbox-message">{message}</p>
          ) : (
            message
          )}
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
