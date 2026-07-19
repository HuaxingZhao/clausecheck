# ClauseCheck — 发布前全链路冒烟测试清单

> **用途：** Soft Beta / 生产发布前手测执行清单（非技术人员可勾选完成）。  
> **生产：** https://www.clausecheck.cc · Support：`support@clausecheck.cc`  
> **对照：** `docs/EXPERT_BRIEF.md` 主流程 · `docs/PROJECT-STATUS.md` · P0/P1 收口（#31–#43）  
> **自动化补充（可选）：** `npm run test:e2e:beta-p0` · `npm run test:smoke`

### 执行前准备

| 项 | 说明 |
|----|------|
| 环境 | 生产 `https://www.clausecheck.cc`（或指定 Preview URL） |
| 账号 | **新邮箱**（未注册）一份；若测 Word 导出需 **Pro** 账号另备 |
| 合同 | 短 PDF/DOCX（建议 &lt; 5,000 字，试用上限约 20,000 字） |
| 浏览器 | Chrome / Safari 桌面；建议开无痕窗口 |
| 语言 | 先跑 **中文** `/zh`；再抽查英文首页（无 `/en` 前缀） |
| 耗时 | 核心链路约 **25–40 分钟**；含可选隐私项约 **+10 分钟**（或次日复验） |

### 免责声明对照文案（专项）

| 语言 | 完整文案（须一字不差出现在导出物中） |
|------|--------------------------------------|
| 中文 | `⚠️ 本内容由 AI 生成，仅供决策参考，不构成法律意见。` |
| 英文 | `⚠️ This content is AI-generated for reference only and does not constitute legal advice.` |

界面侧还应可见信任条 / `ai_notice` 类表述含「不构成法律意见」或 *not legal advice*。

> **校验细则（合规声明注入 · 全文适用 TC-3 / TC-4）：** 导出文件中的免责声明文案，需与 `messages/zh.json` / `messages/en.json` 中 `ai_disclaimer_export` 的**最新内容逐字比对一致**，禁止仅校验「存在声明」。验收前请先打开仓库当前 messages 核对字符串，再与 Word / 谈判邮件全文对照（含标点与 emoji）。

### 结果记录

| 字段 | 填写 |
|------|------|
| 测试日期 | 2026-07-17 |
| 环境 URL | https://www.clausecheck.cc |
| Health `version` | `3469836` |
| 执行人 | Cursor agent（自动化）+ 待创始人手测 TC-1–5 |
| 总结果 | ☑ 自动化通过 · ☐ 全链路手测完成 · ☐ 有阻断 |

### 2026-07-17 自动化签字摘录

| 项 | 结果 |
|----|------|
| TC-0.1 Health | ✅ |
| TC-0.3 mock-qr 404 | ✅ |
| TC-0.4 CNY 咨询 CTA / 无微信按钮 | ✅ 浏览器 |
| Cron 无鉴权 401 | ✅ 两路 |
| `npm run test:e2e:beta-p0` | ✅ 6/6 |
| `npm run test:smoke` | ✅ 8 pass / 4 skip |
| 免责声明单测 | ✅ |
| TC-1–5 注册扫描导出 | ⬜ 需真人账号 |
| TC-6 Cron Bearer 正向 | ⬜ 见 `ops-cron-verify.md`（Sensitive） |

---

## 0. 发布前预检（P0 基础设施）

### TC-0.1 Health

| | |
|--|--|
| **步骤** | 浏览器打开 `https://www.clausecheck.cc/api/health`，或终端：`curl -sS https://www.clausecheck.cc/api/health` |
| **预期** | `"status":"ok"`；`checks.database.status` 与 `checks.openai.status` 为 `ok`；记下 `version` SHA |
| **失败排查** | Vercel 部署失败 / 错误环境；`DATABASE_URL` / `OPENAI_API_KEY`；勿继续后续用例直到 health 绿 |

### TC-0.2 首页合规文案（P0 i18n）

