"use client";

import { useTranslations } from "next-intl";
import { isWechatPayUiEnabled } from "@/lib/credits/wechat-pay-config";

export interface CnyPayChannelCtaProps {
  /** Opens enterprise / RMB channel contact (form dialog). */
  onContact?: () => void;
  className?: string;
}

/**
 * When WeChat Pay UI is disabled, replace wallet/WeChat copy with an RMB consult CTA.
 * When enabled, restore the Stripe wallet note (WeChat may appear in Payment Element).
 */
export default function CnyPayChannelCta({
  onContact,
  className,
}: CnyPayChannelCtaProps) {
  const t = useTranslations("pricing");
  const wechatUiOn = isWechatPayUiEnabled();

  if (wechatUiOn) {
    return (
      <p
        className={`text-xs text-ink-muted text-center max-w-xs leading-relaxed ${className ?? ""}`}
      >
        {t("cnyWalletNote")}
      </p>
    );
  }

  return (
    <p
      className={`text-xs text-center max-w-sm leading-relaxed ${className ?? ""}`}
    >
      {onContact ? (
        <button
          type="button"
          onClick={onContact}
          className="text-accent hover:text-accent-dark underline-offset-2 hover:underline font-sans"
        >
          {t("cnyPayChannelCta")}
        </button>
      ) : (
        <a
          href="mailto:support@clausecheck.cc?subject=人民币支付通道"
          className="text-accent hover:text-accent-dark underline-offset-2 hover:underline font-sans"
        >
          {t("cnyPayChannelCta")}
        </a>
      )}
    </p>
  );
}
