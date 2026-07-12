/**
 * Static demo contract samples for the upload-page "Try a sample" entry.
 * Texts are bundled at build time from fixtures/ — no API calls.
 */

import type { ContractScenarioId } from "@/lib/contract-scenarios";
import type { ClientJurisdiction } from "@/lib/jurisdiction";

import saasCaHighRisk from "@/fixtures/contracts/saas-ca-risky-en.txt";
import saasCaReasonable from "@/fixtures/contracts/saas-ca-reasonable-en.txt";
import ndaChina from "@/fixtures/contracts/nda-risky-zh.txt";

export type DemoSampleId = "saas_ca_high" | "saas_ca_standard" | "nda_zh";

export interface DemoSample {
  id: DemoSampleId;
  /** i18n key under upload.sample.options.* */
  labelKey: string;
  /** Short subtitle key under upload.sample.options.* */
  hintKey: string;
  fileName: string;
  text: string;
  jurisdiction: ClientJurisdiction;
  scenarioId: ContractScenarioId;
  marker: "high" | "standard" | "china";
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "saas_ca_high",
    labelKey: "highRisk",
    hintKey: "highRiskHint",
    fileName: "saas-ca-high-risk-california.txt",
    text: String(saasCaHighRisk),
    jurisdiction: "us_california",
    scenarioId: "tech_saas",
    marker: "high",
  },
  {
    id: "saas_ca_standard",
    labelKey: "standard",
    hintKey: "standardHint",
    fileName: "saas-ca-standard-california.txt",
    text: String(saasCaReasonable),
    jurisdiction: "us_california",
    scenarioId: "tech_saas",
    marker: "standard",
  },
  {
    id: "nda_zh",
    labelKey: "chinaNda",
    hintKey: "chinaNdaHint",
    fileName: "nda-risky-china.txt",
    text: String(ndaChina),
    jurisdiction: "china_prc",
    scenarioId: "nda",
    marker: "china",
  },
];

export function getDemoSample(id: DemoSampleId): DemoSample | undefined {
  return DEMO_SAMPLES.find((s) => s.id === id);
}

/** Build a File suitable for the existing /api/scan FormData path. */
export function demoSampleToFile(sample: DemoSample): File {
  return new File([sample.text], sample.fileName, {
    type: "text/plain",
    lastModified: Date.now(),
  });
}
