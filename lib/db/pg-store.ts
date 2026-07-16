import postgres from "postgres";
import type { ScanResult, ContractChange } from "../types";
import { ensureSchema, getSql } from "./pg";
import type {
  MagicToken,
  MagicTokenPurpose,
  ProBilling,
  SavedReport,
  SavedRevision,
  Team,
  TeamInvite,
  TeamRole,
  User,
} from "./types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function rowToUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    email: (r.email as string | null) ?? null,
    phoneE164: (r.phone_e164 as string | null) ?? null,
    phoneVerifiedAt: r.phone_verified_at
      ? new Date(r.phone_verified_at as string).toISOString()
      : null,
    supabaseUserId: (r.supabase_user_id as string | null) ?? null,
    stripeCustomerId: (r.stripe_customer_id as string) ?? null,
    subscriptionStatus: (r.subscription_status as User["subscriptionStatus"]) ?? "none",
    proUntil: r.pro_until ? new Date(r.pro_until as string).toISOString() : null,
    proBilling:
      r.pro_billing === "prepaid" || r.pro_billing === "subscription"
        ? (r.pro_billing as ProBilling)
        : null,
    teamId: (r.team_id as string) ?? null,
    teamRole: (r.team_role as TeamRole) ?? null,
    sessionVersion: typeof r.session_version === "number" ? r.session_version : 0,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowToTeam(r: Record<string, unknown>): Team {
  return {
    id: r.id as string,
    name: r.name as string,
    ownerId: (r.owner_id as string) ?? null,
    stripeCustomerId: (r.stripe_customer_id as string) ?? null,
    subscriptionStatus: (r.subscription_status as Team["subscriptionStatus"]) ?? "none",
    proUntil: r.pro_until ? new Date(r.pro_until as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowToReport(r: Record<string, unknown>): SavedReport {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    teamId: (r.team_id as string) ?? null,
    title: r.title as string,
    fileName: (r.file_name as string) ?? null,
    locale: r.locale as "zh" | "en",
    scoreNum: r.score_num as number,
    scoreText: r.score_text as string,
    result: r.result as ScanResult,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  await ensureSchema();
  const rows = await getSql()`SELECT * FROM users WHERE email = ${normalizeEmail(email)} LIMIT 1`;
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function findUserByPhone(phoneE164: string): Promise<User | null> {
  await ensureSchema();
  const rows = await getSql()`
    SELECT * FROM users WHERE phone_e164 = ${phoneE164} LIMIT 1`;
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function findUserBySupabaseId(supabaseUserId: string): Promise<User | null> {
  await ensureSchema();
  const rows = await getSql()`
    SELECT * FROM users WHERE supabase_user_id = ${supabaseUserId} LIMIT 1`;
  return rows[0] ? rowToUser(rows[0]) : null;
}

/** Create or update a phone-verified user; returns local ClauseCheck user. */
export async function upsertPhoneUser(input: {
  phoneE164: string;
  supabaseUserId: string;
}): Promise<{ user: User; created: boolean }> {
  await ensureSchema();
  const db = getSql();
  const now = new Date().toISOString();

  const byPhone = await findUserByPhone(input.phoneE164);
  if (byPhone) {
    await db`
      UPDATE users SET
        phone_verified_at = NOW(),
        supabase_user_id = COALESCE(supabase_user_id, ${input.supabaseUserId}),
        updated_at = NOW()
      WHERE id = ${byPhone.id}`;
    return { user: (await findUserById(byPhone.id))!, created: false };
  }

  const bySupabase = await findUserBySupabaseId(input.supabaseUserId);
  if (bySupabase) {
    await db`
      UPDATE users SET
        phone_e164 = ${input.phoneE164},
        phone_verified_at = NOW(),
        updated_at = NOW()
      WHERE id = ${bySupabase.id}`;
    return { user: (await findUserById(bySupabase.id))!, created: false };
  }

  const id = crypto.randomUUID();
  await db`
    INSERT INTO users (
      id, email, phone_e164, phone_verified_at, supabase_user_id,
      subscription_status, created_at, updated_at
    ) VALUES (
      ${id}, NULL, ${input.phoneE164}, ${now}, ${input.supabaseUserId},
      'none', ${now}, ${now}
    )`;
  return { user: (await findUserById(id))!, created: true };
}

export async function findUserById(id: string): Promise<User | null> {
  await ensureSchema();
  const rows = await getSql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function getPasswordHash(email: string): Promise<string | null> {
  await ensureSchema();
  const rows = await getSql()`
    SELECT password_hash FROM users WHERE email = ${normalizeEmail(email)} LIMIT 1`;
  const hash = rows[0]?.password_hash;
  return typeof hash === "string" && hash.length > 0 ? hash : null;
}

export async function setPasswordHash(email: string, passwordHash: string): Promise<void> {
  await ensureSchema();
  const key = normalizeEmail(email);
  await getSql()`
    UPDATE users SET
      password_hash = ${passwordHash},
      session_version = COALESCE(session_version, 0) + 1,
      updated_at = NOW()
    WHERE email = ${key}`;
}

export async function updateUserEntitlementsById(
  userId: string,
  patch: Partial<
    Pick<User, "stripeCustomerId" | "subscriptionStatus" | "proUntil" | "proBilling">
  > & { clearProBilling?: boolean; clearProUntil?: boolean }
): Promise<User | null> {
  await ensureSchema();
  const existing = await findUserById(userId);
  if (!existing) return null;
  const nextBilling = patch.clearProBilling
    ? null
    : (patch.proBilling ?? existing.proBilling);
  const nextProUntil = patch.clearProUntil
    ? null
    : patch.proUntil
      ? new Date(patch.proUntil)
      : existing.proUntil
        ? new Date(existing.proUntil)
        : null;
  await getSql()`
    UPDATE users SET
      stripe_customer_id = COALESCE(${patch.stripeCustomerId ?? null}, stripe_customer_id),
      subscription_status = COALESCE(${patch.subscriptionStatus ?? null}, subscription_status),
      pro_until = ${nextProUntil},
      pro_billing = ${nextBilling},
      updated_at = NOW()
    WHERE id = ${userId}`;
  return findUserById(userId);
}

export async function upsertUser(
  email: string,
  patch: Partial<
    Pick<
      User,
      | "stripeCustomerId"
      | "subscriptionStatus"
      | "proUntil"
      | "proBilling"
      | "teamId"
      | "teamRole"
    >
  > & { clearProBilling?: boolean; clearProUntil?: boolean }
): Promise<User> {
  await ensureSchema();
  const key = normalizeEmail(email);
  const existing = await findUserByEmail(key);

  if (existing) {
    const nextBilling = patch.clearProBilling
      ? null
      : (patch.proBilling ?? existing.proBilling);
    const nextProUntil = patch.clearProUntil
      ? null
      : patch.proUntil
        ? new Date(patch.proUntil)
        : existing.proUntil
          ? new Date(existing.proUntil)
          : null;
    await getSql()`
      UPDATE users SET
        stripe_customer_id = COALESCE(${patch.stripeCustomerId ?? null}, stripe_customer_id),
        subscription_status = COALESCE(${patch.subscriptionStatus ?? null}, subscription_status),
        pro_until = ${nextProUntil},
        pro_billing = ${nextBilling},
        team_id = COALESCE(${patch.teamId ?? null}, team_id),
        team_role = COALESCE(${patch.teamRole ?? null}, team_role),
        updated_at = NOW()
      WHERE id = ${existing.id}`;
    return (await findUserById(existing.id))!;
  }

  const id = crypto.randomUUID();
  await getSql()`
    INSERT INTO users (
      id, email, stripe_customer_id, subscription_status, pro_until, pro_billing, team_id, team_role
    ) VALUES (
      ${id}, ${key},
      ${patch.stripeCustomerId ?? null},
      ${patch.subscriptionStatus ?? "none"},
      ${patch.proUntil ? new Date(patch.proUntil) : null},
      ${patch.proBilling ?? null},
      ${patch.teamId ?? null},
      ${patch.teamRole ?? null}
    )`;
  return (await findUserById(id))!;
}

export async function createMagicToken(
  email: string,
  ttlMinutes = 30,
  purpose: MagicTokenPurpose = "login"
): Promise<MagicToken> {
  await ensureSchema();
  const key = normalizeEmail(email);
  const token: MagicToken = {
    token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    email: key,
    purpose,
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
  };
  await getSql()`
    DELETE FROM magic_tokens
     WHERE (email = ${key} AND purpose = ${purpose}) OR expires_at < NOW()`;
  await getSql()`
    INSERT INTO magic_tokens (token, email, purpose, expires_at)
    VALUES (${token.token}, ${key}, ${purpose}, ${new Date(token.expiresAt)})`;
  return token;
}

export async function consumeMagicToken(
  token: string,
  expectedPurpose: MagicTokenPurpose = "login"
): Promise<string | null> {
  await ensureSchema();
  const rows = await getSql()`
    DELETE FROM magic_tokens
     WHERE token = ${token}
       AND purpose = ${expectedPurpose}
       AND expires_at > NOW()
    RETURNING email`;
  return rows[0]?.email ?? null;
}

export async function listReportsForUser(userId: string): Promise<SavedReport[]> {
  await ensureSchema();
  const user = await findUserById(userId);
  if (!user) return [];
  const rows = user.teamId
    ? await getSql()`
        SELECT * FROM reports
        WHERE user_id = ${userId} OR team_id = ${user.teamId}
        ORDER BY created_at DESC LIMIT 100`
    : await getSql()`
        SELECT * FROM reports WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 100`;
  return rows.map(rowToReport);
}

export async function getReportForUser(userId: string, reportId: string): Promise<SavedReport | null> {
  await ensureSchema();
  const user = await findUserById(userId);
  if (!user) return null;
  const rows = user.teamId
    ? await getSql()`
        SELECT * FROM reports WHERE id = ${reportId}
        AND (user_id = ${userId} OR team_id = ${user.teamId}) LIMIT 1`
    : await getSql()`
        SELECT * FROM reports WHERE id = ${reportId} AND user_id = ${userId} LIMIT 1`;
  return rows[0] ? rowToReport(rows[0]) : null;
}

export async function saveReport(input: {
  userId: string;
  title: string;
  fileName?: string | null;
  locale: "zh" | "en";
  result: SavedReport["result"];
}): Promise<SavedReport> {
  await ensureSchema();
  const user = await findUserById(input.userId);
  const id = crypto.randomUUID();
  const sql = getSql();
  const { sanitizeScanResultForPersistence } = await import(
    "@/lib/privacy/contract-retention"
  );
  const safeResult = sanitizeScanResultForPersistence(input.result);
  await sql`
    INSERT INTO reports (id, user_id, team_id, title, file_name, locale, score_num, score_text, result)
    VALUES (
      ${id}, ${input.userId}, ${user?.teamId ?? null},
      ${input.title}, ${input.fileName ?? null}, ${input.locale},
      ${safeResult.scoreNum}, ${safeResult.scoreText},
      ${sql.json(safeResult as any)}
    )`;
  return (await getReportForUser(input.userId, id))!;
}

function rowToRevision(r: Record<string, unknown>): SavedRevision {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    teamId: (r.team_id as string) ?? null,
    title: r.title as string,
    locale: r.locale as "zh" | "en",
    originalText: (r.original_text as string) ?? "",
    revisedContract: (r.revised_contract as string) ?? "",
    changes: (r.changes as ContractChange[]) ?? [],
    originalFile: (r.original_file as string) ?? null,
    originalFileType: (r.original_file_type as "pdf" | "docx") ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

export async function listRevisionsForUser(userId: string): Promise<SavedRevision[]> {
  await ensureSchema();
  const user = await findUserById(userId);
  if (!user) return [];
  const rows = user.teamId
    ? await getSql()`
        SELECT * FROM revisions
        WHERE user_id = ${userId} OR team_id = ${user.teamId}
        ORDER BY created_at DESC LIMIT 100`
    : await getSql()`
        SELECT * FROM revisions WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 100`;
  return rows.map(rowToRevision);
}

export async function getRevisionForUser(
  userId: string,
  revisionId: string
): Promise<SavedRevision | null> {
  await ensureSchema();
  const user = await findUserById(userId);
  if (!user) return null;
  const rows = user.teamId
    ? await getSql()`
        SELECT * FROM revisions WHERE id = ${revisionId}
        AND (user_id = ${userId} OR team_id = ${user.teamId}) LIMIT 1`
    : await getSql()`
        SELECT * FROM revisions WHERE id = ${revisionId} AND user_id = ${userId} LIMIT 1`;
  return rows[0] ? rowToRevision(rows[0]) : null;
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
}): Promise<SavedRevision> {
  await ensureSchema();
  const user = await findUserById(input.userId);
  const id = crypto.randomUUID();
  const sql = getSql();
  // Never persist original upload bytes. Body text is hard-deleted by cron ≤24h.
  await sql`
    INSERT INTO revisions (id, user_id, team_id, title, locale, original_text, revised_contract, changes, original_file, original_file_type)
    VALUES (
      ${id}, ${input.userId}, ${user?.teamId ?? null},
      ${input.title}, ${input.locale}, ${input.originalText}, ${input.revisedContract},
      ${sql.json(input.changes as any)}, NULL, NULL
    )`;
  return (await getRevisionForUser(input.userId, id))!;
}

/** Physical DELETE of expired revision bodies + scrub leftover report sources. */
export async function purgeExpiredContractData(now: Date = new Date()): Promise<{
  revisionsDeleted: number;
  reportsScrubbed: number;
  cutoffIso: string;
}> {
  await ensureSchema();
  const {
    contractBodyCutoffDate,
    sanitizeScanResultForPersistence,
  } = await import("@/lib/privacy/contract-retention");
  const cutoff = contractBodyCutoffDate(now);
  const sql = getSql();

  const deleted = await sql`
    DELETE FROM revisions
    WHERE created_at < ${cutoff}
    RETURNING id`;

  // Drop any leftover upload blobs immediately (hard null, not soft-delete).
  await sql`
    UPDATE revisions
    SET original_file = NULL, original_file_type = NULL
    WHERE original_file IS NOT NULL`;

  const dirty = await sql`
    SELECT id, result FROM reports
    WHERE COALESCE(result #>> '{contractReview,source}', '') <> ''
       OR result ? 'contractText'`;

  let reportsScrubbed = 0;
  for (const row of dirty) {
    const safe = sanitizeScanResultForPersistence(row.result as Parameters<
      typeof sanitizeScanResultForPersistence
    >[0]);
    await sql`UPDATE reports SET result = ${sql.json(safe as any)} WHERE id = ${row.id as string}`;
    reportsScrubbed += 1;
  }

  return {
    revisionsDeleted: deleted.length,
    reportsScrubbed,
    cutoffIso: cutoff.toISOString(),
  };
}

export async function createTeam(name: string, ownerId: string): Promise<Team> {
  await ensureSchema();
  const id = crypto.randomUUID();
  const db = getSql();
  await db`INSERT INTO teams (id, name, owner_id) VALUES (${id}, ${name}, ${ownerId})`;
  // Prefer id update — phone-only owners may have null email.
  await db`
    UPDATE users SET
      team_id = ${id},
      team_role = 'owner',
      updated_at = NOW()
    WHERE id = ${ownerId}`;
  return (await findTeamById(id))!;
}

export async function findTeamById(id: string): Promise<Team | null> {
  await ensureSchema();
  const rows = await getSql()`SELECT * FROM teams WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToTeam(rows[0]) : null;
}

export async function upsertTeamSubscription(
  teamId: string,
  patch: Partial<Pick<Team, "stripeCustomerId" | "subscriptionStatus" | "proUntil">>
): Promise<Team> {
  await ensureSchema();
  await getSql()`
    UPDATE teams SET
      stripe_customer_id = COALESCE(${patch.stripeCustomerId ?? null}, stripe_customer_id),
      subscription_status = COALESCE(${patch.subscriptionStatus ?? null}, subscription_status),
      pro_until = COALESCE(${patch.proUntil ? new Date(patch.proUntil) : null}, pro_until),
      updated_at = NOW()
    WHERE id = ${teamId}`;
  return (await findTeamById(teamId))!;
}

export async function addTeamMember(teamId: string, email: string, role: TeamRole = "member"): Promise<User> {
  return upsertUser(email, { teamId, teamRole: role });
}

export async function createTeamInvite(teamId: string, email: string): Promise<TeamInvite> {
  await ensureSchema();
  const invite: TeamInvite = {
    id: crypto.randomUUID(),
    teamId,
    email: normalizeEmail(email),
    expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
  };
  await getSql()`
    INSERT INTO team_invites (id, team_id, email, expires_at)
    VALUES (${invite.id}, ${teamId}, ${invite.email}, ${new Date(invite.expiresAt)})`;
  return invite;
}

export async function acceptTeamInvite(inviteId: string, userEmail: string): Promise<boolean> {
  await ensureSchema();
  const rows = await getSql()`
    DELETE FROM team_invites
    WHERE id = ${inviteId} AND email = ${normalizeEmail(userEmail)} AND expires_at > NOW()
    RETURNING team_id`;
  if (!rows[0]) return false;
  await addTeamMember(rows[0].team_id as string, userEmail, "member");
  return true;
}

export async function listTeamMembers(teamId: string): Promise<User[]> {
  await ensureSchema();
  const rows = await getSql()`SELECT * FROM users WHERE team_id = ${teamId}`;
  return rows.map(rowToUser);
}