| | |
|--|--|
| **步骤** | 打开 `/zh`；确认顶栏有语言切换；浏览首屏信任条与页脚「隐私 / 协议」 |
| **预期** | 可见「不构成法律意见」或等价表述；Support 指向 `support@clausecheck.cc`（非 `clausecheck.app`） |
| **失败排查** | `messages/zh.json` 未部署；CDN 缓存旧页 → 硬刷新；对照 `I18N_COMPLIANCE_DIFF_REPORT.md` |

#### TC-0.2a 关键流程中途切换语言（校验细则）

| | |
|--|--|
| **步骤** | 在**导出页（合同审阅 / 导出按钮区）、支付页（结账弹窗 / 定价结账）**等关键流程**中途**，用顶栏切换中英文（各至少一次往返） |
| **预期** | 文案实时刷新；占位符（金额、周期、配额数字等）正确渲染；布局无溢出错位；无控制台 JS 报错 |
| **失败排查** | `next-intl` 未重挂载；硬编码中文残留；结账弹窗未随 locale 更新 `ai_disclaimer_export` / 支付文案 |

### TC-0.3 生产 Mock 支付关闭（P0）

| | |
|--|--|
| **步骤** | 访问 `https://www.clausecheck.cc/api/webhooks/payment/mock-qr` |
| **预期** | **404** 或明确不可用（不得出现可用演示收银台） |
| **失败排查** | 生产误开 `ALLOW_MOCK_WECHAT_PAY=1` → 立刻关闭并重部署 |

### TC-0.4 微信入口门控 + 人民币咨询（P0 #31/#43）

| | |
|--|--|
| **步骤** | 打开定价区（`/zh` 滚动到定价或 `/zh/pricing`）；币种切到 **CNY** |
| **预期** | **无**独立「微信支付」按钮；可见文案「中国大陆用户？联系我们获取人民币支付通道」；点击可打开咨询表单或 `mailto:support@clausecheck.cc`；无控制台报错、无 503 弹窗 |
| **失败排查** | `CnyPayChannelCta` 未挂载；误设 `WECHAT_PAY_ENABLED=true` 且无 `QR_BASE`；见 `docs/WECHAT_PAY_ENABLEMENT.md` |

#### TC-0.4a 支付接口 5xx / 超时降级（子用例 · 支付入口兜底）

| | |
|--|--|
| **步骤** | 1. 打开 Pro / 加油包结账（Stripe Intent 创建路径）<br>2. 用浏览器 DevTools → Network **阻断或改写**相关支付请求（如 `/api/stripe/create-intent` / `/api/create-subscription`）使其返回 **5xx**，或 **Throttle 模拟超时**<br>3. 观察结账弹窗 / 定价区 UI |
| **预期** | 页面自动降级，仍可到达「企业咨询 / 人民币支付通道」入口（或等价联系 CTA）；**无**未捕获 JS 报错；**无**大块空白/错位布局；用户可关闭弹窗继续浏览 |
| **失败排查** | `PaymentGateway` 错误态未渲染；仅 spinner 死锁；未暴露 `onCnyPayContact` / `CnyPayChannelCta` |

---

## 1. 新用户注册并登录

### TC-1.1 邮箱注册 + 登录（主路径）

| | |
|--|--|
| **步骤** | 1. 无痕打开 `/zh` → 注册/账户<br>2. 用**全新邮箱** + 密码注册<br>3. 若需验证邮件则完成验证<br>4. 登录成功后访问 `/zh/account` |
| **预期** | 注册成功并进入已登录态；账户页可见试用配额（Plan A：**每周期 1 份**）；无 Apple 登录入口 |
| **失败排查** | `AUTH_SECRET` / DB；Resend 发信；密码规则；看 Network 里 `/api/auth/register` / `login` |

### TC-1.2 忘记密码入口（P1）

| | |
|--|--|
| **步骤** | 退出或未登录 → 登录页找「忘记密码」→ 走一遍请求重置（可用测试邮箱） |
| **预期** | 入口可见；提交后有明确成功/提示文案（不暴露是否存在该邮箱亦可，但不得白屏） |
| **失败排查** | `purpose=password_reset` magic link；`RESEND_API_KEY` / `EMAIL_FROM` |

