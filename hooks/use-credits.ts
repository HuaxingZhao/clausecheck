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
  const [balance, setBalance] = useState<number | null>(
    () => creditsCache?.balance ?? null
  );
  const [loading, setLoading] = useState(() => !creditsCache);
  const [authenticated, setAuthenticated] = useState(() => !!creditsCache);

  const refresh = useCallback(async (force = false): Promise<number | null> => {
    if (
      !force &&
      creditsCache &&
      Date.now() - creditsCache.fetchedAt < CACHE_MS
    ) {
      setBalance(creditsCache.balance);
      // Cache implies a prior authenticated success — must set this or the
      // badge stays on「登录查看审阅配额」when another useCredits() filled the cache.
      setAuthenticated(true);
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
        // Transient failure (e.g. Neon cold start): keep prior cache if any
        if (creditsCache) {
          setBalance(creditsCache.balance);
          setAuthenticated(true);
          return creditsCache.balance;
        }
        return null;
      }
      const data = (await res.json()) as { balance?: number };
      if (typeof data.balance === "number") {
        creditsCache = { balance: data.balance, fetchedAt: Date.now() };
        setBalance(data.balance);
        setAuthenticated(true);
        return data.balance;
      }
      setAuthenticated(false);
      setBalance(null);
      return null;
    } catch {
      if (creditsCache) {
        setBalance(creditsCache.balance);
        setAuthenticated(true);
        return creditsCache.balance;
      }
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
