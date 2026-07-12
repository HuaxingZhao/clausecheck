"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReviewFeedbackMeta } from "@/lib/feedback/types";
import { hashContractText } from "@/lib/feedback/contract-hash";

interface FeedbackCtxValue {
  contractHash: string | null;
  feedbackMeta: ReviewFeedbackMeta | null;
  isAuthenticated: boolean;
  onToast?: (message: string) => void;
}

const FeedbackCtx = createContext<FeedbackCtxValue>({
  contractHash: null,
  feedbackMeta: null,
  isAuthenticated: false,
});

export function useReviewFeedback() {
  return useContext(FeedbackCtx);
}

export function ReviewFeedbackProvider({
  contractText,
  feedbackMeta,
  isAuthenticated,
  onToast,
  children,
}: {
  contractText?: string | null;
  feedbackMeta?: ReviewFeedbackMeta | null;
  isAuthenticated: boolean;
  onToast?: (message: string) => void;
  children: React.ReactNode;
}) {
  const [contractHash, setContractHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!contractText?.trim()) {
      setContractHash(null);
      return;
    }
    void hashContractText(contractText).then((h) => {
      if (!cancelled) setContractHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [contractText]);

  const value = useMemo(
    () => ({
      contractHash,
      feedbackMeta: feedbackMeta ?? null,
      isAuthenticated,
      onToast,
    }),
    [contractHash, feedbackMeta, isAuthenticated, onToast]
  );

  return (
    <FeedbackCtx.Provider value={value}>{children}</FeedbackCtx.Provider>
  );
}
