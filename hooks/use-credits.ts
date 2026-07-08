"use client";

import { useCallback, useEffect, useState } from "react";

const CACHE_MS = 30_000;

let creditsCache: { balance: number; fetchedAt: number } | null = null;

export interface UseCreditsResult {
  balance: number | null;
  loading: boolean;
  authenticated: boolean;
  refresh: (force?: boolean) => Promise<number | null>;
  invalidate: () => Promise<number | null>;
}

export function useCredits(): UseCreditsResult {
  const [balance, setBalance] = useState<number | null>(() => creditsCache?.balance ?? null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const refresh = useCallback(async (force = false): Promise<number | null> => {
    if (
      !force &&
      creditsCache &&
      Date.now() - creditsCache.fetchedAt < CACHE_MS
    ) {
      setBalance(creditsCache.balance);
      setLoading(false);
      return creditsCache.balance;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/credits", { credentials: "include" });
      if (res.status === 401) {
        setAuthenticated(false);
        setBalance(null);
        creditsCache = null;
        return null;
      }
      if (!res.ok) {
        setBalance(null);
        return null;
      }
      const data = (await res.json()) as { balance?: number };
      if (typeof data.balance === "number") {
        creditsCache = { balance: data.balance, fetchedAt: Date.now() };
        setBalance(data.balance);
        setAuthenticated(true);
        return data.balance;
      }
      return null;
    } catch {
      setBalance(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidate = useCallback(async (): Promise<number | null> => {
    creditsCache = null;
    return refresh(true);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, loading, authenticated, refresh, invalidate };
}

/** Clear module cache (e.g. after logout). */
export function clearCreditsCache(): void {
  creditsCache = null;
}
