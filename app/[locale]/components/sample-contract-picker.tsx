"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEMO_SAMPLES,
  type DemoSample,
  type DemoSampleId,
} from "@/lib/demo-samples";

interface SampleContractPickerProps {
  activeId: DemoSampleId | null;
  onSelect: (sample: DemoSample) => void;
  disabled?: boolean;
}

const MARKER: Record<DemoSample["marker"], string> = {
  high: "🔴",
  standard: "🟢",
  china: "🇨🇳",
};

export default function SampleContractPicker({
  activeId,
  onSelect,
  disabled,
}: SampleContractPickerProps) {
  const t = useTranslations("upload.sample");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = activeId
    ? DEMO_SAMPLES.find((s) => s.id === activeId)
    : null;

  return (
    <div ref={rootRef} className="sample-contract-picker mt-4">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="sample-contract-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sample-contract-trigger-label">
          {active
            ? `${MARKER[active.marker]} ${t(`options.${active.labelKey}` as "options.highRisk")}`
            : t("trigger")}
        </span>
        <span className="sample-contract-caret" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <ul
          id={menuId}
          role="menu"
          className="sample-contract-menu"
        >
          {DEMO_SAMPLES.map((sample) => {
            const selected = activeId === sample.id;
            return (
              <li key={sample.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`sample-contract-option ${selected ? "is-selected" : ""}`}
                  onClick={() => {
                    onSelect(sample);
                    setOpen(false);
                  }}
                >
                  <span className="sample-contract-option-marker" aria-hidden>
                    {MARKER[sample.marker]}
                  </span>
                  <span className="sample-contract-option-text">
                    <span className="sample-contract-option-title">
                      {t(`options.${sample.labelKey}` as "options.highRisk")}
                    </span>
                    <span className="sample-contract-option-hint">
                      {t(`options.${sample.hintKey}` as "options.highRiskHint")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="sample-contract-hint">{t("hint")}</p>
    </div>
  );
}
