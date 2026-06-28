/**
 * Data store — Postgres when DATABASE_URL is set, else JSON file (local dev).
 */
import { usePostgres } from "./pg";
import * as pg from "./pg-store";
import type { MagicToken, SavedReport, SavedRevision, Team, TeamInvite, TeamRole, User } from "./types";
import type { ContractChange } from "../types";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app-db.json");

type JsonDb = {
  users: User[];
  reports: SavedReport[];
  revisions: SavedRevision[];
  magicTokens: MagicToken[];
  teams: Team[];
  teamInvites: TeamInvite[];
};

const EMPTY: JsonDb = { users: [], reports: [], revisions: [], magicTokens: [], teams: [], teamInvites: [] };

async function readJson(): Promise<JsonDb> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DB_FILE, "utf8");
    const p = JSON.parse(raw) as JsonDb;
    return {
      users: (p.users ?? []).map(normalizeJsonUser),
      reports: (p.reports ?? []).map((r) => ({ ...r, teamId: r.teamId ?? null })),
      revisions: (p.revisions ?? []).map((r) => ({
        ...r,
        teamId: r.teamId ?? null,
        originalFile: r.originalFile ?? null,
        originalFileType: r.originalFileType ?? null,
      })),
      magicTokens: p.magicTokens ?? [],
      teams: p.teams ?? [],
      teamInvites: p.teamInvites ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeJson(db: JsonDb) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function normalizeJsonUser(u: User): User {
  return {
    ...u,
    teamId: u.teamId ?? null,
    teamRole: u.teamRole ?? null,
  };
}

function norm(email: string) {
  return email.trim().toLowerCase();
}

/* ── Re-export router ── */

export async function findUserByEmail(email: string) {
  if (usePostgres()) return pg.findUserByEmail(email);
  const db = await readJson();
  return db.users.find((u) => u.email === norm(email)) ?? null;
}

export async function findUserById(id: string) {
  if (usePostgres()) return pg.findUserById(id);
  const db = await readJson();
  return db.users.find((u) => u.id === id) ?? null;
}

export async function findUserByStripeCustomerId(customerId: string) {
  if (usePostgres()) return null; // rarely needed
  const db = await readJson();
  return db.users.find((u) => u.stripeCustomerId === customerId) ?? null;
}

export async function upsertUser(
  email: string,
  patch: Partial<
    Pick<User, "stripeCustomerId" | "subscriptionStatus" | "proUntil" | "teamId" | "teamRole">
  >
) {
  if (usePostgres()) return pg.upsertUser(email, patch);
  const db = await readJson();
  const key = norm(email);
  const now = new Date().toISOString();
  let user = db.users.find((u) => u.email === key);
  if (user) {
    user = normalizeJsonUser({ ...user, ...patch, updatedAt: now });
    db.users = db.users.map((u) => (u.id === user!.id ? user! : u));
  } else {
    user = normalizeJsonUser({
      id: crypto.randomUUID(),
      email: key,
      stripeCustomerId: patch.stripeCustomerId ?? null,
      subscriptionStatus: patch.subscriptionStatus ?? "none",
      proUntil: patch.proUntil ?? null,
      teamId: patch.teamId ?? null,
      teamRole: patch.teamRole ?? null,
      createdAt: now,
      updatedAt: now,
    });
    db.users.push(user);
  }
  await writeJson(db);
  return user;
}

export async function createMagicToken(email: string, ttlMinutes = 30) {
  if (usePostgres()) return pg.createMagicToken(email, ttlMinutes);
  const db = await readJson();
  const key = norm(email);
  const token: MagicToken = {
    token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    email: key,
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
  };
  db.magicTokens = db.magicTokens.filter(
    (t) => t.email !== key || new Date(t.expiresAt).getTime() > Date.now()
  );
  db.magicTokens.push(token);
  await writeJson(db);
  return token;
}

export async function consumeMagicToken(token: string) {
  if (usePostgres()) return pg.consumeMagicToken(token);
  const db = await readJson();
  const match = db.magicTokens.find(
    (t) => t.token === token && new Date(t.expiresAt).getTime() > Date.now()
  );
  if (!match) return null;
  db.magicTokens = db.magicTokens.filter((t) => t.token !== token);
  await writeJson(db);
  return match.email;
}

export async function listReportsForUser(userId: string) {
  if (usePostgres()) return pg.listReportsForUser(userId);
  const db = await readJson();
  const user = db.users.find((u) => u.id === userId);
  return db.reports
    .filter((r) => r.userId === userId || (user?.teamId && r.teamId === user.teamId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getReportForUser(userId: string, reportId: string) {
  if (usePostgres()) return pg.getReportForUser(userId, reportId);
  const db = await readJson();
  const user = db.users.find((u) => u.id === userId);
  const report = db.reports.find(
    (r) =>
      r.id === reportId &&
      (r.userId === userId || (user?.teamId && r.teamId === user.teamId))
  );
  return report ?? null;
}

export async function saveReport(input: {
  userId: string;
  title: string;
  fileName?: string | null;
  locale: "zh" | "en";
  result: SavedReport["result"];
}) {
  if (usePostgres()) return pg.saveReport(input);
  const db = await readJson();
  const user = db.users.find((u) => u.id === input.userId);
  const report: SavedReport = {
    id: crypto.randomUUID(),
    userId: input.userId,
    teamId: user?.teamId ?? null,
    title: input.title,
    fileName: input.fileName ?? null,
    locale: input.locale,
    scoreNum: input.result.scoreNum,
    scoreText: input.result.scoreText,
    result: input.result,
    createdAt: new Date().toISOString(),
  };
  db.reports.unshift(report);
  await writeJson(db);
  return report;
}

export async function listRevisionsForUser(userId: string) {
  if (usePostgres()) return pg.listRevisionsForUser(userId);
  const db = await readJson();
  const user = db.users.find((u) => u.id === userId);
  return db.revisions
    .filter((r) => r.userId === userId || (user?.teamId && r.teamId === user.teamId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getRevisionForUser(userId: string, revisionId: string) {
  if (usePostgres()) return pg.getRevisionForUser(userId, revisionId);
  const db = await readJson();
  const user = db.users.find((u) => u.id === userId);
  const rev = db.revisions.find(
    (r) =>
      r.id === revisionId &&
      (r.userId === userId || (user?.teamId && r.teamId === user.teamId))
  );
  return rev ?? null;
}

export async function saveRevision(input: {
  userId: string;
  title: string;
  locale: "zh" | "en";
  originalText: string;
  revisedContract: string;
  changes: ContractChange[];
  originalFile?: string | null;
  originalFileType?: "pdf" | "docx" | null;
}) {
  if (usePostgres()) return pg.saveRevision(input);
  const db = await readJson();
  const user = db.users.find((u) => u.id === input.userId);
  const revision: SavedRevision = {
    id: crypto.randomUUID(),
    userId: input.userId,
    teamId: user?.teamId ?? null,
    title: input.title,
    locale: input.locale,
    originalText: input.originalText,
    revisedContract: input.revisedContract,
    changes: input.changes,
    originalFile: input.originalFile ?? null,
    originalFileType: input.originalFileType ?? null,
    createdAt: new Date().toISOString(),
  };
  db.revisions.unshift(revision);
  await writeJson(db);
  return revision;
}

export async function createTeam(name: string, ownerId: string) {
  if (usePostgres()) return pg.createTeam(name, ownerId);
  const db = await readJson();
  const team: Team = {
    id: crypto.randomUUID(),
    name,
    ownerId,
    stripeCustomerId: null,
    subscriptionStatus: "none",
    proUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.teams.push(team);
  const owner = db.users.find((u) => u.id === ownerId);
  if (owner) {
    owner.teamId = team.id;
    owner.teamRole = "owner";
  }
  await writeJson(db);
  return team;
}

export async function findTeamById(id: string) {
  if (usePostgres()) return pg.findTeamById(id);
  const db = await readJson();
  return db.teams.find((t) => t.id === id) ?? null;
}

export async function upsertTeamSubscription(
  teamId: string,
  patch: Partial<Pick<Team, "stripeCustomerId" | "subscriptionStatus" | "proUntil">>
) {
  if (usePostgres()) return pg.upsertTeamSubscription(teamId, patch);
  const db = await readJson();
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) throw new Error("Team not found");
  Object.assign(team, patch, { updatedAt: new Date().toISOString() });
  await writeJson(db);
  return team;
}

export async function addTeamMember(teamId: string, email: string, role: TeamRole = "member") {
  if (usePostgres()) return pg.addTeamMember(teamId, email, role);
  return upsertUser(email, { teamId, teamRole: role });
}

export async function createTeamInvite(teamId: string, email: string) {
  if (usePostgres()) return pg.createTeamInvite(teamId, email);
  const db = await readJson();
  const invite: TeamInvite = {
    id: crypto.randomUUID(),
    teamId,
    email: norm(email),
    expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
  };
  db.teamInvites.push(invite);
  await writeJson(db);
  return invite;
}

export async function listTeamMembers(teamId: string) {
  if (usePostgres()) return pg.listTeamMembers(teamId);
  const db = await readJson();
  return db.users.filter((u) => u.teamId === teamId);
}
