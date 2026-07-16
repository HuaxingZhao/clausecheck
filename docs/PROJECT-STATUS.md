# ClauseCheck — 项目状态快照（2026-07-17）

> 新开 Cursor 对话时：仓库已 commit 到 `main`，`.cursor/rules/clausecheck.mdc` 会自动加载；也可 `@clausecheck` / `@clausecheck-project` 或阅读本文件。  
> **配额与定价以 `docs/PRICING_PLAN_A.md` + `lib/pricing.config.ts` 为准。**  
> **当前生产 SHA 以 `GET https://www.clausecheck.cc/api/health` → `version` 为准**（下表为巡检时记录，可能滞后）。  
> **专家附件：** `docs/EXPERT_BRIEF.md`  
> **发布冒烟：** `docs/deploy/smoke-test-release-checklist.md`

## 生产环境

| 项目 | 值 |
|------|-----|
| **主域名** | https://www.clausecheck.cc |
| **别名** | https://clausecheck.cc · Vercel preview `huaxingzhao-clausecheck.vercel.app` |
| **Support** | support@clausecheck.cc |
| **最近已知 prod tip** | `3469836` — #44 发布冒烟清单（2026-07-17 巡检；以 health 复核） |
| **状态** | Soft Beta 🟢 |

### 近期已合并（#19–#44 摘要）

Plan A 配额 · 安全收口 · mock-qr 关闭 · 微信 UI 门控 / 人民币咨询（#31/#43）· 导出 AI 免责（#32）· 合同硬删 Cron（#33）· 合规 i18n（#34）· 专家包（#35）· **CNY Pro 预付 + Stripe WeChat（#38）** · 季/半年付（#39）· 预付到期提醒（#40）· 结账订单摘要（#41）· 结账加载加速（#42）· 人民币 CTA 挂回（#43）· 发布冒烟清单（#44）。

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

## Vercel Production 环境变量（2026-07-17 核查）

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
| `CRON_SECRET` | ✅ 已配（Production + Preview；Sensitive，CLI pull 不可读） |
| `WECHAT_PAY_ENABLED` | ⬜ **未设**（正确：独立微信 topup 关闭） |
| `WECHAT_PAY_QR_BASE` | ⬜ **未设**（正确：无独立收银） |
| `ALLOW_MOCK_WECHAT_PAY` | ⬜ **未设**（正确：生产 mock 关） |
| `REDIS_URL` | ⬜ 可选；health `not_configured` |

### Cron（`vercel.json`）

| 路径 | 调度 (UTC) | 无鉴权探测 |
|------|------------|------------|
| `/api/cron/purge-contract-data` | `0 * * * *`（每小时） | **401** Unauthorized ✅ |
| `/api/cron/pro-renewal-reminders` | `0 1 * * *`（每日 01:00） | **401** Unauthorized ✅ |

Vercel 定时任务会在请求中注入 `Authorization: Bearer $CRON_SECRET`。手动抽查见 `docs/deploy/ops-cron-verify.md`。

### Supabase Edge Secrets（短信，非 Vercel）

| 变量 | 状态 |
|------|------|
| `ALIYUN_SMS_SIGN_NAME` | ✅ `恒创联众` |
| `ALIYUN_SMS_TEMPLATE_CODE` | ✅ `100001` |
| `SEND_SMS_HOOK_SECRET` / Aliyun AK / Twilio | ✅ |

---

## 支付（中国转化）

| 通道 | 状态 |
|------|------|
| **Stripe（主路径）** | ✅ USD 订阅；CNY Pro **预付** PI（可出微信/卡等 Payment Element） |
| **人民币咨询 CTA** | ✅ CNY 下显示；无独立微信按钮（#43） |
| **独立微信 topup** `/api/credits/topup` | ⏸ API 保留；待商户 `WECHAT_PAY_QR_BASE` — 启用包见 `docs/WECHAT_PAY_ENABLEMENT.md` + `docs/deploy/wechat-merchant-founder-actions.md` |

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

## 2026-07-17 自动化冒烟签字（代理执行）

| 检查 | 结果 |
|------|------|
| Health `status:ok` · tip `3469836` | ✅ |
| mock-qr → **404** | ✅ |
| Cron 无 Bearer → **401**（两路） | ✅ |
| `test:e2e:beta-p0`（生产） | ✅ 6/6（已对齐 perkNote 文案） |
| `test:smoke`（生产） | ✅ 8 passed · 4 skipped（需 session） |
| 免责声明单测 Word/邮件 | ✅ |
| 生产 CNY 定价：人民币咨询 CTA 可见、无独立微信按钮 | ✅ 浏览器核实 |
| 全链路手测（注册→扫描→导出） | ⬜ 需真人账号（见冒烟清单 TC-1–5） |
| Cron 带 Bearer 正向调用 | ⬜ Sensitive 密钥 CLI 不可 pull；按 `ops-cron-verify.md` 在 Dashboard 抽查 |

---

## 相关文档

| 文档 | 用途 |
|------|------|
| `docs/EXPERT_BRIEF.md` | **发给专家的主附件** |
| `docs/deploy/smoke-test-release-checklist.md` | **发布前全链路冒烟清单** |
| `docs/deploy/ops-cron-verify.md` | Cron 密钥 / 两路任务抽查 |
| `docs/deploy/wechat-merchant-founder-actions.md` | 微信商户创始人行动清单 |
| `docs/WECHAT_PAY_ENABLEMENT.md` | 微信收银启用技术步骤 |
| `docs/PRIVACY_DATA_RETENTION_AUDIT.md` | 隐私实现审计 |
| `docs/I18N_COMPLIANCE_DIFF_REPORT.md` | 合规文案差异 |
| `docs/PRICING_PLAN_A.md` | 定价 |
| `docs/ALIYUN_SMS_HOOK.md` | +86 短信 |
| `.cursor/skills/clausecheck-project/PROGRESS.md` | 交付日志 |
