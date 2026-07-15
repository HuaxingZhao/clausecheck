# ClauseCheck — 项目状态快照（2026-07-15）

> 新开 Cursor 对话时：仓库已 commit 到 `main`，`.cursor/rules/clausecheck.mdc` 会自动加载；也可 `@clausecheck` / `@clausecheck-project` 或阅读本文件。  
> **配额与定价以 `docs/PRICING_PLAN_A.md` + `lib/pricing.config.ts` 为准。**  
> **当前生产 SHA 以 `GET https://www.clausecheck.cc/api/health` → `version` 为准**（下表为巡检时记录，可能滞后）。

## 生产环境

| 项目 | 值 |
|------|-----|
| **主域名** | https://www.clausecheck.cc |
| **别名** | https://clausecheck.cc · Vercel preview `huaxingzhao-clausecheck.vercel.app` |
| **Support** | support@clausecheck.cc |
| **最近已知 prod tip** | `12111a0` — #28 bounty i18n / copy drift（以 health `version` 复核） |
| **状态** | Soft Beta 🟢 |

### 近期已合并（#19–#28）

Plan A 客户端配额 · forgot-password · mock-qr 生产关闭 · `session_version` / magic `purpose` · 20k 字数 · credits session 四态 · bounty zh/en · 文案去 Google / credits 用词。

---

## 用户认证（当前）

| 方式 | 状态 | 说明 |
|------|------|------|
| **邮箱 + 密码** | ✅ | 登录 / 注册；scrypt；忘记密码 `/forgot-password` |
| **Google OAuth** | ✅ | `GOOGLE_CLIENT_*` |
| **Phone OTP** | ✅ | Supabase；+86 Aliyun / 其他 Twilio |
| **Apple** | ❌ 已移除 | — |
| **Magic link** | 仅内部 | 团队邀请 |

### Google OAuth Redirect URI（生产）

```
https://www.clausecheck.cc/api/auth/google/callback
```

（Vercel 预览域名如需单独回调，再在 Google Console 追加。）

---

## UI / 导航

**顶栏**：Logo · 语言切换 · 登录/注册（或账户+退出）  
**页脚**：怎么用 · 定价 · FAQ · 隐私 · 协议 · 关于

```
注册/登录（手机 OTP / Google / 邮箱密码）
  → 试用扫描（Plan A：每计费周期 1 份，最多约 20,000 字）
  → /account 查看额度、升级 Pro / 加油包（Stripe）
  → Pro：报告历史、深度分析、修订导出
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
| `WECHAT_PAY_QR_BASE` | ⬜ 未配 → WeChat topup API **503**（主结账 Stripe） |
| `REDIS_URL` | ⬜ 可选；health `not_configured` |

---

## 产品后端要点

- 扫描 tier：**服务端权威**；不信任客户端 `x-user-tier`
- Free / Trial（Plan A）：每周期 **1 份**，体验字数约 **20,000**；Pro / 加油包走 Stripe + `document_quota`
- 审阅区：**82vh 内滚**，左右分栏只读（无 TipTap 主流程）
- 18 场景 + `scenario-knowledge.ts` RAG
- 忘记密码：magic token `purpose=password_reset`；重置 bump `session_version`
- 生产 mock-qr：**关闭**（除非 `ALLOW_MOCK_WECHAT_PAY=1`）
- Neon 冷启动：health DB latency 偶发数秒；忘记密码首请求可能偏慢

---

## 验证命令

```bash
npm run deploy:prep
BASE_URL=https://www.clausecheck.cc npm run test:smoke
curl -s https://www.clausecheck.cc/api/health | jq '.version,.checks'
```

---

## 已知问题 / 待办

1. 微信正式收银台：配置 `WECHAT_PAY_QR_BASE` 后才开放 topup（UI 已移除死代码，API 保留）
2. Redis：可选
3. TD-001：`/invite` + `/admin/users` 运营手测仍待勾（代码 `::uuid` 已清）
4. Product Hunt：稿件域名已对齐 `www.clausecheck.cc`；宣发节奏另排
