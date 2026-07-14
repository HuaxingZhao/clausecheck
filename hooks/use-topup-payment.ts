"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useCredits } from "@/hooks/use-credits";

export type TopupPlan = "pro" | "boost";

export type PaymentModalStatus =
  | "idle"
  | "creating"
  | "polling"
  | "success"
  | "timeout"
  | "error";

export interface TopupOrderResponse {
  order_id: string;
  plan: TopupPlan;
  amount_cents: number;
  credits_amount: number;
  payment_url: string | null;
  qr_code_url: string | null;
  status: string;
}

const POLL_INTERVAL_MS = 3000;
const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

async function fetchOrderStatus(orderId: string): Promise<string | null> {
  const res = await fetch(`/api/orders/${orderId}/status`, { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { status?: string };
  return data.status ?? null;
}

interface UseTopupPaymentOptions {
  locale: string;
  onRequireAuth?: () => void;
}

export function useTopupPayment({ locale, onRequireAuth }: UseTopupPaymentOptions) {
  const router = useRouter();
  const { invalidate, balance } = useCredits();

  const [payingPlan, setPayingPlan] = useState<TopupPlan | null>(null);
  const [pendingPlan, setPendingPlan] = useState<TopupPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<PaymentModalStatus>("idle");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<TopupPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pollAbortRef = useRef<AbortController | null>(null);
  const redirectTimerRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;
  }, []);

  const closeModal = useCallback(() => {
    stopPolling();
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setModalOpen(false);
    setModalStatus("idle");
    setOrderId(null);
    setQrCodeUrl(null);
    setActivePlan(null);
    setErrorMessage(null);
    setPayingPlan(null);
  }, [stopPolling]);

  const pollUntilPaid = useCallback(
    async (id: string, signal: AbortSignal): Promise<"paid" | "timeout"> => {
      const started = Date.now();
      while (Date.now() - started < PAYMENT_TIMEOUT_MS) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const status = await fetchOrderStatus(id);
        if (status === "paid") return "paid";
        await sleep(POLL_INTERVAL_MS, signal);
      }
      return "timeout";
    },
    []
  );

  const handlePaymentSuccess = useCallback(
    async (plan: TopupPlan) => {
      const latest = await invalidate();
      const displayBalance = latest ?? balance;

      if (plan === "boost") {
        setModalOpen(false);
        stopPolling();
      } else {
        setModalStatus("success");
      }

      setToast(
        displayBalance != null
          ? `充值成功，当前剩余额度：${displayBalance}份`
          : "充值成功"
      );

      redirectTimerRef.current = window.setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    },
    [balance, invalidate, locale, router, stopPolling]
  );

  const startPayment = useCallback(
    async (plan: TopupPlan) => {
      setPendingPlan(plan);
      setPayingPlan(plan);
      setErrorMessage(null);
      setModalStatus("creating");

      try {
        const res = await fetch("/api/credits/topup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, payment_method: "wechat" }),
        });

        if (res.status === 401) {
          setPayingPlan(null);
          setModalStatus("idle");
          onRequireAuth?.();
          return;
        }

        const data = (await res.json()) as TopupOrderResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Top-up failed");
        }

        setOrderId(data.order_id);
        setActivePlan(plan);
        setQrCodeUrl(data.qr_code_url || data.payment_url);
        setModalOpen(true);
        setModalStatus("polling");
        setPayingPlan(null);

        stopPolling();
        const controller = new AbortController();
        pollAbortRef.current = controller;

        const outcome = await pollUntilPaid(data.order_id, controller.signal);
        if (outcome === "paid") {
          await handlePaymentSuccess(plan);
        } else {
          setModalStatus("timeout");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPayingPlan(null);
        setModalStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Network error");
        setModalOpen(true);
      }
    },
    [handlePaymentSuccess, onRequireAuth, pollUntilPaid, stopPolling]
  );

  const retryPayment = useCallback(() => {
    if (!pendingPlan) return;
    stopPolling();
    void startPayment(pendingPlan);
  }, [pendingPlan, startPayment, stopPolling]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => () => {
    stopPolling();
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
  }, [stopPolling]);

  return {
    payingPlan,
    pendingPlan,
    modalOpen,
    modalStatus,
    orderId,
    qrCodeUrl,
    activePlan,
    errorMessage,
    balance,
    toast,
    startPayment,
    retryPayment,
    closeModal,
  };
}
