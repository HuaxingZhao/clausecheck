import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getRevisionForUser } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";
import {
  generateSuggestionsDocx,
  generateSuggestionsPdf,
  suggestionsFilenames,
} from "@/lib/contract-export";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await getUserEntitlements(session.sub);
  if (!user || !(await isProUser(user))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const revision = await getRevisionForUser(session.sub, params.id);
  if (!revision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const fmt = url.searchParams.get("format") === "docx" ? "docx" : "pdf";
  const names = suggestionsFilenames(revision.locale);
  const ascii =
    fmt === "docx" ? "ClauseCheck-Suggestions.docx" : "ClauseCheck-Suggestions.pdf";

  function fileResponse(bytes: Uint8Array, type: string, utf8Name: string) {
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`,
        "Cache-Control": "private, max-age=600",
      },
    });
  }

  const changeList = revision.changes ?? [];

  if (fmt === "docx") {
    const bytes = await generateSuggestionsDocx(changeList, revision.locale);
    return fileResponse(
      bytes,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      names.docx
    );
  }

  const bytes = await generateSuggestionsPdf(changeList, revision.locale);
  return fileResponse(bytes, "application/pdf", names.pdf);
}
