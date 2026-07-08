# ClauseCheck 生产部署指南（Vercel + Neon Postgres）

按顺序完成，约 30–45 分钟。

---

## 0. 前置检查

本地已有（从你的 `.env.local`）：

- `OPENAI_API_KEY` ✅
- `AUTH_SECRET` ✅
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` ✅
- `RESEND_API_KEY` / `EMAIL_FROM` ✅（登录邮件）

还缺：

- `DATABASE_URL` — 下面第 1 步创建
- 生产 `NEXT_PUBLIC_URL` — 部署后第 4 步填写

运行准备脚本：

```bash
npm run deploy:prep
```

**P0 数据库迁移（必须先于代码部署）：** 见 [docs/DEPLOY_OPEN_ITEMS.md](./DEPLOY_OPEN_ITEMS.md) 与 [docs/CONSUME_CREDIT_MIGRATION.md](./CONSUME_CREDIT_MIGRATION.md)

```bash
# SQL 执行后验证（需 DATABASE_URL）
npm run db:verify-consume-credit
```

---

## 1. 创建 Postgres（推荐 Neon，免费 tier）

1. 打开 [https://neon.tech](https://neon.tech) → Sign up → **New Project**
2. Region 选离用户近的（如 `Singapore` 或 `US West`）
3. Dashboard → **Connection details** → 选 **Pooled connection**（serverless 必用 pooled）
4. 复制连接串，形如：

   ```
   postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

5. 写入本地：

   ```bash
   # .env.local 追加一行
   DATABASE_URL=postgresql://...
   ```

6. 验证 schema 可建（可选）：

   ```bash
   npm run db:check
   ```

首次生产请求时 `ensureSchema()` 也会自动建表；`db:check` 只是提前确认连接正常。

---

## 2. Vercel 项目

### 2a. 计划

扫描 API 需要 **90s** 超时 → 必须 **Vercel Pro**（Hobby 上限 10s）。

- [vercel.com/account/plans](https://vercel.com/account/plans) 升级 Pro，或
- 团队已有 Pro 席位

### 2b. 导入 GitHub

1. [vercel.com/new](https://vercel.com/new) → Import `HuaxingZhao/clausecheck`
2. Framework Preset：**Next.js**（自动识别）
3. **先不要点 Deploy** — 先配环境变量

### 2c. 环境变量（Production）

在 Vercel → Project → Settings → Environment Variables，添加：

| 变量 | 值来源 | 环境 |
|------|--------|------|
| `OPENAI_API_KEY` | `.env.local` | Production, Preview |
| `DATABASE_URL` | Neon pooled 连接串 | Production, Preview |
| `AUTH_SECRET` | `.env.local`（勿用默认值） | Production, Preview |
| `STRIPE_SECRET_KEY` | Stripe Dashboard（生产用 `sk_live_`，测试用 `sk_test_`） | Production |
| `STRIPE_WEBHOOK_SECRET` | 第 3 步创建 webhook 后填入 | Production |
| `NEXT_PUBLIC_URL` | 暂定 `https://你的项目.vercel.app`，自定义域名后改 | Production |
| `RESEND_API_KEY` | `.env.local` | **Production 必填**（登录邮件） |
| `EMAIL_FROM` | 已验证域名发件人 | Production |

**CLI 批量导入**（已登录 `vercel link` 后）：

```bash
npm run deploy:env
```

### 2d. 首次部署

```bash
git push origin main   # 确保 GitHub 最新
# Vercel Dashboard 点 Deploy，或：
vercel --prod
```

记下生产 URL，例如 `https://clausecheck-xxx.vercel.app`。

---

## 3. Stripe Webhook（生产）

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**
   - URL: `https://你的生产域名/api/webhooks/stripe`
   - 事件：
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. 创建后复制 **Signing secret** (`whsec_...`)
4. 填入 Vercel 环境变量 `STRIPE_WEBHOOK_SECRET` → **Redeploy**

测试模式可先部署到 Preview，用 `sk_test_` + 测试 webhook。

---

## 4. 更新生产 URL

部署成功后：

1. Vercel → Settings → Environment Variables
2. 把 `NEXT_PUBLIC_URL` 改为真实生产地址（含自定义域名）
3. **Redeploy**（环境变量变更需重新部署才生效）

自定义域名：Vercel → Domains → 添加域名 → 按提示配 DNS。

---

## 5. 部署后验证

```bash
# 替换为你的生产域名
export BASE_URL=https://clausecheck-xxx.vercel.app

npm run verify:staging
BASE_URL=$BASE_URL npm run verify:p0
```

手动走一遍：

- [ ] 上传合同 → 扫描 → 初版结果 → refine 完成
- [ ] 免费额度超额提示
- [ ] Stripe 测试卡 checkout（按次 / Pro）
- [ ] Magic link 登录邮件能收到（Resend 域名已验证）
- [ ] 报告 PDF 下载
- [ ] 合同审阅 + 导出邮件 / Word

---

## 6. 常见问题

### 扫描超时 / 504

- 确认 Vercel **Pro** 计划
- 确认 `vercel.json` 中 `maxDuration: 90` 已提交

### `DATABASE_URL is required in production`

- Vercel 未配置 `DATABASE_URL` 或未 Redeploy

### Webhook 400 Invalid signature

- `STRIPE_WEBHOOK_SECRET` 与 Stripe Dashboard 中该 endpoint 的 secret 不一致
- 测试/生产 webhook 混用

### Magic link 邮件发不出

- Resend 需验证发件域名
- `EMAIL_FROM` 必须使用已验证域名（**不能**长期用 `onboarding@resend.dev` — 该测试地址只能发到 Resend 注册邮箱）
- 检查 Resend Dashboard → Logs 是否有 rejected / bounced
- 若 API 返回 200 但收不到，优先改用 Google 登录（配置 OAuth 后）

### Google 登录

在 Vercel Production 配置：

| 变量 | 说明 |
|------|------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 |

**Redirect URI（必须完全一致）：**

- Google: `https://你的域名/api/auth/google/callback`

未配置 OAuth 时，登录弹窗仅显示邮箱密码登录。

### 登录后配额仍不对

- 确认 `AUTH_SECRET` 生产与本地不同且足够随机
- 确认 `DATABASE_URL` 指向 pooled 连接

---

## 7. 回滚

Vercel → Deployments → 上一版本 → **Promote to Production**
