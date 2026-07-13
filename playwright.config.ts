import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "https://www.clausecheck.cc";

function isLocalBaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const localTarget = isLocalBaseUrl(baseURL);

/** 静态资源探测：避免等首页编译或 /api/health（Neon+OpenAI） */
function localReadyUrl(url: string): string {
  return `${url.replace(/\/$/, "")}/robots.txt`;
}

export default defineConfig({
  testDir: "./e2e",
  // 本地 cold compile 单测可能 >60s
  timeout: localTarget ? 120_000 : 60_000,
  expect: { timeout: localTarget ? 30_000 : 15_000 },
  // 本地串行：避免 6 worker 同时首次编译打爆 dev server / 自代理
  fullyParallel: !localTarget,
  workers: localTarget ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
  },
  // 仅本地 BASE_URL 时自动拉起 Next；生产/预览不启动
  ...(localTarget
    ? {
        webServer: {
          // 不要绑死 127.0.0.1：Next 内部会 proxy 到 localhost（::1）→ ECONNREFUSED
          command: "npm run dev",
          url: localReadyUrl(baseURL),
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      }
    : {}),
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: {
        // API 冒烟：强制 JSON，避免误拿 HTML
        extraHTTPHeaders: {
          Accept: "application/json",
        },
      },
    },
    {
      name: "beta-p0",
      testMatch: /beta-p0-regression\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // 浏览器页测：不要带 application/json Accept
        extraHTTPHeaders: {},
      },
    },
  ],
});
