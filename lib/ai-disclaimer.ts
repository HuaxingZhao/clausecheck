import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

/** Locale-matched hard disclaimer for Word / negotiation-email exports. */
export function getAiDisclaimerExport(locale: "zh" | "en" | string): string {
  return locale === "en" ? en.ai_disclaimer_export : zh.ai_disclaimer_export;
}
