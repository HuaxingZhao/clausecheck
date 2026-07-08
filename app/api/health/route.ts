import { NextResponse } from "next/server";
import { ensureSchema, getSql, usePostgres } from "@/lib/db/pg";

type CheckStatus = "ok" | "error" | "skipped" | "not_configured";

interface HealthCheck {
  status: CheckStatus;
  latency_ms: number;
  message?: string;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  checks: {
    database: HealthCheck;
    openai: HealthCheck;
    redis: HealthCheck;
  };
}

async function timedCheck(fn: () => Promise<void>): Promise<{ status: CheckStatus; latency_ms: number; message?: string }> {
  const start = Date.now();
  try {
    await fn();
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (err: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : "check failed",
    };
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  if (!usePostgres()) {
    return { status: "skipped", latency_ms: 0, message: "DATABASE_URL not configured" };
  }
  return timedCheck(async () => {
    await ensureSchema();
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
  });
}

async function checkOpenAi(): Promise<HealthCheck> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { status: "skipped", latency_ms: 0, message: "OPENAI_API_KEY not configured" };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        status: "error",
        latency_ms: Date.now() - start,
        message: `OpenAI HTTP ${res.status}`,
      };
    }
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (err: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : "OpenAI unreachable",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return { status: "not_configured", latency_ms: 0, message: "REDIS_URL not set" };
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    // Minimal HTTP health ping (Upstash / Redis REST) or TCP-less placeholder
    if (url.startsWith("http")) {
      const res = await fetch(url.replace(/\/$/, "") + "/ping", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          status: "error",
          latency_ms: Date.now() - start,
          message: `Redis HTTP ${res.status}`,
        };
      }
      return { status: "ok", latency_ms: Date.now() - start };
    }
    return {
      status: "skipped",
      latency_ms: 0,
      message: "REDIS_URL set but health probe requires HTTP endpoint",
    };
  } catch (err: unknown) {
    return {
      status: "error",
      latency_ms: Date.now() - start,
      message: err instanceof Error ? err.message : "Redis unreachable",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function aggregateStatus(checks: HealthResponse["checks"]): HealthResponse["status"] {
  const db = checks.database.status;
  const ai = checks.openai.status;
  if (db === "error") return "down";
  if (ai === "error" || checks.redis.status === "error") return "degraded";
  return "ok";
}

export async function GET() {
  const [database, openai, redis] = await Promise.all([
    checkDatabase(),
    checkOpenAi(),
    checkRedis(),
  ]);

  const checks = { database, openai, redis };
  const status = aggregateStatus(checks);
  const body: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    checks,
  };

  const httpStatus = status === "down" ? 503 : 200;
  return NextResponse.json(body, {
    status: httpStatus,
    headers: { "Cache-Control": "no-store" },
  });
}
