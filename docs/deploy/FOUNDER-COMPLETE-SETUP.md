# ClauseCheck — 创始人完整配置与验收手册（一步一步）

> **目标：** 按顺序做完，系统配置齐、可签字上线/软测。  
> **生产：** https://www.clausecheck.cc  
> **Support：** support@clausecheck.cc  
> **密钥规则：** 只放在 Vercel / 密码管理器；**永远不要**贴进聊天或提交 Git。

每完成一步，在 ☐ 打勾。预计总耗时：环境配置 1–2 小时 + 手测 40 分钟 + 微信 KYC（数天～数周，可并行）。

---

## 总览（按顺序）

| 阶段 | 内容 | 是否挡现有产品 |
|------|------|----------------|
| A | 生产健康检查 | 否（先确认现状） |
| B | Vercel 环境变量核对 / 补齐 | 缺则影响对应功能 |
| C | 双区域 AI（千问 / DeepSeek） | **只影响新接口**；旧扫描仍用 OpenAI |
| D | Cron 密钥正向抽查 | 影响硬删 / 续费邮件 |
| E | 全链路手测 TC-1～5 | 发布签字 |
| F | 冒烟清单其余项（可选但建议） | 质量 |
| G | 微信商户 KYC → 收银页 → 开开关 | **可后做**；现网不依赖 |
| H | 收尾签字 | — |

---

## 阶段 A — 生产是否活着（5 分钟）

### A1. Health

1. 浏览器打开：https://www.clausecheck.cc/api/health  
2. 或终端：

```bash
curl -sS https://www.clausecheck.cc/api/health
```

3. **过线：** `"status":"ok"`，`checks.database.status` 与 `checks.openai.status` 为 `ok`。记下 `version`。

☐ A1 通过 · version：____________

### A2. Mock 支付已关

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://www.clausecheck.cc/api/webhooks/payment/mock-qr
```

**过线：** `404`（不是 200 收银台页）。

☐ A2 通过

---

## 阶段 B — Vercel 环境变量核对（15–30 分钟）

打开：Vercel → 你的 ClauseCheck 项目 → **Settings → Environment Variables**（Production）。

### B1. 已应存在（逐个点开确认「有值」，Reveal 只看是否非空，**不要截图外传**）

| 变量 | ☐ |
|------|---|
| `OPENAI_API_KEY` | ☐ |
| `DATABASE_URL` | ☐ |
| `AUTH_SECRET` | ☐ |
| `STRIPE_SECRET_KEY` | ☐ |
| `STRIPE_WEBHOOK_SECRET` | ☐ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ☐ |
| `PAYMENT_WEBHOOK_SECRET` | ☐ |
| `RESEND_API_KEY` | ☐ |
| `EMAIL_FROM` | ☐ |
| `NEXT_PUBLIC_URL` = `https://www.clausecheck.cc` | ☐ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ☐ |
| `CRON_SECRET` | ☐ |

缺哪个 → 从密码管理器 / 对应控制台补上 → **Save → Redeploy Production**。

### B2. 确认「故意不配」的项（现在保持空）

| 变量 | 正确状态 |
|------|----------|
| `WECHAT_PAY_ENABLED` | **不要设** 或非 `true` |
| `WECHAT_PAY_QR_BASE` | **不要设**（没收银页前） |
| `ALLOW_MOCK_WECHAT_PAY` | **不要设** |
| `FORCE_AI_REGION` | 生产 **不要设**（仅本地调试） |

☐ B1/B2 核对完毕

### B3. Supabase Edge（短信，非 Vercel）

Supabase 项目 → Edge Functions → Secrets：

| 变量 | 预期 |
|------|------|
| `ALIYUN_SMS_SIGN_NAME` | `恒创联众` |
| `ALIYUN_SMS_TEMPLATE_CODE` | `100001` |
| Aliyun AK / Twilio / Hook secret | 已有 |

☐ B3 核对完毕

---

## 阶段 C — 双区域 AI 配齐（要「都设置好」就做完）

> 主站扫描 `/api/scan` 只用 `OPENAI_API_KEY`（你已有）。  
> 下列 Key 用于 **`POST /api/contract/review`**（CN=千问，降级 DeepSeek）。

### C1. 申请通义千问 Key

