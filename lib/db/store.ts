import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { DbSnapshot, MagicToken, SavedReport, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app-db.json");

const EMPTY_DB: DbSnapshot = { users: [], reports: [], magicTokens: [] };

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readDb(): Promise<DbSnapshot> {
  await ensureDataDir();
  try {
    const raw = await readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as DbSnapshot;
    return {
      users: parsed.users ?? [],
      reports: parsed.reports ?? [],
      magicTokens: parsed.magicTokens ?? [],
    };
  } catch {
    return { ...EMPTY_DB };
  }
}

async function writeDb(db: DbSnapshot): Promise<void> {
  await ensureDataDir();
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await readDb();
  const key = normalizeEmail(email);
  return db.users.find((u) => u.email === key) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find((u) => u.stripeCustomerId === customerId) ?? null;
}

export async function upsertUser(
  email: string,
  patch: Partial<Pick<User, "stripeCustomerId" | "subscriptionStatus" | "proUntil">>
): Promise<User> {
  const db = await readDb();
  const key = normalizeEmail(email);
  const now = new Date().toISOString();
  let user = db.users.find((u) => u.email === key);

  if (user) {
    user = {
      ...user,
      ...patch,
      updatedAt: now,
    };
    db.users = db.users.map((u) => (u.id === user!.id ? user! : u));
  } else {
    user = {
      id: crypto.randomUUID(),
      email: key,
      stripeCustomerId: patch.stripeCustomerId ?? null,
      subscriptionStatus: patch.subscriptionStatus ?? "none",
      proUntil: patch.proUntil ?? null,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
  }

  await writeDb(db);
  return user;
}

/* ------------------------------------------------------------------ */
/*  Magic tokens                                                       */
/* ------------------------------------------------------------------ */

export async function createMagicToken(email: string, ttlMinutes = 30): Promise<MagicToken> {
  const db = await readDb();
  const key = normalizeEmail(email);
  const now = Date.now();
  const token: MagicToken = {
    token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    email: key,
    expiresAt: new Date(now + ttlMinutes * 60_000).toISOString(),
  };

  db.magicTokens = db.magicTokens.filter(
    (t) => t.email !== key || new Date(t.expiresAt).getTime() > now
  );
  db.magicTokens.push(token);
  await writeDb(db);
  return token;
}

export async function consumeMagicToken(token: string): Promise<string | null> {
  const db = await readDb();
  const now = Date.now();
  const match = db.magicTokens.find(
    (t) => t.token === token && new Date(t.expiresAt).getTime() > now
  );
  if (!match) return null;

  db.magicTokens = db.magicTokens.filter((t) => t.token !== token);
  await writeDb(db);
  return match.email;
}

/* ------------------------------------------------------------------ */
/*  Reports                                                            */
/* ------------------------------------------------------------------ */

export async function listReportsForUser(userId: string): Promise<SavedReport[]> {
  const db = await readDb();
  return db.reports
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getReportForUser(
  userId: string,
  reportId: string
): Promise<SavedReport | null> {
  const db = await readDb();
  const report = db.reports.find((r) => r.id === reportId && r.userId === userId);
  return report ?? null;
}

export async function saveReport(input: {
  userId: string;
  title: string;
  fileName?: string | null;
  locale: "zh" | "en";
  result: SavedReport["result"];
}): Promise<SavedReport> {
  const db = await readDb();
  const report: SavedReport = {
    id: crypto.randomUUID(),
    userId: input.userId,
    title: input.title,
    fileName: input.fileName ?? null,
    locale: input.locale,
    scoreNum: input.result.scoreNum,
    scoreText: input.result.scoreText,
    result: input.result,
    createdAt: new Date().toISOString(),
  };
  db.reports.unshift(report);
  // Keep last 100 reports per user
  const byUser = db.reports.filter((r) => r.userId === input.userId);
  if (byUser.length > 100) {
    const drop = new Set(byUser.slice(100).map((r) => r.id));
    db.reports = db.reports.filter((r) => !drop.has(r.id));
  }
  await writeDb(db);
  return report;
}
