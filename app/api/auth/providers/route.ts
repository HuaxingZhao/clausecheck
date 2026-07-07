import { NextResponse } from "next/server";
import { isAppleOAuthConfigured } from "@/lib/auth/apple";
import { isGoogleOAuthConfigured } from "@/lib/auth/oauth";

export async function GET() {
  return NextResponse.json({
    email: true,
    google: isGoogleOAuthConfigured(),
    apple: isAppleOAuthConfigured(),
  });
}
