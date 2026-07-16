# ClauseCheck — 项目状态快照（2026-07-16）

> 新开 Cursor 对话时：仓库已 commit 到 `main`，`.cursor/rules/clausecheck.mdc` 会自动加载；也可 `@clausecheck` / `@clausecheck-project` 或阅读本文件。  
> **配额与定价以 `docs/PRICING_PLAN_A.md` + `lib/pricing.config.ts` 为准。**  
> **当前生产 SHA 以 `GET https://www.clausecheck.cc/api/health` → `version` 为准**（下表为巡检时记录，可能滞后）。  
> **专家附件：** `docs/EXPERT_BRIEF.md`

## 生产环境

| 项目 | 值 |
|------|-----|
| **主域名** | https://www.clausecheck.cc |
| **别名** | https://clausecheck.cc · Vercel preview `huaxingzhao-clausecheck.vercel.app` |
| **Support** | support@clausecheck.cc |
| **最近已知 prod tip** | `397a53d` — #35 专家附件包（以 health `version` 复核） |
| **状态** | Soft Beta 🟢 |

### 近期已合并（#19–#34）

Plan A 配额 · forgot-password · mock-qr 关闭 · session/magic purpose · 20k · credits session · bounty zh/en · 域名/`support@` · 微信 UI 门控 + 人民币咨询（#31）· 导出 AI 免责声明（#32）· 合同数据硬删 Cron（#33）· 合规 i18n（#34）。

---

## 用户认证（当前）

| 方式 | 状态 | 说明 |
|------|------|------|
| **邮箱 + 密码** | ✅ | 登录 / 注册；scrypt；忘记密码 `/forgot-password` |
| **Google OAuth** | ✅ | `GOOGLE_CLIENT_*` |
| **Phone OTP** | ✅ | Supabase Hook；+86 Aliyun（签名 **恒创联众** / 模板 **100001**）· 其他 Twilio |
| **Apple** | ❌ 已移除 | — |
| **Magic link** | 仅内部 | 团队邀请 |

### Google OAuth Redirect URI（生产）

```
https://www.clausecheck.cc/api/auth/google/callback
```

---

## UI / 导航

**顶栏**：Logo · 语言切换 · 登录/注册（或账户+退出）  
**页脚**：怎么用 · 定价 · FAQ · 隐私 · 协议 · 关于

```
注册/登录（手机 OTP / Google / 邮箱密码）
  → 试用扫描（Plan A：每计费周期 1 份，最多约 20,000 字）
  → /account 查看额度、升级 Pro / 加油包（Stripe）
  → Pro：报告历史（脱敏）、深度分析、修订导出（正文 ≤24h）
```

---

## Vercel Production 环境变量（已知已配）

| 变量 | 状态 |
|------|------|
| `OPENAI_API_KEY` | ✅ |
| `DATABASE_URL` | ✅ Postgres（Neon） |
| `AUTH_SECRET` | ✅ |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ |
| `PAYMENT_WEBHOOK_SECRET` | ✅（health `paymentWebhook: ok`） |
| `RESEND_API_KEY` / `EMAIL_FROM` | ✅ 已验证域名 |
| `NEXT_PUBLIC_URL` | ✅ `https://www.clausecheck.cc` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ |
| `CRON_SECRET` | ✅（`/api/cron/purge-contract-data`） |
| `WECHAT_PAY_ENABLED` | ⬜ 默认关；开入口须同时有 `QR_BASE`（见 `WECHAT_PAY_ENABLEMENT.md`） |
| `WECHAT_PAY_QR_BASE` | ⬜ 未配 → WeChat topup API **503**（主结账 Stripe） |
| `REDIS_URL` | ⬜ 可选；health `not_configured` |

### Supabase Edge Secrets（短信，非 Vercel）

| 变量 | 状态 |
|------|------|
| `ALIYUN_SMS_SIGN_NAME` | ✅ `恒创联众`（避开 8/31 历史赠送签名停用） |
| `ALIYUN_SMS_TEMPLATE_CODE` | ✅ `100001` |
| `SEND_SMS_HOOK_SECRET` / Aliyun AK / Twilio | ✅ |

---

## 产品后端要点

- 扫描 tier：**服务端权威**；不信任客户端 `x-user-tier`
- Free / Trial（Plan A）：每周期 **1 份**，体验字数约 **20,000**；Pro / 加油包走 Stripe + `document_quota`
- 审阅区：**82vh 内滚**，左右分栏只读（无 TipTap 主流程）
- 18 场景 + `scenario-knowledge.ts` RAG
- 忘记密码：magic token `purpose=password_reset`；重置 bump `session_version`
- 隐私：`sanitizeScanResultForPersistence`；Cron 硬删 revisions ≤24h；无软删除
- 导出：Word / 谈判邮件强制 `ai_disclaimer_export`

---

## 相关文档

| 文档 | 用途 |
|------|------|
| `docs/EXPERT_BRIEF.md` | **发给专家的主附件** |
| `docs/deploy/smoke-test-release-checklist.md` | **发布前全链路冒烟清单**（注册→扫描→导出→退出） |
| `docs/PRIVACY_DATA_RETENTION_AUDIT.md` | 隐私实现审计 |
| `docs/I18N_COMPLIANCE_DIFF_REPORT.md` | 合规文案差异 |
| `docs/PRICING_PLAN_A.md` | 定价 |
| `docs/ALIYUN_SMS_HOOK.md` | +86 短信 |
| `.cursor/skills/clausecheck-project/PROGRESS.md` | 交付日志 |
