import type { Page, BrowserContext } from "@playwright/test";

/** 临时邮箱：不落真实 waitlist（用例须配合 route mock） */
export function tempBetaEmail(tag: string): string {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${tag}-${stamp}@clausecheck.test`;
}

/** Mock POST /api/beta/subscribe，避免污染生产 beta_waitlist */
export async function mockBetaSubscribeOk(page: Page): Promise<void> {
  await page.route("**/api/beta/subscribe", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        alreadySubscribed: false,
        message: "subscribed",
      }),
    });
  });
}

/** 提交 hero 区订阅表单（假定已 mock API） */
export async function submitBetaHero(page: Page, email: string): Promise<void> {
  const form = page.locator("form.beta-subscribe--hero");
  await form.waitFor({ state: "visible" });

  // 等 React hydration，避免受控 input 被重置 / 原生 GET ?email=
  await page.waitForFunction(() => {
    const el = document.querySelector("form.beta-subscribe--hero");
    if (!el) return false;
    return Object.keys(el).some(
      (k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps")
    );
  });

  const input = form.locator('input[type="email"]');
  await input.fill(email);
  await input.blur();

  const post = page.waitForRequest(
    (req) =>
      req.method() === "POST" && req.url().includes("/api/beta/subscribe"),
    { timeout: 30_000 }
  );

  await form.locator("button.beta-subscribe-btn").click();
  await post;
}

/**
 * 打开 Beta 页并等关键节点出现（本地 cold compile 可能很慢）。
 * 预先写入 NEXT_LOCALE，避免 as-needed 下 /beta ↔ /zh/beta 重定向环。
 */
export async function gotoBeta(
  page: Page,
  locale: "zh" | "en",
  opts?: { baseURL?: string; timeoutMs?: number }
): Promise<void> {
  const timeout = opts?.timeoutMs ?? 120_000;
  const origin =
    opts?.baseURL?.replace(/\/$/, "") ||
    (page.url().startsWith("http") ? new URL(page.url()).origin : "") ||
    process.env.BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale,
      url: origin,
    },
  ]);

  const path = locale === "zh" ? "/zh/beta" : "/beta";
  await page.goto(path, { waitUntil: "domcontentloaded", timeout });
  await page
    .locator(".beta-nav-try-hint, a.beta-lang-switch, .beta-perks-disclaimer")
    .first()
    .waitFor({ state: "visible", timeout });
}

export async function newBetaContext(
  browser: import("@playwright/test").Browser,
  locale: "zh" | "en",
  baseURL: string | undefined
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: {},
    locale: locale === "zh" ? "zh-CN" : "en-US",
  });
  const page = await context.newPage();
  await gotoBeta(page, locale, { baseURL, timeoutMs: 120_000 });
  return { context, page };
}
