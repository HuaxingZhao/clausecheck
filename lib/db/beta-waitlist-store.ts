/**
 * Beta email waitlist — Postgres or local JSON fallback.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { assertDatabaseConfigured, isProduction } from "../env";
import { ensureSchema, getSql, usePostgres } from "./pg";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "beta-waitlist.json");

export interface BetaSubscribeResult {
  id: string;
  email: string;
  created: boolean;
}

function ensureStore(): void {
  if (isProduction()) assertDatabaseConfigured();
}

export async function subscribeBetaEmail(
  email: string,
  locale: string,
  source = "beta_page"
): Promise<BetaSubscribeResult> {
  ensureStore();
  const normalized = email.trim().toLowerCase();
  const id = randomUUID();

  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const inserted = await db<{ id: string }[]>`
      INSERT INTO beta_waitlist (id, email, locale, source)
      VALUES (${id}::uuid, ${normalized}, ${locale}, ${source})
      ON CONFLICT (email) DO NOTHING
      RETURNING id`;
    if (inserted.length > 0) {
      return { id: inserted[0].id, email: normalized, created: true };
    }
    const existing = await db<{ id: string }[]>`
      SELECT id FROM beta_waitlist WHERE email = ${normalized} LIMIT 1`;
    return {
      id: existing[0]?.id ?? id,
      email: normalized,
      created: false,
    };
  }

  await mkdir(DATA_DIR, { recursive: true });
  let rows: { id: string; email: string; locale: string; source: string; createdAt: string }[] =
    [];
  try {
    rows = JSON.parse(await readFile(FILE, "utf8"));
  } catch {
    rows = [];
  }
  const existing = rows.find((r) => r.email === normalized);
  if (existing) {
    return { id: existing.id, email: normalized, created: false };
  }
  rows.push({
    id,
    email: normalized,
    locale,
    source,
    createdAt: new Date().toISOString(),
  });
  await writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  return { id, email: normalized, created: true };
}
