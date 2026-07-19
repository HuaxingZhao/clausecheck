import { NextRequest } from "next/server";
import { getActiveProvider } from "@/lib/ai/router";
import { resolveAiRegion } from "@/lib/ai/region";
import type { ReviewChunk } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  contract?: string;
  lang?: string;
};

function sseData(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function errorChunk(message: string): ReviewChunk {
  return {
    sectionId: "error",
    riskLevel: "MEDIUM",
    summary: message,
    suggestion:
      "Retry the review shortly. If the issue continues, contact support@clausecheck.cc.",
  };
}

/**
 * Streaming contract review — dual-region router.
 * Request body: { contract: string, lang?: string }
 * Headers: optional X-User-Region: CN | GLOBAL
 * Response: text/event-stream of ReviewChunk JSON; header X-AI-Region for debug.
 */
export async function POST(req: NextRequest) {
  const region = resolveAiRegion(req);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "X-AI-Region": region },
    });
  }

  const contract = typeof body.contract === "string" ? body.contract.trim() : "";
  if (!contract) {
    return new Response(JSON.stringify({ error: "contract is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "X-AI-Region": region },
    });
  }

  const lang = typeof body.lang === "string" ? body.lang : region === "CN" ? "zh" : "en";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (chunk: ReviewChunk) => {
        controller.enqueue(enc.encode(sseData(chunk)));
      };
      try {
        const provider = getActiveProvider(region);
        for await (const chunk of provider.streamReview(contract, lang)) {
          send(chunk);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Model provider failed";
        // Standardized error chunk — do not abort SSE abruptly without payload.
        send(errorChunk(message));
      } finally {
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-AI-Region": region,
    },
  });
}

export async function GET() {
  return Response.json({
    endpoint: "/api/contract/review",
    methods: ["POST"],
    body: { contract: "string", lang: "zh|en (optional)" },
    headers: { "X-User-Region": "CN|GLOBAL (optional)" },
    responseHeaders: { "X-AI-Region": "resolved region" },
  });
}
