"use client";

import { useCallback, useEffect, useState } from "react";

const CACHE_MS = 30_000;

let creditsCache: { balance: number; fetchedAt: number } | null = null;

/** guest = 401; user = 200; unavailable = transient error without cache. */
export type CreditsSession = "loading" | "guest" | "user" | "unavailable";

export interface UseCreditsResult {
  balance: number | null;
  loading: boolean;
  /** True only after a successful authenticated credits response. */
  authenticated: boolean;
  session: CreditsSession;
  refresh: (force?: boolean) => Promise<number | null>;
  invalidate: () => Promise<number | null>;
}

export function useCredits(opts?: { autoFetch?: boolean }): UseCreditsResult {
  const autoFetch = opts?.autoFetch !== false;
  const [balance, setBalance] = useState<number | null>(
    () => creditsCache?.balance ?? null
  );
  const [loading, setLoading] = useState(() => !creditsCache);
  const [session, setSession] = useState<CreditsSession>(() =>
    creditsCache ? "user" : "loading"
  );

  const refresh = useCallback(async (force = false): Promise<number | null> => {
    if (
      !force &&
      creditsCache &&
      Date.now() - creditsCache.fetchedAt < CACHE_MS
    ) {
      setBalance(creditsCache.balance);
      setSession("user");
      setLoading(false);
      return creditsCache.balance;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/credits", { credentials: "include" });
      if (res.status === 401) {
        setSession("guest");
        setBalance(null);
        creditsCache = null;
        return null;
      }
      if (!res.ok) {
        // Transient failure (e.g. Neon cold start): keep prior cache if any
        if (creditsCache) {
          setBalance(creditsCache.balance);
          setSession("user");
          return creditsCache.balance;
        }
        // Do NOT claim guest — badge would wrongly say「登录查看审阅配额」
        setSession("unavailable");
        setBalance(null);
        return null;
      }
      const data = (await res.json()) as { balance?: number };
      if (typeof data.balance === "number") {
        creditsCache = { balance: data.balance, fetchedAt: Date.now() };
        setBalance(data.balance);
        setSession("user");
        return data.balance;
      }
      setSession("unavailable");
      setBalance(null);
      return null;
    } catch {
      if (creditsCache) {
        setBalance(creditsCache.balance);
        setSession("user");
        return creditsCache.balance;
      }
      setSession("unavailable");
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
    if (!autoFetch) return;
    void refresh();
  }, [refresh, autoFetch]);

  return {
    balance,
    loading,
    authenticated: session === "user",
    session,
    refresh,
    invalidate,
  };
}

/** Clear module cache (e.g. after logout). */
export function clearCreditsCache(): void {
  creditsCache = null;
}
