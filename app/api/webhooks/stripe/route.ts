/**
 * POST /api/webhooks/stripe
 *
 * 接收 Stripe 事件通知。主要处理：
 *   - checkout.session.completed → 付款成功
 *
 * 部署后需要在 Stripe Dashboard 配置 Webhook endpoint：
 *   https://你的域名/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-16.acacia" as any,
});

const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // 开发环境：不验证签名
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "签名验证失败" }, { status: 400 });
  }

  // 处理付款成功事件
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const priceId = session.metadata?.priceId;

    console.log(`✅ 付款成功 — priceId=${priceId}, customer=${session.customer}, amount=${session.amount_total}`);

    // 这里可以：
    // 1. 写数据库标记用户为 Pro
    // 2. 发送欢迎邮件
    // 3. 给用户生成邀请码
    //
    // 当前阶段（无用户系统）：客户端通过 success_url 参数
    // 回跳时读取 ?checkout=success 并调用 setPro()
  }

  // 处理订阅取消（日后扩展）
  if (event.type === "customer.subscription.deleted") {
    console.log("⚠️ 订阅已取消");
    // 日后取消 Pro 状态
  }

  return NextResponse.json({ received: true });
}
