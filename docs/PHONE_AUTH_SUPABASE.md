# Supabase Phone Auth（全球手机号登录）

ClauseCheck 使用 **Supabase Auth Phone Provider** 发短信 OTP，验证成功后写入本地 `users` 表并签发现有 `cc_session` Cookie。

## Current status (2026-07-10)

### Done

- 手机 OTP 已接入 Supabase Auth Phone，并由应用 API send/verify 桥接到 `cc_session`；登录面板已有手机号 Tab。Neon migration 为 `20260715_phone_auth_and_audit_log.sql`，并记录 `audit_log`。
- 中国大陆 `+86` 已实测端到端可发码并登录：Supabase Send SMS Hook → `send-sms` Edge Function → 阿里云 PNVS `SendSmsVerifyCode`（系统签名/模板）。
- `send-sms` 已部署到项目 `hwtibqeugchlwbcxuduu`，使用 `--no-verify-jwt`。Aliyun `ALIYUN_*` secrets 在 +86 验证时已存在。
- Vercel 构建已通过将 `supabase/functions` 排除出 Next TypeScript 检查及 Deno 入口 `// @ts-nocheck` 修复；不要重新部署旧的 `6f1f402`。
- 登出会清除会话；手机号没有密码，因此再次登录需重新请求 OTP（预期行为）。

### Partial / ops notes

- 新加坡 `+65`：Edge Secrets 已配置 `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID`（Messaging Service `Clausecheck`，From `+16575665402`）。Twilio 侧已有向 `+65…` 的 **delivered** 记录；请在站点登录页再发一次 OTP 做端到端确认。
- Supabase Phone Provider 的 Test Phone Numbers（如 `8613918082120=123456`）会跳过真实短信与 Hook；测试真实投递前请清除该条目，或仅对该测试号使用固定 OTP。
- Dashboard 的 Send SMS Hook 必须启用并指向 `https://hwtibqeugchlwbcxuduu.supabase.co/functions/v1/send-sms`，且 Edge 的 `SEND_SMS_HOOK_SECRET` 必须与 Dashboard Hook Secret（`v1,whsec_...`）完全一致。

### Remaining ops checklist

- Vercel 必须为同一 Supabase 项目配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`。
- 若 Neon 尚未执行，运行 `20260715_phone_auth_and_audit_log.sql`。

**硬性约束：**

- 应用代码**只**调用 `supabase.auth.signInWithOtp` / `verifyOtp`
- **禁止**安装或调用 Twilio / 阿里云 / 腾讯云 / Vonage 等短信 SDK
- **禁止**自建 OTP 生成、校验、存储、限流逻辑
- **禁止**把短信供应商密钥暴露到前端
- **不做微信登录**

短信通道与模板全部在 **Supabase Dashboard** 配置。

---

## 1. Supabase 控制台 — Phone Provider

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目  
2. **Authentication → Providers → Phone** → **Enable**  
3. 在 Dashboard 绑定短信供应商（见下方路由策略）  
4. **Project Settings → API** 复制：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（**仅服务端 / Vercel 环境变量**，勿写入客户端包）

---

## 2. Dashboard 短信路由策略（不写进代码）

在 Supabase Phone / SMS 配置里按地区选择供应商（Dashboard-only）：

| 号码前缀 / 地区 | 主通道 | 备用 |
|-----------------|--------|------|
| `+86` 中国大陆 | **阿里云短信** | 腾讯云短信 |
| 其他国家/地区 | **Twilio** | Vonage |

说明：ClauseCheck 仓库**不**包含上述供应商的 SDK 或密钥；切换通道只改 Dashboard，无需发版。

---

## 3. 短信模板（i18n，在 Dashboard 配置）

变量名以 Supabase 模板文档为准（常见 `{{ .Code }}`）。

**中文（ZH）：**

```
【ClauseCheck】验证码{{ .Code }}，5分钟有效。本服务不构成法律意见。
```

**英文（EN）：**

```
【ClauseCheck】Your code is {{ .Code }}, valid for 5 min. Not legal advice.
```

若 Dashboard 仅支持单一模板，优先使用中文模板（含法律免责声明）；海外可再开第二套模板或按 locale 切换（仍在 Dashboard 完成）。

---

## 4. Vercel / 本地环境变量

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- `NEXT_PUBLIC_*`：构建时注入，改后必须 **Redeploy**
- `SUPABASE_SERVICE_ROLE_KEY`：仅 API 路由 / 服务端使用；**不要**加 `NEXT_PUBLIC_` 前缀

---

## 5. 数据库迁移

在 Neon SQL Editor 执行：

`supabase/migrations/20260715_phone_auth_and_audit_log.sql`

会增加：

- `users.phone_e164` / `phone_verified_at` / `supabase_user_id`
- `users.email` 可空（支持仅手机号账号）
- `public.audit_log`（认证 / 配额 / 支付事件，满足 GDPR / PIPL 审计预埋）

应用启动时 `ensurePhoneAuthSchema` 也会自动补列/表。

### audit_log 说明

表名：`public.audit_log`（动作前缀 `auth.*` / `quota.*` / `payment.*`，语义上等同 `auth.audit_log`）。

手机号相关写入：

| action | 时机 |
|--------|------|
| `auth.phone_send` | OTP 发送成功（meta 仅存脱敏手机号） |
| `auth.phone_verify` / `auth.register` | OTP 校验成功并建立本地会话 |
| `auth.login` / `auth.logout` | 邮箱登录 / 退出 |

手机号在日志中经 `maskPhone` 脱敏，不存完整号码。

---

## 6. 应用侧 API（仅 Supabase Auth）

| 路由 | 行为 |
|------|------|
| `POST /api/auth/phone/send` | `getSupabaseAnon().auth.signInWithOtp({ phone })` |
| `POST /api/auth/phone/verify` | `getSupabaseAnon().auth.verifyOtp({ phone, token, type: 'sms' })` → `upsertPhoneUser` → `cc_session` |

E.164 规范化使用 `libphonenumber-js`（仅格式校验，不发短信）。

---

## 7. 验收

1. 打开登录弹窗 → **手机号** Tab  
2. 选国家区号 → 发验证码 → 输入 OTP → 进入账户页  
3. Neon 检查：

```sql
SELECT id, phone_e164, email FROM users WHERE phone_e164 IS NOT NULL;
SELECT action, meta, created_at FROM audit_log ORDER BY created_at DESC LIMIT 10;
```

---

## 8. 架构说明

| 层 | 职责 |
|----|------|
| Supabase Auth Phone | 仅负责 SMS OTP（供应商在 Dashboard） |
| `users.phone_e164` | ClauseCheck 本地身份 |
| `cc_session` | 现有 JWT Cookie，业务鉴权不变 |
| `public.audit_log` | 登录 / 配额 / 支付事件 |

邮箱密码与 Google 登录保留；手机号可单独注册（邮箱可选）。

---

## 9. 中国大陆 +86（免企业资质）

Twilio 对中国大陆送达差。个人开发者可用 **阿里云号码认证 · 短信认证（系统赠送签名/模板）** + **Supabase Send SMS Hook**。

完整步骤与 Edge Function：

→ [docs/ALIYUN_SMS_HOOK.md](./ALIYUN_SMS_HOOK.md)  
→ 代码：`supabase/functions/send-sms/index.ts`

要点：OTP 仍由 Supabase 生成/校验；Hook 只负责投递；`+86` → 阿里云，其它 → Twilio（在 Hook 内分流）。
