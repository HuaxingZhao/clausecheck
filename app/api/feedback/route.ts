import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { insertFeedback } from "@/lib/db/feedback-store";

const ragSchema = z.object({
  packId: z.string().min(1).max(64),
  retrievedChunkIds: z.array(z.string().max(128)).max(200),
  degraded: z.boolean(),
});

const bodySchema = z.object({
  contractHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "contractHash must be SHA-256 hex"),
  jurisdiction: z.string().min(1).max(64),
  promptVersion: z.string().min(1).max(128),
  ragMetadata: ragSchema,
  targetType: z.enum(["flag", "missingClause", "summary"]),
  targetId: z.string().min(1).max(256),
  feedbackType: z.enum(["accurate", "missed_issue", "false_positive"]),
  comment: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const session = await getSessionFromRequest(req);
    const userId = session?.sub ?? null;

    const record = await insertFeedback({
      ...parsed.data,
      comment: parsed.data.comment ?? null,
      userId,
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      anonymous: !userId,
      createdAt: record.createdAt,
    });
  } catch (err: unknown) {
    console.error("feedback POST error:", err);
    return NextResponse.json(
      { error: "FEEDBACK_FAILED", message: "Could not save feedback" },
      { status: 500 }
    );
  }
}
