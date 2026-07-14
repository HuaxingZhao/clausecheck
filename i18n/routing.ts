import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

/**
 * Build a pathname that respects localePrefix: "as-needed".
 * Default locale (en) omits `/en`; other locales keep `/${locale}` prefix.
 * Accepts path with query/hash: `/account?x=1`, `/#faq`.
 */
export function localizedPath(path: string, locale: string): string {
  const raw = path.startsWith("/") ? path : `/${path}`;
  if (!locale || locale === routing.defaultLocale) return raw;

  // Already prefixed (e.g. /zh/account)
  if (raw === `/${locale}` || raw.startsWith(`/${locale}/`) || raw.startsWith(`/${locale}?`) || raw.startsWith(`/${locale}#`)) {
    return raw;
  }

  if (raw === "/") return `/${locale}`;
  return `/${locale}${raw}`;
}