### TC-1.3 手机 +86 OTP（P1，可选）

| | |
|--|--|
| **步骤** | 登录页选手机号 → 输入中国大陆号 → 获取验证码 → 登录 |
| **预期** | 短信签名为 **【恒创联众】**；可收码并登录；桥接为站内 session |
| **失败排查** | Supabase Secrets 签名/模板；`docs/ALIYUN_SMS_HOOK.md`；Hook 日志 |

### TC-1.4 Google 登录（可选）

| | |
|--|--|
| **步骤** | 点 Google → 完成 OAuth → 回到站点 |
| **预期** | 回到 `clausecheck.cc` 且已登录；Redirect URI 为生产 callback |
| **失败排查** | Google Console Redirect：`https://www.clausecheck.cc/api/auth/google/callback` |

**本段结果：** ☐ 通过 · ☐ 失败 · 备注：____________

---

## 2. 上传合同并完成扫描

### TC-2.1 未登录拦截（P0/P1）

| | |
|--|--|
| **步骤** | 无痕窗口不登录 → 选场景 → 尝试上传/扫描 |
| **预期** | 被要求登录 / 明确未授权，**不会**静默扣次或空白成功 |
| **失败排查** | `/api/scan` 鉴权；客户端误信 `x-user-tier` |

### TC-2.2 场景选择 + 上传扫描（主路径）

| | |
|--|--|
| **步骤** | 1. 已登录 → `/zh`<br>2. 选择任一场景（如 NDA / 通用）<br>3. 上传短合同（或使用站内示例）<br>4. 等待扫描结束（约数十秒） |
| **预期** | 出现决策摘要、风险分级、可折叠详情；配额减少（试用 1→0）；无 504 白屏 |
| **失败排查** | Vercel/OpenAI 超时；字数超限；配额已用尽；Safari CJK 上传 → 换 Chrome 或较小文件 |

### TC-2.3 合同审阅分栏（P0 UX）

| | |
|--|--|
| **步骤** | 进入「合同审阅」；观察左右分栏；滚动左右内容；勾选高风险采纳 |
| **预期** | 壳高约 **82vh**，双栏**内部**滚动（页面不整体被拉成超长滚动主区）；左原文 / 右建议；建议为可粘贴条款口吻 |
| **失败排查** | CSS `contract-review-shell`；误恢复 TipTap 主流程 |

### TC-2.4 试用第二次扫描（配额）

| | |
|--|--|
| **步骤** | 同一试用账号再扫一份合同 |
| **预期** | 被拒绝或引导升级 / 加油包；文案用「文档审阅配额」而非 *unlimited credits* |
| **失败排查** | `document_quota` / Plan A 配置；`lib/pricing.config.ts` |

**本段结果：** ☐ 通过 · ☐ 失败 · 备注：____________

---

## 3. 导出 Word 修订稿（免责声明专项）

> **说明：** Word 修订对照稿为 **Pro** 能力。试用账号请改用 Pro 测试号，或本段标「跳过（无 Pro）」并依赖 TC-4 邮件免责。

### TC-3.1 中文界面导出 Word

| | |
|--|--|
| **步骤** | 1. 界面保持 **中文**<br>2. 审阅页勾选至少 1 条建议<br>3. 点击导出 Word / 修订对照稿<br>4. 用 Word / Pages / Google Docs 打开下载的 `.docx` |
| **预期** | **第一眼**可见完整中文免责声明（见上文对照表）；页眉中亦有同款或等价醒目声明；正文为修订对照，**不是**静默覆盖用户原文件 |
| **失败排查** | `/api/review/export`；`lib/generateRevisionDocx.ts` / `ai_disclaimer_export`；Pro 鉴权失败 |

> **校验细则（合规声明注入）：** 将文档内声明与 `messages/zh.json` → `ai_disclaimer_export` **逐字比对**（含 `⚠️` 与句末标点）；禁止仅勾选「有一段灰色提示」。

### TC-3.2 英文界面导出 Word（语言一致性）

