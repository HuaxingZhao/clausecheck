import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/** Normalize to E.164; returns null if invalid. */
export function toE164(raw: string, defaultCountry?: CountryCode): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format("E.164");
}

export function maskPhone(e164: string): string {
  if (e164.length < 6) return e164;
  return `${e164.slice(0, 3)}****${e164.slice(-4)}`;
}

/** Common dial codes for the country picker (global-first). */
export const PHONE_COUNTRY_OPTIONS: { code: CountryCode; dial: string; labelZh: string; labelEn: string }[] = [
  { code: "US", dial: "+1", labelZh: "美国 / 加拿大", labelEn: "US / Canada" },
  { code: "CN", dial: "+86", labelZh: "中国大陆", labelEn: "China" },
  { code: "HK", dial: "+852", labelZh: "中国香港", labelEn: "Hong Kong" },
  { code: "TW", dial: "+886", labelZh: "中国台湾", labelEn: "Taiwan" },
  { code: "SG", dial: "+65", labelZh: "新加坡", labelEn: "Singapore" },
  { code: "GB", dial: "+44", labelZh: "英国", labelEn: "United Kingdom" },
  { code: "AU", dial: "+61", labelZh: "澳大利亚", labelEn: "Australia" },
  { code: "JP", dial: "+81", labelZh: "日本", labelEn: "Japan" },
  { code: "KR", dial: "+82", labelZh: "韩国", labelEn: "South Korea" },
  { code: "DE", dial: "+49", labelZh: "德国", labelEn: "Germany" },
  { code: "FR", dial: "+33", labelZh: "法国", labelEn: "France" },
  { code: "IN", dial: "+91", labelZh: "印度", labelEn: "India" },
];
