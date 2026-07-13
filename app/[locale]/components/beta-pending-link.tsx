"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";

interface BetaPendingLinkProps {
  href: "/" | "/account" | "/beta" | "/#upload";
  className?: string;
  children: React.ReactNode;
  pendingLabel: string;
  /** When true (default), swap children for pendingLabel. Use false for media cards. */
  replaceLabel?: boolean;
}

/** Shows pending feedback immediately on click while the next page loads. */
export default function BetaPendingLink({
  href,
  className,
  children,
  pendingLabel,
  replaceLabel = true,
}: BetaPendingLinkProps) {
  const [pending, setPending] = useState(false);

  return (
    <Link
      href={href}
      className={`${className ?? ""}${pending ? " is-pending" : ""}`}
      onClick={() => setPending(true)}
      aria-busy={pending}
      aria-label={pending ? pendingLabel : undefined}
    >
      {replaceLabel && pending ? pendingLabel : children}
      {!replaceLabel && pending ? (
        <span className="beta-link-pending-chip" role="status">
          {pendingLabel}
        </span>
      ) : null}
    </Link>
  );
}
