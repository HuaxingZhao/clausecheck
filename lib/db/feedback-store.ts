/**
 * Persist review feedback (Postgres or local JSON fallback).
 * Never stores contract body — only contract_hash.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { assertDatabaseConfigured, isProduction } from "../env";
import { ensureSchema, getSql, usePostgres } from "./pg";
import type { CreateFeedbackInput, FeedbackRecord } from "../feedback/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const MAX_JSON = 5000;

function ensureStore(): void {
  if (isProduction()) assertDatabaseConfigured();
}

export async function insertFeedback(
  input: CreateFeedbackInput
): Promise<FeedbackRecord> {
  ensureStore();

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const comment =
    typeof input.comment === "string" && input.comment.trim()
      ? input.comment.trim().slice(0, 2000)
      : null;

  const record: FeedbackRecord = {
    id,
    contractHash: input.contractHash,
    jurisdiction: input.jurisdiction,
    promptVersion: input.promptVersion,
    ragMetadata: input.ragMetadata,
    targetType: input.targetType,
    targetId: input.targetId,
    feedbackType: input.feedbackType,
    comment,
    userId: input.userId ?? null,
    createdAt,
  };

  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    await db`
      INSERT INTO feedback (
        id, contract_hash, jurisdiction, prompt_version, rag_metadata,
        target_type, target_id, feedback_type, comment, user_id, created_at
      ) VALUES (
        ${id}::uuid,
        ${record.contractHash},
        ${record.jurisdiction},
        ${record.promptVersion},
        ${JSON.stringify(record.ragMetadata)}::jsonb,
        ${record.targetType},
        ${record.targetId},
        ${record.feedbackType},
        ${record.comment},
        ${record.userId},
        ${createdAt}
      )`;
    return record;
  }

  await mkdir(DATA_DIR, { recursive: true });
  let rows: FeedbackRecord[] = [];
  try {
    rows = JSON.parse(await readFile(FEEDBACK_FILE, "utf8")) as FeedbackRecord[];
  } catch {
    rows = [];
  }
  rows.push(record);
  if (rows.length > MAX_JSON) rows = rows.slice(-MAX_JSON);
  await writeFile(FEEDBACK_FILE, JSON.stringify(rows, null, 2), "utf8");
  return record;
}