| | |
|--|--|
| **步骤** | 顶栏切到英文 → 再次导出 Word → 打开文档 |
| **预期** | 免责声明为**英文**完整句（见对照表）；不得仍为中文 |
| **失败排查** | 导出请求未传 `locale=en`；`getAiDisclaimerExport` |

> **校验细则（合规声明注入）：** 与 `messages/en.json` → `ai_disclaimer_export` **逐字比对一致**；禁止仅校验「存在声明」或模糊匹配 *legal advice*。

**免责声明勾选：** ☐ 首页横幅可见 · ☐ 页眉可见 · ☐ 中英随界面切换 · ☐ 已与 messages 逐字一致  

**本段结果：** ☐ 通过 · ☐ 跳过 · ☐ 失败 · 备注：____________

---

## 4. 谈判邮件下载（免责声明专项）

> 产品为**下载**谈判邮件（非站内 SMTP 群发）。试用与 Pro 均可测。

### TC-4.1 中文谈判邮件

| | |
|--|--|
| **步骤** | 1. 界面 **中文**<br>2. 勾选建议 →「下载谈判邮件」<br>3. 打开下载的 `.txt`（或等价文本） |
| **预期** | 正文为谈判口吻；**文末**在分隔线后出现完整中文 `ai_disclaimer_export`；审阅栏旁也可看到同款提示 |
| **失败排查** | `lib/negotiation-email.ts`；`review-actions-bar` 未传 locale |

> **校验细则（合规声明注入）：** 文末字符串须与 `messages/zh.json` → `ai_disclaimer_export` **逐字一致**；禁止仅确认「文末有免责」而未打开 messages 对照。

### TC-4.2 英文谈判邮件

| | |
|--|--|
| **步骤** | 切英文 → 再下载谈判邮件 → 打开文件 |
| **预期** | 文末为完整**英文**免责声明 |
| **失败排查** | 同上，检查 `locale === "en"` |

> **校验细则（合规声明注入）：** 与 `messages/en.json` → `ai_disclaimer_export` **逐字比对**；禁止仅校验「存在声明」。

**免责声明勾选：** ☐ 中文文末完整 · ☐ 英文文末完整 · ☐ 与界面语言一致 · ☐ 已与 messages 逐字一致  

**本段结果：** ☐ 通过 · ☐ 失败 · 备注：____________

---

## 5. 退出后重新登录，历史仍可访问

### TC-5.1 退出登录

| | |
|--|--|
| **步骤** | 顶栏退出 → 访问 `/zh/account` 或刷新首页 |
| **预期** | 未登录态；无法再访问需登录的账户内容 |
| **失败排查** | Session cookie 未清除；`cc_session` |

### TC-5.2 重新登录 + 历史

| | |
|--|--|
| **步骤** | 用同一账号重新登录 → 打开账户 / 报告历史（Pro） |
| **预期** | 能回到账户；**Pro**：历史报告列表仍在，且**不含合同全文**（脱敏摘要级）；配额状态与退出前一致（未无故重置） |
| **失败排查** | 用户 ID 不一致（手机/邮箱双身份）；报告未 `saveReport`；RLS |

### TC-5.3 配额徽章稳定性（P1）

| | |
|--|--|
| **步骤** | 登录后观察顶栏/定价区配额展示；刷新页面 |
| **预期** | 不闪成「访客」或误报「请登录查看配额」（短暂 loading 可接受） |
| **失败排查** | credits API 5xx；`useCredits` session 状态 |

**本段结果：** ☐ 通过 · ☐ 失败 · 备注：____________

---

## 6. 数据保留 / 硬删（可选 · 隐私 P0）

> **重要：** 会话超时 **不会** 立刻物理删除数据库行；合同修订正文依赖 **≤24h Cron 硬删**（`/api/cron/purge-contract-data`）。本段验证「承诺 vs 实现」，可与主链路分日执行。

### TC-6.1 Cron 可达（运维）