1. 打开 [阿里云百炼控制台](https://bailian.console.aliyun.com/)  
2. 开通 **Model Studio / 兼容 OpenAI 模式**（DashScope compatible）  
3. 创建 **API-KEY**  
4. Vercel → Add → Name：`QWEN_API_KEY` → Value：粘贴 → Environments 勾 **Production + Preview** → Save  

（也可用变量名 `DASHSCOPE_API_KEY`，二选一即可。）

☐ C1 完成

### C2. 申请 DeepSeek Key（CN 降级，建议必配）

1. 打开 https://platform.deepseek.com/api_keys  
2. 创建 Key  
3. Vercel → `DEEPSEEK_API_KEY` → Production + Preview → Save  

☐ C2 完成

### C3. 确认 OpenAI（GLOBAL，你应已有）

1. 若失效：https://platform.openai.com/api-keys 重建 → 更新 Vercel `OPENAI_API_KEY`  

☐ C3 完成

### C4. Redeploy

Vercel → Deployments → 最新 Production → **Redeploy**（或 push 触发一次）。等部署绿。

☐ C4 完成

### C5. 验证双模型（本地或 Preview）

**不要把 Key 发给别人。** 在你本机：

```bash
# 测 GLOBAL（OpenAI）— 可在 Preview URL 或本地加 FORCE
curl -sS -N -X POST "https://www.clausecheck.cc/api/contract/review" \
  -H "Content-Type: application/json" \
  -H "X-User-Region: GLOBAL" \
  -d '{"contract":"This Agreement shall auto-renew for one year unless notice.","lang":"en"}' \
  -D - | head -40
# 期望：HTTP 200；响应头含 X-AI-Region: GLOBAL；body 有 data: {...} SSE
```

```bash
curl -sS -N -X POST "https://www.clausecheck.cc/api/contract/review" \
  -H "Content-Type: application/json" \
  -H "X-User-Region: CN" \
  -d '{"contract":"本合同到期后自动续约一年，除非提前书面通知。","lang":"zh"}' \
  -D - | head -40
# 期望：X-AI-Region: CN；有 ReviewChunk
```

若 CN 失败：检查百炼是否开通兼容模式、Key 是否贴对、是否已 Redeploy。

☐ C5 GLOBAL 通过 · ☐ C5 CN 通过

### C6.（可选）本地强制区域

项目根 `.env.local`（勿提交）：

```bash
FORCE_AI_REGION=CN
# 或 GLOBAL
```

重启 `npm run dev` 后再测。

☐ C6 跳过或完成

---

## 阶段 D — Cron 密钥正向抽查（5 分钟）

详见 `docs/deploy/ops-cron-verify.md`。

1. Vercel → Env → `CRON_SECRET` → **Reveal**  
2. 若曾在聊天泄露过：生成新随机串 → 覆盖保存 → Redeploy → 再用新值  
3. 本机：

```bash
export CRON_SECRET='从Dashboard粘贴'
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://www.clausecheck.cc/api/cron/purge-contract-data
# 期望：不是 Unauthorized，含 ok 类字段

curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://www.clausecheck.cc/api/cron/pro-renewal-reminders
# 期望：成功 JSON（sent 可为 0）

unset CRON_SECRET
```

4. Vercel Cron / 函数日志确认定时任务曾 **200**。

☐ D 通过

---

## 阶段 E — 全链路手测 TC-1～5（30–40 分钟）

对照全文：`docs/deploy/smoke-test-release-checklist.md`。  
免责原文以仓库 `messages/zh.json` / `en.json` 的 `ai_disclaimer_export` **逐字**为准。

### E0. 准备

- 无痕窗口打开 https://www.clausecheck.cc/zh  
- **全新邮箱**（没用过的）  
- 短合同或点「试用示例合同」  

☐ E0 准备好

### E1. TC-1 注册登录

1. 点「登录 / 注册」→ 邮箱+密码注册（完成验证若有）  
2. 打开 https://www.clausecheck.cc/zh/account  
3. **过线：** 已登录；试用配额约 **1 份/周期**  

☐ E1 通过

### E2. TC-2 扫描 + 审阅

1. 选场景（如保密协议）→ 上传或示例 → 开始扫描  
2. 等出摘要/风险 → 进合同审阅  
3. 勾选几条建议  
4. **过线：** 有结果；左右分栏内部滚动；无白屏  

☐ E2 通过

### E3. TC-3 Word（要 Pro）

- **没有 Pro：** 本段勾「跳过」，靠 E4。  
- **有 Pro：** 中文导出 Word → 首页/页眉免责与 zh `ai_disclaimer_export` 逐字一致 → 切 EN 再导一次对英文。  

☐ E3 通过 · ☐ E3 跳过（无 Pro）

### E4. TC-4 谈判邮件（试用可做）

1. 下载谈判邮件 → 打开 txt  
2. 文末 `---` 后与 `ai_disclaimer_export` **逐字一致**  
3. 切英文再下一份  

☐ E4 中文通过 · ☐ E4 英文通过

### E5. TC-5 退出再登

1. 退出 → 同账号再登录 → 看账户/历史  
2. **过线：** 能登回；配额合理；历史无完整合同正文（脱敏）  

☐ E5 通过

在清单签字栏写日期。

☐ 阶段 E 全部勾完

---

## 阶段 F — 建议补做的冒烟（20 分钟）

打开 `docs/deploy/smoke-test-release-checklist.md`：

| 项 | ☐ |
|----|---|
| TC-0.2 首页「不构成法律意见」 | ☐ |
| TC-0.4 CNY「人民币支付通道」咨询可点开 | ☐ |
| TC-0.2a 审阅/结账中途切中英文 | ☐ |
| （可选）TC-AI-01～05 与阶段 C 重叠可勾 | ☐ |

☐ 阶段 F 完成

---

## 阶段 G — 微信独立收银（完整做完才开开关）

> **今天产品已可用：** Stripe CNY 预付 + 咨询 CTA。  
> 本阶段是「加油包独立微信 topup」。没收银页前 **禁止** `WECHAT_PAY_ENABLED=true`。

### G1. 发询价邮件

复制：`docs/deploy/wechat-kyc-sales-email-zh.md`  
发给 1～2 家（如 Airwallex / PingPong / Ping++）。

☐ G1 已发送

### G2. 准备 KYC 材料

- 公司注册文件  
- 董事护照 / 住址证明  
- 公司银行账户  
- 网站用途：clausecheck.cc 合同 AI SaaS  

☐ G2 材料齐

### G3. 完成商户 KYC

按服务商后台提交 → 等到「可收微信」书面确认 + API/文档。

☐ G3 KYC 通过

### G4. 收银适配页

需要开发（或服务商代做）。行为见 `docs/WECHAT_PAY_ENABLEMENT.md`：

- URL：`https://你的域/pay?order_id=&amount_cents=`  
- 调聚合商创建微信订单 → 展示码/H5  
- 成功后 `POST https://www.clausecheck.cc/api/webhooks/payment`（HMAC 用已有 `PAYMENT_WEBHOOK_SECRET`）  

适配页上线后记下基址（**不要**带 query），例如：`https://pay.example.com/pay`

☐ G4 适配页已上线 · 基址：____________

### G5. 写入 Vercel 并部署

1. `WECHAT_PAY_QR_BASE` = 上一步基址（无 `?`）  
2. `WECHAT_PAY_ENABLED` = `true`  
3. 确认 **没有** `ALLOW_MOCK_WECHAT_PAY=1`  
4. Redeploy  

☐ G5 完成

### G6. 验收

按 `docs/WECHAT_PAY_ENABLEMENT.md` 末尾清单：CNY 定价出现钱包相关入口；加油包可走通；webhook 入账。

☐ G6 通过

---

## 阶段 H — 总签字

| 检查 | ☐ |
|------|---|
| A Health + mock-qr | ☐ |
| B 核心 Env + 短信 Secrets | ☐ |
| C Qwen + DeepSeek + 双区域 curl | ☐ |
| D Cron Bearer 两路成功 | ☐ |
| E 手测 TC-1～5（Word 可跳过） | ☐ |
| F 建议冒烟 | ☐ |
| G 微信（做完才勾；未做则写「暂缓」） | ☐ / 暂缓 |

**执行人：** ____________  
**日期：** ____________  
**结论：** ☐ 配置齐可软测运营 · ☐ 尚有阻断（列出）：____________  

---

## 常用链接

| 用途 | URL |
|------|-----|
| 生产 Health | https://www.clausecheck.cc/api/health |
| Vercel Env | Dashboard → Project → Settings → Environment Variables |
| OpenAI Keys | https://platform.openai.com/api-keys |
| 阿里云百炼 | https://bailian.console.aliyun.com/ |
| DeepSeek Keys | https://platform.deepseek.com/api_keys |
| 手测清单 | `docs/deploy/smoke-test-release-checklist.md` |
| Cron 抽查 | `docs/deploy/ops-cron-verify.md` |
| 微信行动 | `docs/deploy/wechat-merchant-founder-actions.md` |
| 微信询价邮件 | `docs/deploy/wechat-kyc-sales-email-zh.md` |
