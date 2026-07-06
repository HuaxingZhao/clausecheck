import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getRevisionForUser } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";
import {
  generateSuggestionsDocx,
  generateSuggestionsPdf,
  suggestionsFilenames,
  finalContractFilenames,
} from "@/lib/contract-export";
import { generateFinalContract, generateEditedContractFromOriginal } from "@/lib/final-contract";

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

  function fileResponse(bytes: Uint8Array, type: string, utf8Name: string, asciiName: string) {
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(utf8Name)}`,
        "Cache-Control": "private, max-age=600",
      },
    });
  }

  const url = new URL(req.url);
  const variant = url.searchParams.get("variant");
  const fmt = url.searchParams.get("format") === "docx" ? "docx" : "pdf";

  if (variant === "final" && (revision.changes?.length ?? 0) > 0) {
    const names = finalContractFilenames(revision.locale);
    const changeList = revision.changes ?? [];
    const ascii =
      fmt === "docx" ? "ClauseCheck-Revised-Contract.docx" : "ClauseCheck-Revised-Contract.pdf";

    if (revision.originalFile && revision.originalFileType) {
      const originalBytes = Uint8Array.from(atob(revision.originalFile), (c) => c.charCodeAt(0));
      try {
        const { bytes } = await generateEditedContractFromOriginal({
          originalBytes,
          originalFileType: revision.originalFileType,
          changes: changeList,
          format: fmt,
          locale: revision.locale,
        });

        if (fmt === "docx") {
          return fileResponse(
            bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            names.docx,
            ascii
          );
        }
        return fileResponse(bytes, "application/pdf", names.pdf, ascii);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Export failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (!revision.originalText?.trim()) {
      return NextResponse.json({ error: "Missing contract text" }, { status: 400 });
    }

    const { bytes } = await generateFinalContract({
      format: fmt,
      changes: changeList,
      contractText: revision.originalText,
      locale: revision.locale,
    });

    if (fmt === "docx") {
      return fileResponse(
        bytes,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        names.docx,
        ascii
      );
    }
    return fileResponse(bytes, "application/pdf", names.pdf, ascii);
  }

  const names = suggestionsFilenames(revision.locale);
  const ascii =
    fmt === "docx" ? "ClauseCheck-Suggestions.docx" : "ClauseCheck-Suggestions.pdf";

  const changeList = revision.changes ?? [];

  if (fmt === "docx") {
    const bytes = await generateSuggestionsDocx(changeList, revision.locale);
    return fileResponse(
      bytes,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      names.docx,
      ascii
    );
  }

  const bytes = await generateSuggestionsPdf(changeList, revision.locale);
  return fileResponse(bytes, "application/pdf", names.pdf, ascii);
}
