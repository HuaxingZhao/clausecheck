/**
 * Pre-deploy env parity check: .env.example ↔ codebase ↔ runtime values.
 * Usage: npm run verify:env  |  npm run deploy:prep
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const EXAMPLE_PATH = path.join(ROOT, ".env.example");

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_URL",
  "PAYMENT_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "ADMIN_EMAILS",
] as const;

const OPTIONAL_WARN_PREFIXES = ["STRIPE_", "GOOGLE_", "REDIS_", "SENTRY_"] as const;

/** Set by Next/build/runtime — not required in .env.example */
const IGNORED_ENV_KEYS = new Set([
  "NODE_ENV",
  "NEXT_RUNTIME",
  "CI",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_SHA",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_MONITORING_ENABLED",
  "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
  "VERIFY_CLIENT_IP",
]);

const SCAN_DIRS = ["app", "lib", "src"];
const SCAN_ROOT_FILES = [
  "next.config.mjs",
  "instrumentation.ts",
  "sentry.client.config.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
];

const ENV_REF =
  /process\.env(?:\[['"]([A-Z0-9_]+)['"]\]|\.([A-Z0-9_]+))/g;

function isOptionalWarnKey(key: string): boolean {
  return OPTIONAL_WARN_PREFIXES.some((p) => key.startsWith(p));
}

function stripInlineComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "#" && !inSingle && !inDouble) {
      return raw.slice(0, i).trim();
    }
  }
  return raw.trim();
}

async function parseEnvExample(filePath: string): Promise<Map<string, string>> {
  const raw = await readFile(filePath, "utf8");
  const map = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = stripInlineComment(trimmed.slice(eq + 1));
    map.set(key, value);
  }
  return map;
}

async function loadRuntimeEnv(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, file), "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = stripInlineComment(trimmed.slice(eq + 1));
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!map.has(key)) map.set(key, value);
      }
    } catch {
      /* file optional */
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (v != null && v !== "" && !map.has(k)) map.set(k, v);
  }
  return map;
}

async function collectSourceFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".next") continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      await collectSourceFiles(full, out);
    } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      out.push(full);
    }
  }
}

async function scanCodeEnvKeys(): Promise<Set<string>> {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    await collectSourceFiles(path.join(ROOT, dir), files);
  }
  for (const rel of SCAN_ROOT_FILES) {
    const full = path.join(ROOT, rel);
    try {
      await stat(full);
      files.push(full);
    } catch {
      /* optional */
    }
  }

  const keys = new Set<string>();
  for (const file of files) {
    const content = await readFile(file, "utf8");
    ENV_REF.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ENV_REF.exec(content)) !== null) {
      const key = m[1] ?? m[2];
      if (key && !IGNORED_ENV_KEYS.has(key)) keys.add(key);
    }
  }
  return keys;
}

function printHeader(title: string): void {
  console.log("");
  console.log(title);
  console.log("─".repeat(title.length));
}

async function main(): Promise<void> {
  console.log("ClauseCheck verify-env");
  console.log(`ROOT=${ROOT}`);

  const example = await parseEnvExample(EXAMPLE_PATH);
  const exampleKeys = new Set(example.keys());
  const codeKeys = await scanCodeEnvKeys();
  const runtime = await loadRuntimeEnv();

  let exitCode = 0;

  printHeader("Parity: codebase vs .env.example");
  const missingInExample = [...codeKeys].filter((k) => !exampleKeys.has(k)).sort();
  const unusedInExample = [...exampleKeys].filter((k) => !codeKeys.has(k)).sort();

  if (missingInExample.length === 0) {
    console.log("✅ All process.env keys used in app/lib are documented in .env.example");
  } else {
    for (const key of missingInExample) {
      console.error(`❌ Code uses process.env.${key} but .env.example has no entry`);
    }
    exitCode = 1;
  }

  if (unusedInExample.length === 0) {
    console.log("✅ No unused keys in .env.example");
  } else {
    for (const key of unusedInExample) {
      console.warn(`⚠️  .env.example defines ${key} but no reference in app/lib/src scan`);
    }
  }

  printHeader("Required variables (production)");
  for (const key of REQUIRED_KEYS) {
    const value = runtime.get(key)?.trim() ?? "";
    if (!value) {
      console.error(`❌ Missing required: ${key}`);
      exitCode = 1;
    } else {
      console.log(`✅ ${key}`);
    }
  }

  if (runtime.get("AUTH_SECRET") === "dev-only-change-me-in-production") {
    console.error("❌ AUTH_SECRET must not use the dev default in production prep");
    exitCode = 1;
  }

  printHeader("Optional variables (warn if unset)");
  const optionalCandidates = [...new Set([...codeKeys, ...exampleKeys])]
    .filter((k) => isOptionalWarnKey(k))
    .sort();
  for (const key of optionalCandidates) {
    const value = runtime.get(key)?.trim() ?? "";
    if (!value) {
      console.warn(`⚠️  Optional not set: ${key}`);
    } else {
      console.log(`✅ ${key}`);
    }
  }

  printHeader("Summary");
  if (exitCode === 0) {
    console.log("✅ Environment check passed");
  } else {
    console.error("❌ Environment check failed — fix items above before deploy");
  }

  process.exit(exitCode);
}

main().catch((err: unknown) => {
  console.error("verify-env fatal:", err);
  process.exit(1);
});
