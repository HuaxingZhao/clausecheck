# ClauseCheck — 项目状态快照（2026-07-15 更新产品叙事）

> 新开 Cursor 对话时：仓库已 commit 到 `main`，`.cursor/rules/clausecheck.mdc` 会自动加载；也可 `@clausecheck` / `@clausecheck-project` 或阅读本文件。  
> **配额与定价以 `docs/PRICING_PLAN_A.md` + `lib/pricing.config.ts` 为准**；下方历史部署 SHA 可能滞后于当前 production。

## 生产环境（已验证）

| 项目 | 值 |
|------|-----|
| **Git HEAD（历史快照）** | `1a28f12` — `feat: email/password auth and remove Apple sign-in` |
| **Vercel Production（历史）** | `dpl_F7JsHDepaYrbR4Sxebe888sU9sdo`（2026-07-07） |
| **状态** | Soft Beta 🟢 — 以 `GET /api/health` 的 `version` 为准 |

### 线上域名

- https://www.clausecheck.cc （主域名，推荐）
- https://clausecheck.cc
- https://huaxingzhao-clausecheck.vercel.app

### 最近 commit 时间线

```
1a28f12  邮箱密码登录 + 移除 Apple
3e49927  简化顶部导航 + 登录弹窗始终显示 Google
4069cf7  账户页 + Google/Apple OAuth（Apple 已在 1a28f12 移除）
dc75d4b  Magic link 修复（任意邮箱可发链接）
e446e04  P0 生产加固（服务端 quota、Postgres、Stripe webhook）
```

---

## 用户认证（当前）

### 登录方式

| 方式 | 状态 | 说明 |
|------|------|------|
| **邮箱 + 密码** | ✅ 已上线 | 登录 / 注册两个标签；密码 scrypt 存储，最少 8 位 |
| **Google OAuth** | ✅ 已配置 | Vercel 上 `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` 已设 |
| **Apple** | ❌ 已移除 | 按用户要求去掉（2026-07-07） |
| **Magic link 邮件** | 仅内部 | 团队邀请 `/api/team` 仍用；主登录 UI 不再展示 |

### 关键 API

| Route | 用途 |
|-------|------|
| `POST /api/auth/login` | 邮箱密码登录 → 设置 `cc_session` cookie |
| `POST /api/auth/register` | 注册（或给已有 Stripe/OAuth 用户补设密码） |
| `GET /api/auth/google` | Google OAuth 入口 |
| `GET /api/auth/google/callback` | Google 回调 |
| `GET /api/auth/me` | 当前用户 + tier |
| `GET /api/auth/providers` | `{ email: true, google: true }` |

### 关键文件

- `app/[locale]/components/auth-panel.tsx` — 登录弹窗（Google + 邮箱密码）
- `app/[locale]/components/site-nav.tsx` — 简化顶栏（语言 + 登录/账户）
- `app/[locale]/account/page.tsx` — 我的账户（额度、升级 Pro）
- `lib/auth/password.ts` — scrypt 哈希
- `lib/auth/session-response.ts` — 登录后写 cookie
- `lib/db/pg.ts` — `users.password_hash` 列（自动 migrate）

### 老用户（已付款但没密码）

用**注册**标签、**同一邮箱**（如 `zhaohxm0@gmail.com`）设置密码 → 保留原付费记录。

---

## UI / 导航（当前）

**顶栏**（`site-nav.tsx`）：Logo · 语言切换 · 登录/注册（或账户+退出）

**已移出顶栏**（改到页脚 footer）：怎么用 · 定价 · FAQ → `/{locale}#how` `#pricing` `#faq`

**用户流程**：

```
注册/登录（手机 OTP / Google / 邮箱密码）
  → 试用扫描（Plan A：每计费周期 1 份，最多约 20,000 字）
  → /account 查看额度、升级 Pro / 加油包
  → Pro：报告历史、深度分析、修订导出
```

---

## Vercel Production 环境变量（已知已配）

| 变量 | 状态 |
|------|------|
| `OPENAI_API_KEY` | ✅ |
| `DATABASE_URL` | ✅ Postgres |
| `AUTH_SECRET` | ✅ |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | ✅ |
| `RESEND_API_KEY` / `EMAIL_FROM` | ✅（登录邮件需**已验证域名**，勿长期用 `onboarding@resend.dev`） |
| `NEXT_PUBLIC_URL` | ✅ 应为生产域名 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅（`/api/auth/providers` 返回 `google: true`） |
| `APPLE_*` | 不需要（已移除 Apple 登录） |

### Google OAuth Redirect URI

```
https://huaxingzhao-clausecheck.vercel.app/api/auth/google/callback
```

（若主域名为 clausecheck.cc，Google Console 里也可加 `https://www.clausecheck.cc/api/auth/google/callback`）

---

## 验证命令

```bash
# 环境变量本地检查
npm run deploy:prep

# 对生产做 live 检查
BASE_URL=https://www.clausecheck.cc npm run verify:staging

# 完整 P0（注意：生产免费额度可能已耗尽，scan 项可能失败）
AUTO_START_SERVER=0 BASE_URL=https://www.clausecheck.cc npm run verify:p0
```

**2026-07-07 生产验证结果**：`verify:staging` 8/8；`verify:p0` 7/8（免费扫描额度用尽，非部署问题）。

---

## 产品后端要点（未变）

- 扫描 tier：**服务端权威**（`lib/server-quota.ts`），不信任客户端 `x-user-tier`
- Free / Trial（Plan A）：每计费周期 **1 份**文档审阅，体验字数上限约 **20,000**；Pro / 加油包走 Stripe Payment Element + `document_quota`
- 审阅区：**82vh 内滚**，左右分栏只读（无 TipTap 主流程）
- 18 场景 + `scenario-knowledge.ts` RAG
- 忘记密码：`/forgot-password` + magic token `purpose=password_reset`；重置后 `session_version` 吊销旧 JWT
- Neon 冷启动：`/api/health` 的 database latency 偶发数秒；忘记密码首请求可能偏慢，属托管侧而非应用死循环

---

## 已知问题 / 待办

1. **Resend 发件人**：生产须用已验证域名 `EMAIL_FROM`（勿长期用 `onboarding@resend.dev`）
2. **生产试用 scan 配额**：自动化测试可能触发额度用尽（Plan A 每周期 1 份）
3. **微信加油包**：未配 `WECHAT_PAY_QR_BASE` 时 topup 返回 503；主结账走 Stripe
4. **Stripe Live**：若仍用 test key，需切换 live + webhook
5. **Redis**：可选；未配时 health 为 `not_configured`
5. **路线图**：场景落地页、accept/reject 遥测、向量 RAG 法规库等（见 `reference.md` Future direction）

---

## 本地开发

```bash
cp env.example .env.local   # 填 OPENAI、AUTH_SECRET、DATABASE_URL 等
npm run dev                 # http://localhost:3000
npm run build
```

---

## 联系上下文

- 仓库：`HuaxingZhao/clausecheck`，分支 `main`
- 所有者邮箱：`zhaohxm0@gmail.com`（曾付款测试；可用注册补密码或 Google 登录）
- 用户偏好：中文沟通；仅在被要求时 commit；审阅区保留 82vh 内滚
