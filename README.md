# ClauseCheck — AI 合同风险扫描

上传 PDF / DOCX 合同，AI 逐条分析风险条款，3 分钟出报告。

## 快速开始

```bash
npm install
cp env.example .env.local
# 编辑 .env.local 填入 OPENAI_API_KEY（可选，不填则用 demo 数据）
npm run dev
# → http://localhost:3000
```

本地开发可不配置 `DATABASE_URL`，数据会写入 `data/` 目录下的 JSON 文件。

**生产部署**：见 [docs/DEPLOY.md](docs/DEPLOY.md)

```bash
npm run deploy:prep    # 部署前检查
npm run db:check       # DATABASE_URL 连通 + 建表
npm run deploy:env     # 推 env 到 Vercel（需 vercel link）
```

### 自动验证

```bash
npm run verify:p0          # 无 dev server 时自动启动，结束后自动关闭
npm run verify:staging     # 上线前 env 检查（BASE_URL=... 可测远端）
```

## 生产部署清单 (Vercel)

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API |
| `DATABASE_URL` | **必填** — Neon / Supabase / Vercel Postgres |
| `AUTH_SECRET` | **必填** — `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe 密钥 |
| `STRIPE_WEBHOOK_SECRET` | **必填** — Stripe Dashboard → Webhooks |
| `NEXT_PUBLIC_URL` | 生产域名，如 `https://clausecheck.app` |

### Vercel 计划

扫描 API 设置了 `maxDuration = 90`（`/api/scan`）和 `60`（`/api/scan/refine`、`/api/extract`），需要 **Vercel Pro**（Hobby 上限 10s）。

### Stripe Webhook

在 Stripe Dashboard 添加 endpoint：`https://your-domain/api/webhooks/stripe`

监听事件：
- `checkout.session.completed`
- `customer.subscription.created` / `updated` / `deleted`

### 数据库

首次部署时 `ensureSchema()` 会自动建表。也可手动执行 `lib/db/schema.sql`。

## 架构要点

- **服务端 tier / 配额**：`/api/scan` 不信任客户端 header；`GET /api/quota` 同步 UI
- **按次付费**：Stripe checkout → `pay_per_use_credits` → 扫描消耗
- **免费额度**：3 天试用 + 每月 3 次（`scan_quota` 表）
- **埋点**：`lib/analytics.ts` → `POST /api/events`（`analytics_events` 表）
- **PDF**：行动摘要 → 时间条款 → flags → 补充详情（与网页报告一致）
- **移动端审阅**：小屏原文/建议 Tab 切换，桌面保持左右分栏 82vh

## License

MIT
