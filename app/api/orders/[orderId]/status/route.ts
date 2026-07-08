import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { getOrderStatusForUser } from "@/lib/credits/orders";

const orderIdSchema = z.string().uuid();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    if (!creditsSystemEnabled()) {
      return NextResponse.json({ error: "Credits system unavailable" }, { status: 503 });
    }

    const session = await getSessionFromRequest(req);
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      userId = sessionUserIdSchema.parse(session.sub);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { orderId: rawOrderId } = await params;
    const parsedOrderId = orderIdSchema.safeParse(rawOrderId);
    if (!parsedOrderId.success) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const status = await getOrderStatusForUser(parsedOrderId.data, userId);
    if (status == null) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (err: unknown) {
    console.error("order status error:", err);
    return NextResponse.json({ error: "Failed to load order status" }, { status: 500 });
  }
}
