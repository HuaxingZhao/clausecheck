import { z } from "zod";
import { DEFAULT_SCENARIO_ID, isValidScenarioId } from "@/lib/contract-scenarios";

/** Session user id — must be UUID; never accept from client body. */
export const sessionUserIdSchema = z.string().uuid();

export const scanFormFieldsSchema = z.object({
  locale: z.enum(["zh", "en"]).default("zh"),
  scenario: z
    .string()
    .optional()
    .transform((raw) => {
      const id = raw?.trim() || DEFAULT_SCENARIO_ID;
      return isValidScenarioId(id) ? id : DEFAULT_SCENARIO_ID;
    }),
});

export type ScanFormFields = z.infer<typeof scanFormFieldsSchema>;

export function parseScanFormFields(form: FormData): ScanFormFields {
  if (form.get("user_id") != null || form.get("userId") != null) {
    throw new ScanRequestValidationError("CLIENT_USER_ID_FORBIDDEN");
  }

  const localeRaw = form.get("locale");
  const scenarioRaw = form.get("scenario");

  return scanFormFieldsSchema.parse({
    locale: localeRaw === "en" ? "en" : localeRaw === "zh" ? "zh" : undefined,
    scenario: scenarioRaw != null ? String(scenarioRaw) : undefined,
  });
}

export class ScanRequestValidationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "ScanRequestValidationError";
  }
}
