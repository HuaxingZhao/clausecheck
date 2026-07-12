"use client";

import {
  type ClientJurisdiction,
  getDisclaimerText,
} from "@/lib/jurisdiction";

interface ReviewDisclaimerProps {
  jurisdiction: ClientJurisdiction;
  className?: string;
}

/**
 * Dynamic legal disclaimer that tracks the Governing Law selector.
 * Does not use i18n locale for body copy — jurisdiction drives the text
 * (China PRC → Chinese; US / England / International → specified English).
 */
export default function ReviewDisclaimer({
  jurisdiction,
  className = "",
}: ReviewDisclaimerProps) {
  const text = getDisclaimerText(jurisdiction);

  return (
    <p
      role="note"
      data-jurisdiction={jurisdiction}
      className={`review-disclaimer text-xs text-ink-muted font-sans leading-relaxed mt-4 ${className}`}
    >
      {text}
    </p>
  );
}
