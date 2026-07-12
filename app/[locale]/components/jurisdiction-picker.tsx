"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import {
  type ClientJurisdiction,
  CLIENT_JURISDICTION_VALUES,
} from "@/lib/jurisdiction";

interface JurisdictionPickerProps {
  value: ClientJurisdiction;
  onChange: (value: ClientJurisdiction) => void;
  disabled?: boolean;
}

const OPTION_KEYS: Record<ClientJurisdiction, string> = {
  auto: "auto",
  us_california: "usCalifornia",
  us_new_york: "usNewYork",
  england_wales: "englandWales",
  china_prc: "chinaPrc",
  international_commercial: "international",
};

export default function JurisdictionPicker({
  value,
  onChange,
  disabled,
}: JurisdictionPickerProps) {
  const t = useTranslations("upload.jurisdiction");

  const options = CLIENT_JURISDICTION_VALUES.map((v) => ({
    value: v,
    label: t(`options.${OPTION_KEYS[v]}` as "options.auto"),
  }));

  return (
    <div className="jurisdiction-picker mt-6">
      <label
        htmlFor="governing-law-select"
        className="block text-sm font-sans font-medium text-ink mb-2"
      >
        {t("label")}
      </label>
      <Select
        id="governing-law-select"
        aria-label={t("label")}
        value={value}
        onValueChange={(v) => onChange(v as ClientJurisdiction)}
        options={options}
        className={`w-full ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      />
      <p className="text-xs text-ink-muted mt-2 font-sans leading-relaxed">
        {t("hint")}
      </p>
    </div>
  );
}