| | |
|--|--|
| **步骤** | 持有 `CRON_SECRET` 时：`curl -sS -H "Authorization: Bearer $CRON_SECRET" https://www.clausecheck.cc/api/cron/purge-contract-data` |
| **预期** | JSON 含成功/ok 类结果；`Unauthorized` 则密钥不匹配（需轮换，勿把密钥贴进聊天） |
| **失败排查** | Vercel Cron 配置；`CRON_SECRET`；见 `PRIVACY_DATA_RETENTION_AUDIT.md` |

### TC-6.2 修订稿时效（产品侧）

| | |
|--|--|
| **步骤** | Pro：导出/保存修订后记录时间；**24h 后**再试下载同一修订正文（或查库 `revisions` 是否已 DELETE） |
| **预期** | 超时后正文不可再取；无「软删除列仍可读」；报告历史若仍在则为脱敏摘要 |
| **失败排查** | Cron 未跑；时区；误用软删除 |

> **校验细则（数据生命周期 · 验证手段）：** 对照 `PRIVACY_DATA_RETENTION_AUDIT.md`：会话超时**本身**不会立刻删库；修订正文依赖 ≤24h Cron 硬删。验收时须采用以下**至少一种**手段，禁止仅凭「页面打不开」推断已删：  
> 1. 查询数据库 / 对象存储，确认对应 `revisions`（及上传字节残留）记录已**物理 DELETE**（非软删列）；或  
> 2. 检查运维日志中存在 `data_purge_completed` 事件，且事件时间戳表明净化窗口 **≤24h**（相对 `created_at` / 策略截止时间）。

### TC-6.3 扫描请求不落全文（抽查）

| | |
|--|--|
| **步骤** | 完成一次扫描后，在账户历史打开该报告（若有） |
| **预期** | 看不到完整原始合同正文作为长期存档 |
| **失败排查** | `sanitizeScanResultForPersistence` 未生效 |

**本段结果：** ☐ 通过 · ☐ 跳过 · ☐ 失败 · 备注：____________

---

## 7. P0/P1 修复点速查（发布门禁）

以下与上文章节交叉覆盖；发布前请全部勾选或标注跳过理由。

| ID | 主题 | 覆盖用例 | ☐ |
|----|------|----------|---|
| P0 | Health / DB / OpenAI | TC-0.1 | ☐ |
| P0 | Not legal advice 文案 | TC-0.2 · TC-3 · TC-4 | ☐ |
| P0 | Mock 微信收银关闭 | TC-0.3 | ☐ |
| P0 | 微信 UI 门控 + 人民币咨询 | TC-0.4 | ☐ |
| P0 | 导出 AI 免责（Word + 邮件） | TC-3 · TC-4 | ☐ |
| P0 | 扫描鉴权 + 配额 | TC-2.1 · TC-2.2 · TC-2.4 | ☐ |
| P0 | 审阅 82vh 分栏 | TC-2.3 | ☐ |
| P0 | 修订 ≤24h 硬删 | TC-6（可选） | ☐ |
| P1 | 忘记密码入口 | TC-1.2 | ☐ |
| P1 | +86 OTP（签名恒创联众） | TC-1.3 | ☐ |
| P1 | 配额徽章 / credits 态 | TC-5.3 | ☐ |
| P1 | 退出再登历史 | TC-5 | ☐ |
| P1 | 历史合同回归安全（见 TC-P1-R） | TC-P1-R | ☐ |
| P0 | 双模型回归测试通过（见 TC-AI-ROUTER） | TC-AI-01…05 | ☐ |
| — | Stripe 结账（非阻断手测） | 见下方 TC-A | ☐ |

### TC-AI-ROUTER 双区域智能模型路由（增量）

> 接口：`POST /api/contract/review` · 头 `X-User-Region` / 响应 `X-AI-Region` · 环境见 `lib/ai/router.ts` JSDoc。

#### TC-AI-01 FORCE_AI_REGION=CN 时调用千问成功

