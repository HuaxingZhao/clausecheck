/**
 * 生产环境冒烟测试 — 部署后验证 P0 API / 页面契约。
 *
 * 运行：
 *   npm run test:smoke
 *   BASE_URL=https://preview.example.com npm run test:smoke
 *
 * 带鉴权用例（生产必配其一）：
 *   SMOKE_SESSION_COOKIE  — 浏览器登录后复制 cc_session=…
 *   SMOKE_ORDER_ID        — 当前用户订单 UUID（P0-2 正向用例，可选）
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  cookieHeader,
  resolveWorkingSessionCookie,
} from "./helpers/session";

const INVALID_ORDER_ID = "not-a-valid-uuid";
const FOREIGN_ORDER_ID =
  process.env.SMOKE_FOREIGN_ORDER_ID?.trim() ||
  "11111111-1111-4111-8111-111111111111";
const OWN_ORDER_ID = process.env.SMOKE_ORDER_ID?.trim() || "";

let sessionCookie: string | null = null;

test.beforeAll(async () => {
  const baseURL =
    process.env.BASE_URL?.replace(/\/$/, "") ?? "https://www.clausecheck.cc";
  const ctx = await playwrightRequest.newContext({ baseURL });
  sessionCookie = await resolveWorkingSessionCookie(ctx);
  await ctx.dispose();
});

test.describe("生产环境冒烟测试", () => {
  test.describe("Health Check", () => {
    // P0 基础设施：/api/health 可达且核心依赖正常
    test("GET /api/health 返回 200 且 database/openai 为 ok", async ({ request }) => {
      const res = await request.get("/api/health");
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.checks.database.status).toBe("ok");
      expect(body.checks.openai.status).toBe("ok");
    });
  });

  test.describe("Credits API (P0-1)", () => {
    test("带有效 session → { balance: number }", async ({ request }) => {
      test.skip(
        !sessionCookie,
        "需要 SMOKE_SESSION_COOKIE（浏览器登录 www.clausecheck.cc 后复制 cc_session）"
      );

      const res = await request.get("/api/user/credits", {
        headers: cookieHeader(sessionCookie!),
      });
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toMatchObject({ balance: expect.any(Number) });
      expect(Number.isFinite(body.balance)).toBe(true);
    });

    test("不带 cookie → 401", async ({ request }) => {
      const res = await request.get("/api/user/credits");
      expect(res.status()).toBe(401);
    });
  });

  test.describe("Order Status API (P0-2)", () => {
    test("带有效 session + 合法 orderId → { status: string }", async ({ request }) => {
      test.skip(!sessionCookie, "需要 SMOKE_SESSION_COOKIE");
      test.skip(!OWN_ORDER_ID, "需要 SMOKE_ORDER_ID（当前用户拥有的订单 UUID）");

      const res = await request.get(`/api/orders/${OWN_ORDER_ID}/status`, {
        headers: cookieHeader(sessionCookie!),
      });
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toMatchObject({ status: expect.any(String) });
      expect(["pending", "paid", "failed", "cancelled"]).toContain(body.status);
    });

    test("非法 orderId 格式 → 4xx", async ({ request }) => {
      test.skip(!sessionCookie, "需要 SMOKE_SESSION_COOKIE");

      const res = await request.get(`/api/orders/${INVALID_ORDER_ID}/status`, {
        headers: cookieHeader(sessionCookie!),
      });
      expect([400, 404]).toContain(res.status());
    });

    test("他人订单 → 404", async ({ request }) => {
      test.skip(!sessionCookie, "需要 SMOKE_SESSION_COOKIE");

      const res = await request.get(`/api/orders/${FOREIGN_ORDER_ID}/status`, {
        headers: cookieHeader(sessionCookie!),
      });
      expect(res.status()).toBe(404);
    });

    test("不带 cookie → 401", async ({ request }) => {
      const orderId = OWN_ORDER_ID || FOREIGN_ORDER_ID;
      const res = await request.get(`/api/orders/${orderId}/status`);
      expect(res.status()).toBe(401);
    });
  });

  test.describe("Dashboard Redirect (P0-3)", () => {
    test("/zh/dashboard → 重定向到 /zh/account", async ({ request }) => {
      const res = await request.get("/zh/dashboard", { maxRedirects: 5 });
      expect(res.ok()).toBe(true);
      expect(new URL(res.url()).pathname).toMatch(/^\/zh\/account\/?$/);
    });

    test("/en/dashboard → 重定向到 /account", async ({ request }) => {
      // localePrefix: as-needed — 英文默认不带 /en 前缀
      const res = await request.get("/en/dashboard", { maxRedirects: 5 });
      expect(res.ok()).toBe(true);
      expect(new URL(res.url()).pathname).toMatch(/^\/account\/?$/);
    });
  });

  test.describe("Admin Access Control", () => {
    test("未登录访问 /admin/dashboard → 重定向或 403", async ({ request }) => {
      const res = await request.get("/admin/dashboard", { maxRedirects: 0 });
      const status = res.status();

      if (status === 403) {
        expect(status).toBe(403);
        return;
      }

      expect([307, 308]).toContain(status);
      const location = (res.headers()["location"] ?? "").toLowerCase();
      expect(
        location.includes("admin=forbidden") ||
          location.includes("login") ||
          location.includes("auth") ||
          location.includes("sign")
      ).toBe(true);
    });
  });

  test.describe("Auth + mock pay gates", () => {
    test("GET /zh/forgot-password 可达", async ({ request }) => {
      const res = await request.get("/zh/forgot-password", {
        headers: { Accept: "text/html" },
      });
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html.length).toBeGreaterThan(100);
    });

    test("生产环境 mock-qr GET → 404（禁止无签名入账）", async ({
      request,
      baseURL,
    }) => {
      const host = (() => {
        try {
          return new URL(baseURL ?? "").hostname;
        } catch {
          return "";
        }
      })();
      test.skip(
        host !== "www.clausecheck.cc" && host !== "clausecheck.cc",
        "仅对生产域名断言；本地/预览允许 mock 收银台"
      );

      const res = await request.get(
        "/api/webhooks/payment/mock-qr?order_id=11111111-1111-4111-8111-111111111111&amount_cents=100"
      );
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.error).toMatch(/mock/i);
    });
  });
});
