import { NextResponse } from "next/server";

/** Alias for Payment Element subscription checkout — same handler as create-intent. */
export { POST } from "../stripe/create-intent/route";

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/create-subscription",
    aliasOf: "/api/stripe/create-intent",
    methods: ["POST"],
    description: "Create Stripe subscription or add-on PaymentIntent; returns clientSecret.",
  });
}
