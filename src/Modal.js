import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import "./index.css";

export default function Modal({
  open,
  title,
  children,
  onClose,
  modalId = "modal",
}) {
  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
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
      aria-labelledby={title ? `${modalId}-title` : undefined}
      aria-label={!title ? "Dialog" : undefined}
      onClick={onClose}
    >
      <div
        className="p-modal"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
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
          x
        </button>
      </div>
    </div>,
    document.body
  );
}
