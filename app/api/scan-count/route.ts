import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "scan-count.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readCount(): number {
  ensureDataDir();
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw).count ?? 331;
  } catch {
    writeFileSync(DATA_FILE, JSON.stringify({ count: 331 }));
    return 331;
  }
}

function writeCount(n: number) {
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify({ count: n }));
}

export async function GET() {
  return NextResponse.json({ count: readCount() });
}

export async function POST() {
  const next = readCount() + 1;
  writeCount(next);
  return NextResponse.json({ count: next });
}
