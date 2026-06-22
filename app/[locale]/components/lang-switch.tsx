"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export default function LangSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: "en" | "zh") {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      className="flex border border-border rounded-lg overflow-hidden text-xs font-sans"
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`px-2.5 py-1 transition-colors ${
          locale === "en"
            ? "bg-ink text-white"
            : "bg-transparent text-ink-light hover:text-ink hover:bg-paper-dark"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("zh")}
        className={`px-2.5 py-1 transition-colors border-l border-border ${
          locale === "zh"
            ? "bg-ink text-white"
            : "bg-transparent text-ink-light hover:text-ink hover:bg-paper-dark"
        }`}
      >
        中文
      </button>
    </div>
  );
}
