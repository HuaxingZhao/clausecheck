"use client";

import { useState } from "react";

export default function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button type="button" className="faq-q" onClick={() => setOpen(!open)}>
        <span className="font-medium">{q}</span>
        <span
          className={`text-ink-muted transition-transform ${open ? "rotate-45" : ""}`}
          aria-hidden
        >
          +
        </span>
      </button>
      <div className="faq-a">
        <p className="text-sm text-ink-light leading-relaxed">{a}</p>
      </div>
    </div>
  );
}
