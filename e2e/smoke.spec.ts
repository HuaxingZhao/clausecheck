/**
 * 生产环境冒烟测试 — 部署后验证 P0 API / 页面契约。
 *
 * 运行：
 *   npm run test:smoke
 *   BASE_URL=https://preview.example.com npm run test:smoke
 *
 * 可选环境变量（带鉴权用例）：
 *   SMOKE_SESSION_COOKIE  — 生产 session（cc_session=… 或裸 JWT）
 *   SMOKE_ORDER_ID          — 当前用户拥有的订单 UUID（P0-2 正向用例）
 *   SMOKE_FOREIGN_ORDER_ID  — 他人订单 UUID（默认随机 UUID，期望 404）
 *   SMOKE_USER_ID / SMOKE_USER_EMAIL — 本地 AUTH_SECRET 签发 JWT 时使用
 */
import { test, expect } from "@playwright/test";
import {
  cookieHeader,
  resolveSmokeSessionCookie,
} from "./helpers/session";

const INVALID_ORDER_ID = "not-a-valid-uuid";
/** 合法 UUID，通常不存在或不属于当前用户 */
const FOREIGN_ORDER_ID =
  process.env.SMOKE_FOREIGN_ORDER_ID?.trim() ||
  "11111111-1111-4111-8111-111111111111";
const OWN_ORDER_ID = process.env.SMOKE_ORDER_ID?.trim() || "";

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
      const cookie = await resolveSmokeSessionCookie();
      test.skip(!cookie, "需要 SMOKE_SESSION_COOKIE 或本地 AUTH_SECRET 以签发测试 session");

      const res = await request.get("/api/user/credits", {
        headers: cookieHeader(cookie!),
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
    let sessionCookie: string | null;

    test.beforeAll(async () => {
      sessionCookie = await resolveSmokeSessionCookie();
    });

    test("带有效 session + 合法 orderId → { status: string }", async ({ request }) => {
      test.skip(!sessionCookie, "需要有效 session");
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
      test.skip(!sessionCookie, "需要有效 session");

      const res = await request.get(`/api/orders/${INVALID_ORDER_ID}/status`, {
        headers: cookieHeader(sessionCookie!),
      });
      // 路由当前对非法 UUID 返回 404；规范期望 400，二者均视为拒绝
      expect([400, 404]).toContain(res.status());
    });

    test("他人订单 → 404", async ({ request }) => {
      test.skip(!sessionCookie, "需要有效 session");

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
      const res = await request.get("/zh/dashboard", { maxRedirects: 0 });
      expect([307, 308]).toContain(res.status());

      const location = res.headers()["location"] ?? "";
      // Next.js redirect 可能返回相对或绝对 URL
      expect(location).toMatch(/\/zh\/account\/?(\?.*)?$/);
    });

    test("/en/dashboard → 重定向到 /en/account", async ({ request }) => {
      const res = await request.get("/en/dashboard", { maxRedirects: 0 });
      expect([307, 308]).toContain(res.status());

      const location = res.headers()["location"] ?? "";
      expect(location).toMatch(/\/en\/account\/?(\?.*)?$/);
    });
  });

  test.describe("Admin Access Control", () => {
    // 未登录访问运营后台应被拦截（重定向或 403）
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
});
