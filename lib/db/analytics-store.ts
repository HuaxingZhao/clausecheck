import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { assertDatabaseConfigured, isProduction } from "../env";
import { ensureSchema, getSql, usePostgres } from "./pg";

const DATA_DIR = path.join(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "analytics-events.json");
const MAX_JSON_EVENTS = 2000;

export interface AnalyticsRecord {
  name: string;
  props: Record<string, unknown>;
  path: string | null;
  ts: string;
}

function ensureStore(): void {
  if (isProduction()) assertDatabaseConfigured();
}

export async function recordAnalyticsEvent(event: AnalyticsRecord): Promise<void> {
  ensureStore();

  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    await db`
      INSERT INTO analytics_events (id, name, path, props, created_at)
      VALUES (
        ${randomUUID()},
        ${event.name},
        ${event.path},
        ${JSON.stringify(event.props)}::jsonb,
        ${event.ts}
      )`;
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  let events: AnalyticsRecord[] = [];
  try {
    events = JSON.parse(await readFile(EVENTS_FILE, "utf8")) as AnalyticsRecord[];
  } catch {
    events = [];
  }
  events.push(event);
  if (events.length > MAX_JSON_EVENTS) {
    events = events.slice(-MAX_JSON_EVENTS);
  }
  await writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), "utf8");
}
