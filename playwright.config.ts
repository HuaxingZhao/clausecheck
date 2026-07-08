import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL?.replace(/\/$/, "") ?? "https://www.clausecheck.cc";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL,
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
    },
  ],
});
