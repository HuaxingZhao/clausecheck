# 国内 +86 短信：Supabase Send SMS Hook + 阿里云号码认证（免资质）

不迁移数据库。OTP **仍由 Supabase Auth 生成与校验**；Edge Function 只负责把 `sms.otp` 发出去。

前端 / 业务 API **无需修改**，继续：

```ts
supabase.auth.signInWithOtp({ phone: '+86xxxxxxxxxx' })
// ClauseCheck: POST /api/auth/phone/send → getSupabaseAnon().auth.signInWithOtp
```

---

## 1. 阿里云侧操作（免企业短信签名）

> 用的是 **号码认证服务（PNVS）→ 短信认证**，不是「短信服务 SMS」里自己申请签名那条线。

### 1.1 开通

1. 登录 [阿里云控制台](https://www.aliyun.com/)（个人实名即可）
2. 搜索并进入 **号码认证服务**
3. 开通 **短信认证** / 短信认证服务（按控制台引导开通计费）

参考：[个人开发者免资质接入](https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers)

### 1.2 取赠送签名与模板

1. 号码认证控制台 → **短信认证服务** → **短信认证参数管理**（或「赠送签名/模板配置」）
2. **签名配置 → 赠送签名**：任选一条，记下 **签名名称**  
   - 示例（以控制台实际列表为准）：`速通互联验证码`、`恒创联众` 等
3. **模板配置 → 赠送模板**：选 **登录/注册**  
   - 常见 Code：`100001`（以控制台为准）  
   - 其它：`100002` 改绑、`100003` 重置密码等

**必须：赠送签名 + 赠送模板成对使用。**

### 1.3 AccessKey

1. 右上角头像 → **AccessKey 管理**
2. 建议创建 **RAM 子用户**，只授 `dypns:SendSmsVerifyCode`（或号码认证相关权限）
3. 记下：
   - `AccessKey ID`
   - `AccessKey Secret`（只显示一次）

### 1.4 用 OpenAPI 试发（可选）

控制台「API 调试」或 [SendSmsVerifyCode](https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode)：

| 参数 | 值 |
|------|-----|
| PhoneNumber | 11 位国内号（不要加 +86） |
| SignName | 赠送签名名称 |
| TemplateCode | 如 `100001` |
| TemplateParam | `{"code":"123456","min":"5"}` |

能收到短信再继续配 Supabase。

---

## 2. Edge Function 代码

仓库路径：

`supabase/functions/send-sms/index.ts`

行为：

1. 用 `SEND_SMS_HOOK_SECRET` 校验 Standard Webhooks 签名  
2. 读取 `user.phone` + `sms.otp`（Supabase 生成）  
3. **+86** → 阿里云 `SendSmsVerifyCode`（`TemplateParam.code = otp`，**不**走阿里云核验接口）  
4. **非 +86** → Twilio（可选，见下）  
5. 成功返回 `200` + `{}`

---

## 3. 环境变量 / Secrets

在 **Supabase Dashboard → Edge Functions → Secrets**（或 CLI `supabase secrets set`）配置：

| 变量 | 说明 |
|------|------|
| `SEND_SMS_HOOK_SECRET` | Auth Hook 生成的 secret，格式 `v1,whsec_...`（整段粘贴） |
| `ALIYUN_ACCESS_KEY_ID` | RAM / 主账号 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | AccessKey Secret |
| `ALIYUN_SMS_SIGN_NAME` | 赠送签名名称（控制台原文） |
| `ALIYUN_SMS_TEMPLATE_CODE` | 赠送模板 Code，登录建议 `100001` |

非 +86 回退 Twilio（**启用 Send SMS Hook 后，默认 Twilio Provider 不再发信**，必须在 Hook 里自己发）：

| 变量 | 说明 |
|------|------|
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | Auth Token |
| `TWILIO_MESSAGING_SERVICE_SID` | `MG...`（优先） |
| `TWILIO_FROM_NUMBER` | 或单个 From 号码 |

本地 `.env` 示例（仅本地 `supabase functions serve` 用，勿提交）：

```bash
SEND_SMS_HOOK_SECRET=v1,whsec_xxxxxxxx
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=速通互联验证码
ALIYUN_SMS_TEMPLATE_CODE=100001
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
```

> 你任务里写的 `SUPABASE_SMS_HOOK_SECRET` 与官方文档常用名 `SEND_SMS_HOOK_SECRET` 等价；本仓库 Edge Function 使用 **`SEND_SMS_HOOK_SECRET`**。

Vercel **不需要**阿里云密钥（发信在 Supabase Edge Function）。Vercel 仍只需：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 4. 部署 Edge Function

```bash
# 登录并关联项目（Project Ref = hwtibqeugchlwbcxuduu）
npx supabase login
npx supabase link --project-ref hwtibqeugchlwbcxuduu

# 写入 secrets
npx supabase secrets set \
  SEND_SMS_HOOK_SECRET="v1,whsec_你的secret" \
  ALIYUN_ACCESS_KEY_ID="..." \
  ALIYUN_ACCESS_KEY_SECRET="..." \
  ALIYUN_SMS_SIGN_NAME="速通互联验证码" \
  ALIYUN_SMS_TEMPLATE_CODE="100001" \
  TWILIO_ACCOUNT_SID="AC..." \
  TWILIO_AUTH_TOKEN="..." \
  TWILIO_MESSAGING_SERVICE_SID="MG..."

# 部署（Hook 调用不要校验用户 JWT）
npx supabase functions deploy send-sms --no-verify-jwt
```

部署后 URL：

```text
https://hwtibqeugchlwbcxuduu.supabase.co/functions/v1/send-sms
```

---

## 5. Supabase Dashboard 配置

### 5.1 Phone Provider（保持开启）

**Authentication → Sign In / Providers → Phone**

- Enable Phone = ON  
- SMS provider 可仍选 Twilio（作「未开 Hook 时的默认」；**一旦启用 Send SMS Hook，实际发送以 Hook 为准**）  
- OTP Length = 6，Expiry 建议 300  

### 5.2 Send SMS Hook

1. **Authentication → Hooks**（Auth Hooks）  
2. **Add a new hook** → 选 **Send SMS**  
3. Hook type：**HTTPS**  
4. URL：

```text
https://hwtibqeugchlwbcxuduu.supabase.co/functions/v1/send-sms
```

5. 生成并复制 **Hook Secret**（`v1,whsec_...`）  
6. 把同一串设进 Edge Secret：`SEND_SMS_HOOK_SECRET`  
7. Enable → Save  

### 5.3 与 Twilio 共存

| 号码 | 谁发 |
|------|------|
| `+86...` | Edge Function → 阿里云 |
| 其它 | Edge Function → Twilio（需配 TWILIO_* secrets） |

**不要**指望「Hook 只拦 +86、其它自动走 Dashboard Twilio」——官方 Send SMS Hook 是**整段替换**发送通道。分流必须写在 `send-sms` 里（本仓库已实现）。

---

## 6. 前端确认（无需改）

ClauseCheck 现有路径：

`app/api/auth/phone/send` → `getSupabaseAnon().auth.signInWithOtp({ phone })`  
`app/api/auth/phone/verify` → `verifyOtp({ phone, token, type: 'sms' })`

不生成 OTP、不调阿里云、不暴露密钥。

---

## 7. 验收

1. 用真实 `+86` 点发送验证码  
2. Supabase → Edge Functions → `send-sms` → Logs 无 401/500  
3. 手机收到预置签名短信  
4. 输入验证码可登录；Neon `users.phone_e164` 有值  

失败时看：

- Hook 401 → secret 不一致或未 `replace` 正确  
- Aliyun `FUNCTION_NOT_OPENED` → 未开通短信认证  
- Aliyun 签名/模板错误 → 必须用**赠送**签名+模板对  
- 非 +86 失败 → 检查 TWILIO_* secrets  

---

## 8. 安全约束核对

| 约束 | 状态 |
|------|------|
| 不改前端登录逻辑 | ✅ |
| 不硬编码密钥 | ✅ 全走 Secrets |
| 不自建 OTP 生成/校验 | ✅ 仅转发 `sms.otp`；校验仍 `verifyOtp` |
| 不装业务侧阿里云 SDK | ✅ Edge 内用 OpenAPI HMAC，无 npm SDK |
