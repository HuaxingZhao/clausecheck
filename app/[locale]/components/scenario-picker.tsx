"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CONTRACT_SCENARIOS,
  FEATURED_SCENARIOS,
  MORE_SCENARIOS,
  type ContractScenario,
  type ContractScenarioId,
  DEFAULT_SCENARIO_ID,
} from "@/lib/contract-scenarios";

interface ScenarioPickerProps {
  value: ContractScenarioId;
  onChange: (id: ContractScenarioId) => void;
  disabled?: boolean;
}

function ScenarioChip({
  scenario,
  selected,
  disabled,
  onSelect,
  t,
}: {
  scenario: ContractScenario;
  selected: boolean;
  disabled?: boolean;
  onSelect: (id: ContractScenarioId) => void;
  t: ReturnType<typeof useTranslations<"scenarios">>;
}) {
  const name = t(`${scenario.id}.name` as "general.name");
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      title={t(`${scenario.id}.desc` as "general.desc")}
      className={`scenario-chip ${selected ? "scenario-chip--selected" : ""}`}
      onClick={() => onSelect(scenario.id)}
    >
      <span className="scenario-chip-icon" aria-hidden>
        {scenario.icon}
      </span>
      <span className="scenario-chip-name">{name}</span>
    </button>
  );
}

export default function ScenarioPicker({ value, onChange, disabled }: ScenarioPickerProps) {
  const t = useTranslations("scenarios");
  const selectedInMore = MORE_SCENARIOS.some((s) => s.id === value);
  const [showMore, setShowMore] = useState(selectedInMore);

  useEffect(() => {
    if (selectedInMore) setShowMore(true);
  }, [selectedInMore]);

  const selectedScenario = CONTRACT_SCENARIOS.find((s) => s.id === value);

  return (
    <div className="scenario-picker">
      <div className="scenario-picker-header">
        <h3 className="scenario-picker-title">{t("title")}</h3>
        <p className="scenario-picker-subtitle">{t("subtitle")}</p>
      </div>

      <div className="scenario-chips" role="radiogroup" aria-label={t("title")}>
        {FEATURED_SCENARIOS.map((scenario) => (
          <ScenarioChip
            key={scenario.id}
            scenario={scenario}
            selected={value === scenario.id}
            disabled={disabled}
            onSelect={onChange}
            t={t}
          />
        ))}
      </div>

      <button
        type="button"
        className="scenario-more-toggle"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
      >
        {showMore ? t("hideMore") : t("showMore", { count: MORE_SCENARIOS.length })}
      </button>

      {showMore && (
        <div className="scenario-chips scenario-chips--more" role="group" aria-label={t("moreLabel")}>
          {MORE_SCENARIOS.map((scenario) => (
            <ScenarioChip
              key={scenario.id}
              scenario={scenario}
              selected={value === scenario.id}
              disabled={disabled}
              onSelect={onChange}
              t={t}
            />
          ))}
        </div>
      )}

      {selectedScenario && value !== DEFAULT_SCENARIO_ID && (
        <p className="scenario-selected-note">
          {t("selected", { name: t(`${selectedScenario.id}.name` as "general.name") })}
        </p>
      )}
    </div>
  );
}
