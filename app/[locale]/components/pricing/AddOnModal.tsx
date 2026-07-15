"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ADD_ON_CONFIG } from "@/lib/pricing.config";
import { formatAddOnPackTotal } from "@/lib/pricing/currency";
import type { AddOnPackSize, Currency } from "@/lib/pricing.config";
import PaymentGateway from "./PaymentGateway";

export interface AddOnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  locale: string;
  onSuccess?: () => void;
  onRequireAuth?: () => void;
  onCnyPayContact?: () => void;
}

export default function AddOnModal({
  open,
  onOpenChange,
  currency,
  locale,
  onSuccess,
  onRequireAuth,
  onCnyPayContact,
}: AddOnModalProps) {
  const t = useTranslations("pricing.addOn");
  const [packs, setPacks] = useState<AddOnPackSize>(1);
  const [showPayment, setShowPayment] = useState(false);

  const totalLabel = formatAddOnPackTotal(
    packs,
    currency,
    locale === "zh" ? "zh-CN" : "en-US"
  );

  function handleClose(next: boolean) {
    if (!next) {
      setShowPayment(false);
      setPacks(1);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("modalTitle")}</DialogTitle>
          <DialogDescription>{t("modalDesc")}</DialogDescription>
        </DialogHeader>

        {!showPayment ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ADD_ON_CONFIG.packSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPacks(size)}
                  className={`px-4 py-2 rounded-xl border text-sm font-sans transition-colors ${
                    packs === size
                      ? "border-legal-navy bg-legal-cream text-legal-navy font-semibold"
                      : "border-border hover:border-legal-navy/30"
                  }`}
                >
                  +{size}
                </button>
              ))}
            </div>
            <p className="text-2xl font-light font-sans">{totalLabel}</p>
            <p className="text-xs text-ink-muted">{t("note")}</p>
            <Button className="w-full" onClick={() => setShowPayment(true)}>
              {t("cta")}
            </Button>
          </div>
        ) : (
          <PaymentGateway
            purchaseType="addon"
            currency={currency}
            billingCycle="annual"
            locale={locale}
            packs={packs}
            onSuccess={() => {
              onSuccess?.();
              handleClose(false);
            }}
            onRequireAuth={() => {
              handleClose(false);
              onRequireAuth?.();
            }}
            onCancel={() => setShowPayment(false)}
            onCnyPayContact={() => {
              handleClose(false);
              onCnyPayContact?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
