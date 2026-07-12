"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  FeedbackTargetType,
  FeedbackType,
  ReviewFeedbackMeta,
} from "@/lib/feedback/types";

export interface FeedbackContextProps {
  contractHash: string | null;
  feedbackMeta: ReviewFeedbackMeta | null;
  isAuthenticated: boolean;
  onToast?: (message: string) => void;
}

interface ReviewFeedbackButtonsProps extends FeedbackContextProps {
  targetType: FeedbackTargetType;
  targetId: string;
  /** Compact layout for flag/missing cards */
  compact?: boolean;
}

type Phase = "idle" | "compose" | "submitting" | "done";

const STORAGE_PREFIX = "cc_feedback:";

function storageKey(
  contractHash: string,
  targetType: string,
  targetId: string
): string {
  return `${STORAGE_PREFIX}${contractHash}:${targetType}:${targetId}`;
}

const TYPES: FeedbackType[] = ["accurate", "missed_issue", "false_positive"];

export default function ReviewFeedbackButtons({
  contractHash,
  feedbackMeta,
  isAuthenticated,
  onToast,
  targetType,
  targetId,
  compact = false,
}: ReviewFeedbackButtonsProps) {
  const t = useTranslations("feedback");
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [submittedType, setSubmittedType] = useState<FeedbackType | null>(null);

  useEffect(() => {
    if (!contractHash || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(
        storageKey(contractHash, targetType, targetId)
      );
      if (raw) {
        const parsed = JSON.parse(raw) as { feedbackType?: FeedbackType };
        if (parsed.feedbackType) {
          setSubmittedType(parsed.feedbackType);
          setPhase("done");
        }
      }
    } catch {
      /* ignore */
    }
  }, [contractHash, targetType, targetId]);

  const startCompose = useCallback((type: FeedbackType) => {
    if (phase === "done" || phase === "submitting") return;
    setSelected(type);
    setPhase("compose");
  }, [phase]);

  const submit = useCallback(async () => {
    if (!selected || !contractHash || !feedbackMeta || phase === "submitting") {
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contractHash,
          jurisdiction: feedbackMeta.jurisdiction,
          promptVersion: feedbackMeta.promptVersion,
          ragMetadata: feedbackMeta.ragMetadata,
          targetType,
          targetId,
          feedbackType: selected,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      try {
        localStorage.setItem(
          storageKey(contractHash, targetType, targetId),
          JSON.stringify({ feedbackType: selected, at: Date.now() })
        );
      } catch {
        /* ignore */
      }
      setSubmittedType(selected);
      setPhase("done");
      onToast?.(t("submitSuccess"));
    } catch {
      setPhase("compose");
      onToast?.(t("submitError"));
    }
  }, [
    selected,
    contractHash,
    feedbackMeta,
    phase,
    targetType,
    targetId,
    comment,
    onToast,
    t,
  ]);

  if (!contractHash || !feedbackMeta) {
    return null;
  }

  if (phase === "done" && submittedType) {
    return (
      <div
        className={`review-feedback review-feedback--done${compact ? " review-feedback--compact" : ""}`}
        data-feedback-state="received"
      >
        <span className="review-feedback-received" aria-live="polite">
          ✓ {t("received")}
        </span>
        {!isAuthenticated && (
          <p className="review-feedback-anon-hint">{t("signInHint")}</p>
        )}
      </div>
    );
  }

  const labelFor = (type: FeedbackType) => {
    if (type === "accurate") return t("accurate");
    if (type === "missed_issue") return t("missedIssue");
    return t("falsePositive");
  };

  const iconFor = (type: FeedbackType) => {
    if (type === "accurate") return "👍";
    return "👎";
  };

  return (
    <div
      className={`review-feedback${compact ? " review-feedback--compact" : ""}`}
      data-feedback-state={phase}
    >
      <div className="review-feedback-btns" role="group" aria-label={t("groupLabel")}>
        {TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`review-feedback-btn review-feedback-btn--${type}${
              selected === type ? " is-selected" : ""
            }`}
            onClick={() => startCompose(type)}
            disabled={phase === "submitting"}
            aria-pressed={selected === type}
          >
            <span aria-hidden>{iconFor(type)}</span>
            <span>{labelFor(type)}</span>
          </button>
        ))}
      </div>

      {phase === "compose" || phase === "submitting" ? (
        <div className="review-feedback-compose">
          <label className="review-feedback-comment-label" htmlFor={`fb-${targetId}`}>
            {t("commentLabel")}
          </label>
          <textarea
            id={`fb-${targetId}`}
            className="review-feedback-comment"
            rows={2}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            disabled={phase === "submitting"}
          />
          <div className="review-feedback-compose-actions">
            <button
              type="button"
              className="review-feedback-submit"
              onClick={() => void submit()}
              disabled={phase === "submitting"}
            >
              {phase === "submitting" ? t("submitting") : t("submit")}
            </button>
            <button
              type="button"
              className="review-feedback-cancel"
              onClick={() => {
                setPhase("idle");
                setSelected(null);
                setComment("");
              }}
              disabled={phase === "submitting"}
            >
              {t("cancel")}
            </button>
          </div>
          {!isAuthenticated && (
            <p className="review-feedback-anon-hint">{t("signInHint")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
