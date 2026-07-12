import { z } from "zod";
import { DEFAULT_SCENARIO_ID, isValidScenarioId } from "@/lib/contract-scenarios";
import { parseJurisdictionParam } from "@/lib/jurisdiction";

/** Session user id from JWT — UUID preferred; allow opaque text ids from legacy rows. */
export const sessionUserIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/, "INVALID_SESSION");

export const scanFormFieldsSchema = z.object({
  locale: z.enum(["zh", "en"]).default("zh"),
  scenario: z
    .string()
    .optional()
    .transform((raw) => {
      const id = raw?.trim() || DEFAULT_SCENARIO_ID;
      return isValidScenarioId(id) ? id : DEFAULT_SCENARIO_ID;
    }),
  /** Optional governing-law override; omit/auto → AI detect. */
  jurisdiction: z
    .string()
    .optional()
    .transform((raw) => parseJurisdictionParam(raw ?? undefined)),
});

export type ScanFormFields = z.infer<typeof scanFormFieldsSchema>;

export function parseScanFormFields(form: FormData): ScanFormFields {
  if (form.get("user_id") != null || form.get("userId") != null) {
    throw new ScanRequestValidationError("CLIENT_USER_ID_FORBIDDEN");
  }

  const localeRaw = form.get("locale");
  const scenarioRaw = form.get("scenario");
  const jurisdictionRaw = form.get("jurisdiction");

  return scanFormFieldsSchema.parse({
    locale: localeRaw === "en" ? "en" : localeRaw === "zh" ? "zh" : undefined,
    scenario: scenarioRaw != null ? String(scenarioRaw) : undefined,
    jurisdiction:
      jurisdictionRaw != null ? String(jurisdictionRaw) : undefined,
  });
}

export class ScanRequestValidationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "ScanRequestValidationError";
  }
}
