import { NextResponse } from "next/server";
import { isGoogleOAuthConfigured } from "@/lib/auth/oauth";

export async function GET() {
  return NextResponse.json({
    email: true,
    google: isGoogleOAuthConfigured(),
  });
}
