"use client";

import { useTranslations } from "next-intl";
import type { PaymentModalStatus, TopupPlan } from "@/hooks/use-topup-payment";

interface WechatPayModalProps {
  open: boolean;
  plan: TopupPlan | null;
  status: PaymentModalStatus;
  qrCodeUrl: string | null;
  orderId: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
}

function qrImageUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

export default function WechatPayModal({
  open,
  plan,
  status,
  qrCodeUrl,
  orderId,
  errorMessage,
  onClose,
  onRetry,
}: WechatPayModalProps) {
  const t = useTranslations("payment");

  if (!open) return null;

  const planLabel = plan === "boost" ? t("planBoost") : t("planPro");
  const showQr = status === "polling" && qrCodeUrl;
  const showRetry = status === "timeout" || status === "error";
  const showLoading = status === "creating" || (status === "polling" && !qrCodeUrl);

  return (
    <div
      className="word-limit-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wechat-pay-modal-title"
      onClick={onClose}
    >
      <div className="wechat-pay-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="wechat-pay-modal-title" className="text-lg font-sans font-semibold text-ink mb-2">
          {t("modalTitle", { plan: planLabel })}
        </h3>

        {showLoading && (
          <p className="text-sm text-ink-light font-sans mb-6">{t("creating")}</p>
        )}

        {showQr && (
          <>
            <p className="text-sm text-ink-light font-sans mb-4">{t("scanHint")}</p>
            <div className="flex justify-center mb-4">
              <img
                src={qrImageUrl(qrCodeUrl)}
                alt={t("qrAlt")}
                width={220}
                height={220}
                className="rounded-lg border border-border/50"
              />
            </div>
            <p className="text-xs text-ink-muted font-sans text-center mb-4">
              {t("polling")}
              {orderId ? ` · ${orderId.slice(0, 8)}…` : ""}
            </p>
          </>
        )}

        {status === "success" && (
          <p className="text-sm text-green-800 font-sans mb-6">{t("success")}</p>
        )}

        {status === "timeout" && (
          <p className="text-sm text-amber-800 font-sans mb-4">{t("timeout")}</p>
        )}

        {status === "error" && (
          <p className="text-sm text-red-700 font-sans mb-4">
            {errorMessage || t("errorGeneric")}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          {showRetry ? (
            <>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={onRetry}>
                {t("retry")}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {status === "success" ? t("close") : t("cancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