| | |
|--|--|
| **步骤** | 本地/预览设置 `FORCE_AI_REGION=CN` 与有效 `QWEN_API_KEY`（或 `DASHSCOPE_API_KEY`）→ `POST /api/contract/review` body `{ "contract": "…", "lang": "zh" }` |
| **预期** | HTTP 200 SSE；响应头 `X-AI-Region: CN`；至少一条合法 ReviewChunk（sectionId/riskLevel/summary/suggestion） |
| **失败排查** | 百炼 Key/地域；`QWEN_BASE_URL`；DashScope 兼容模式是否开通 |

#### TC-AI-02 FORCE_AI_REGION=GLOBAL 时调用 GPT 成功

| | |
|--|--|
| **步骤** | `FORCE_AI_REGION=GLOBAL` + `OPENAI_API_KEY` → 同上 POST，`lang: "en"` |
| **预期** | `X-AI-Region: GLOBAL`；SSE 产出合法 ReviewChunk |
| **失败排查** | OpenAI Key/配额；模型名 `OPENAI_REVIEW_MODEL` |

#### TC-AI-03 主模型超时时自动降级且不中断流

| | |
|--|--|
| **步骤** | 模拟主模型超时或 5xx（如错误 Key 触发上游 5xx，或本地 mock）；确保对应 fallback Key 可用（CN=`DEEPSEEK_API_KEY`，GLOBAL 依赖 `OPENAI_API_KEY`+mini） |
| **预期** | SSE 仍持续推送；最终有 Chunk 或标准化 error Chunk；连接以 `data: [DONE]` 结束，进程不崩溃 |
| **失败排查** | `isRetryableProviderError`；fallback 环境变量缺失 |

#### TC-AI-04 两套 Prompt 输出 JSON Schema 一致性校验

| | |
|--|--|
| **步骤** | 运行 `node --import tsx --test lib/ai/provider.test.ts`；或人工比对 `CONTRACT_REVIEW_PROMPT_CN` / `_GLOBAL` 中 `REVIEW_CHUNK_JSON_SCHEMA_INSTRUCTION` |
| **预期** | 两侧嵌入的 Schema 指令**逐字一致**；mock Provider 产出字段集合一致 |
| **失败排查** | `lib/ai/prompts/contract-review.ts` 被单侧改动 |

#### TC-AI-05 环境变量缺失时抛出正确变量名

| | |
|--|--|
| **步骤** | 清空目标 Key 后实例化对应 Provider / 调用 `requireEnv`；或跑 `lib/ai/env-assert.test.ts` |
| **预期** | 抛出 `Missing required environment variable: <NAME>`（如 `QWEN_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY`） |
| **失败排查** | 错误被吞掉或未带变量名 |

### TC-P1-R 历史合同回归安全检查（P1 · 末尾新增）

| | |
|--|--|
| **步骤** | 随机抽取 **3 份**历史合同（账户报告历史 / 本地曾测样本均可）：对每份执行重新扫描和/或导出（谈判邮件；Pro 则含 Word） |
| **预期** | 功能正常；结果与先前版本在风险结构/关键条款上一致（允许模型小幅措辞差，但无解析异常、无条款大面积丢失、无导出损坏）；无控制台/服务端未处理错误 |
| **失败排查** | 提取器回归；`review.source` 错配；配额耗尽误拒；导出管线版本漂移 |

### TC-A Stripe 结账抽查（建议 · 非全链路阻断）

| | |
|--|--|
| **步骤** | `/zh/pricing` → Pro → 打开结账；确认订单摘要金额/周期立刻可见；支付表单骨架后出现 Stripe Element（**勿用真实大额**；可用测试卡若为 test mode） |
| **预期** | 无长时间仅「正在加载支付表单…」空白；CNY 为预付说明；不出现独立微信 topup 503 |
| **失败排查** | Stripe keys；`create-intent`；结账加速 #42 |

---

## 8. 签字栏

| 角色 | 签字 | 日期 |
|------|------|------|
| 执行人 | | |
| 复核人（可选） | | |

**阻断问题列表（若有）：**

1. …
2. …

**结论：** ☐ 可发布 · ☐ 修复后再测 · ☐ 仅软测范围可接受  
