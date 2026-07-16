/**
 * Beta 页 P0 回归（PR #9–#14）
 *
 * 运行：
 *   npm run test:e2e:beta-p0
 *   BASE_URL=https://www.clausecheck.cc npm run test:e2e:beta-p0
 *   npm run test:e2e:beta-p0:local
 *
 * 默认打生产。本地用 localhost（勿用 127.0.0.1）：webServer 自动 `npm run dev`，
 * 串行 workers=1，就绪探测 /robots.txt。订阅用例 page.route mock，不写 waitlist。
 *
 * 路径说明：项目 Playwright testDir 为 ./e2e（非 tests/e2e）。
 */
import { test, expect } from "@playwright/test";
import { getQuotaForPlan } from "../lib/pricing.config";
import {
  gotoBeta,
  mockBetaSubscribeOk,
  newBetaContext,
  submitBetaHero,
  tempBetaEmail,
} from "./helpers/beta";

test.describe("Beta P0 回归（PR #9–#14）", () => {
  // ─── 1. 权益免责声明可见性（中英文）— PR #9 检查项 #6 / 文案 ───
  test("1. zh/en 权益免责声明可见", async ({ browser, baseURL }) => {
    const zh = await newBetaContext(browser, "zh", baseURL);
    await expect(zh.page.locator(".beta-perks-disclaimer")).toContainText(
      "正式版发布时由运营统一人工发放"
    );
    await zh.context.close();

    const en = await newBetaContext(browser, "en", baseURL);
    // localePrefix: as-needed — 英文默认 /beta（/en/beta 会 307）
    await expect(en.page.locator(".beta-perks-disclaimer")).toContainText(
      "credited manually when the official product launches"
    );
    await en.context.close();
  });

  // ─── 2. 语言切换 i18n + 无障碍 — PR #9 #2 / PR #10 / PR #14 ───
  test("2. 语言切换走 i18n，落地英文 /beta", async ({ page, baseURL }) => {
    await gotoBeta(page, "zh", { baseURL });

    const lang = page.locator("a.beta-lang-switch");
    await expect(lang).toHaveText("EN");
    const aria = (await lang.getAttribute("aria-label")) ?? "";
    expect(
      aria.includes("切换到英文") || aria.includes("Switch to English")
    ).toBe(true);

    await Promise.all([
      page.waitForURL((url) => {
        const p = url.pathname.replace(/\/$/, "");
        return p === "/beta" || p === "/en/beta";
      }),
      lang.click(),
    ]);

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/beta\/?$/);
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe("/beta");

    await expect(page.locator("a.beta-lang-switch")).toHaveText("中文");
  });

  // ─── 3. 订阅成功双 CTA — PR #9 #4 文案/交互 ───
  test("3. 订阅成功双 CTA：注册链接 + 关闭", async ({ page, baseURL }) => {
    await mockBetaSubscribeOk(page);
    await gotoBeta(page, "zh", { baseURL });

    await submitBetaHero(page, tempBetaEmail("cta"));

    const done = page.locator(".beta-subscribe--hero.beta-subscribe-done");
    await expect(done).toBeVisible();
    await expect(done.locator(".beta-subscribe-banner.is-ok")).toBeVisible();

    const primary = done.locator("a.beta-subscribe-btn");
    await expect(primary).toHaveText("立即注册体验");
    // zh 下 as-needed 前缀为 /zh/account；英文无前缀见用例 6
    await expect(primary).toHaveAttribute("href", "/zh/account");

    const dismiss = done.getByRole("button", { name: /知道了/ });
    await expect(dismiss).toBeVisible();
    await dismiss.click();

    await expect(
      page.locator(".beta-subscribe--hero.beta-subscribe-done")
    ).toHaveCount(0);
    await expect(page.locator("form.beta-subscribe--hero")).toBeVisible();
  });

  // ─── 4. 体验产品配额提示动态渲染 — PR #9 #3 ───
  test("4. 体验提示数字来自 getQuotaForPlan(trial)", async ({
    page,
    baseURL,
  }) => {
    const expected = getQuotaForPlan("trial");
    await gotoBeta(page, "zh", { baseURL });

    const hint = page.locator(".beta-nav-try-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toHaveText(/含\s*\d+\s*次免费扫描额度/);

    const text = (await hint.textContent()) ?? "";
    const match = text.match(/含\s*(\d+)\s*次免费扫描额度/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(expected);
  });

  // ─── 5. 移动端布局防溢出 — PR #9 #5 / PR #11 / PR #14 ───
  test("5. iPhone SE 下 hint 与页面无水平溢出", async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoBeta(page, "zh", { baseURL });

    const metrics = await page.evaluate(() => {
      const hint = document.querySelector(".beta-nav-try-hint");
      const doc = document.documentElement;
      return {
        hintOk: hint ? hint.scrollWidth <= hint.clientWidth : false,
        hintScroll: hint?.scrollWidth ?? null,
        hintClient: hint?.clientWidth ?? null,
        bodyOk: doc.scrollWidth <= 375,
        docScroll: doc.scrollWidth,
      };
    });

    expect(metrics.hintOk, JSON.stringify(metrics)).toBe(true);
    expect(metrics.bodyOk, JSON.stringify(metrics)).toBe(true);
  });

  // ─── 6. Account CTA 无重定向 — PR #9 #4 ───
  test("6. 英文成功 CTA 直达 /account（200，非经 /en/account 307）", async ({
    page,
    baseURL,
  }) => {
    await mockBetaSubscribeOk(page);
    await gotoBeta(page, "en", { baseURL });
    await expect(page.locator("a.beta-lang-switch")).toHaveText("中文");

    await submitBetaHero(page, tempBetaEmail("account"));

    const done = page.locator(".beta-subscribe--hero.beta-subscribe-done");
    await expect(done).toBeVisible();

    const primary = done.locator("a.beta-subscribe-btn");
    await expect(primary).toHaveText("Sign Up to Try Now");
    await expect(primary).toHaveAttribute("href", "/account");

    const accountHits: {
      url: string;
      status: number;
      redirectedFrom: string | null;
    }[] = [];
    page.on("response", (res) => {
      let pathname = "";
      try {
        pathname = new URL(res.url()).pathname.replace(/\/$/, "") || "/";
      } catch {
        return;
      }
      if (pathname === "/account" || pathname === "/en/account") {
        accountHits.push({
          url: res.url(),
          status: res.status(),
          redirectedFrom: res.request().redirectedFrom()?.url() ?? null,
        });
      }
    });

    await Promise.all([
      page.waitForURL(
        (url) => (url.pathname.replace(/\/$/, "") || "/") === "/account"
      ),
      primary.click(),
    ]);

    await expect(page).toHaveURL(/\/account\/?$/);
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe("/account");

    const accountOk = accountHits.find(
      (h) =>
        (new URL(h.url).pathname.replace(/\/$/, "") || "/") === "/account" &&
        h.status === 200
    );
    expect(
      accountOk,
      `expected /account 200; hits=${JSON.stringify(accountHits)}`
    ).toBeTruthy();

    const viaEnPrefix = accountHits.some(
      (h) =>
        (new URL(h.url).pathname.replace(/\/$/, "") || "/") === "/en/account" &&
        h.status === 307
    );
    expect(viaEnPrefix, "CTA must not hop via /en/account 307").toBe(false);
  });
});
