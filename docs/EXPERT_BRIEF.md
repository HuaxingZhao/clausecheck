# ClauseCheck — Expert Review Brief

**用途 / Purpose：** 给外部专家做一次「功能审查 + 战略建议」的自包含附件。  
**产品：** ClauseCheck · 双语合同风险扫描 SaaS · Soft Beta  
**生产：** https://www.clausecheck.cc · Support：`support@clausecheck.cc`  
**日期：** 2026-07-16 · 生产 SHA：`73112d2`（PR **#34**；以 `GET /api/health` → `version` 复核）

---

## 0. 自本 Brief 初版以来的关键收口（#31–#34 + 运维）

供专家对照「承诺 vs 实现」与中国市场就绪度：

| 项 | 状态 | 证据 / 路径 |
|----|------|-------------|
| **微信收银入口** | 前端默认隐藏；CNY 改为「人民币支付通道」企业咨询 CTA；`WECHAT_PAY_ENABLED=true` 可恢复钱包文案 | #31 · `lib/credits/wechat-pay-config.ts` · `CnyPayChannelCta` |
| **导出免责声明** | Word 首页横幅 + 页眉；谈判邮件文末；`ai_disclaimer_export` zh/en 成对 | #32 · `lib/generateRevisionDocx.ts` · `lib/negotiation-email.ts` · `lib/ai-disclaimer.ts` |
| **隐私 / 扫完即删** | 扫描请求仍不落库；报告写入剥离全文；修订稿 ≤24h **物理 DELETE**；小时 Cron + `CRON_SECRET`；`reports`/`revisions` RLS | #33 · `docs/PRIVACY_DATA_RETENTION_AUDIT.md` · `/api/cron/purge-contract-data` |
| **合规 i18n** | zh/en key 对齐；硬约束「不构成法律意见 / not legal advice」补强；`ai_notice`；§4 产品侧叙事已与 ≤24h 硬删对齐 | #34 + 后续收口 · `docs/I18N_COMPLIANCE_DIFF_REPORT.md` |
| **中国 +86 短信** | Hook → Aliyun `SendSmsVerifyCode`；生产签名已切至可用赠送签名 **`恒创联众`** + 模板 **`100001`**（避开 8/31 历史赠送签名停用）；端到端已验证可收码 | 运维：Supabase Secret `ALIYUN_SMS_SIGN_NAME` · `docs/ALIYUN_SMS_HOOK.md` |

**对外合规叙事（已产品收口）：** 隐私/条款页统一 `support@clausecheck.cc`；「正文不长期保留」+ 修订 ≤24h；FAQ 不再暗示「用用户合同训练」。**仍待法务外部签字：** 对照 OpenAI / 托管方 DPA 确认第三方日志表述。

---

## 1. 一句话定位

ClauseCheck 在签合同前，用 AI 按**场景**做风险扫描，输出**可核对原文、可粘贴进谈判**的建议与导出物。

**是决策支持 / 谈判材料，不是法律意见（not legal advice）。**  
禁止宣传固定准确率百分比；重大合同仍应咨询执业律师。

---

## 2. 用户主流程

```text
选合同场景（18 种，含通用/跨境/劳动/NDA 等）
  → 上传 PDF/DOCX（或示例合同）
  → AI 扫描（约数十秒）
  → 决策摘要 + 风险分级 + 可折叠详情
  → 合同审阅：左原文 / 右建议（固定 82vh，双栏内滚）
  → 勾选采纳（按风险级别一键）
  → 谈判邮件下载 / Word 修订对照稿（均含 AI 免责声明）
```

**试用（Plan A）：** 登录后 · 每计费周期 **1 份**文档 · 约 **20,000 字** · 标准模型。  
**Pro：** 每周期 **10 份** · 更大字数深度审查 · Word 导出 · 云端报告历史（**不含合同全文**；修订正文 ≤24h 硬删）。  
**加油包：** 配额用尽后按份购买（Stripe）。  
**结账：** Stripe Payment Element（主路径）。微信 topup API 保留；未接商户时前端不暴露入口（避免 503）。

---

## 3. 产品硬约束（审查时请勿建议违反）

| 约束 | 说明 |
|------|------|
| Not legal advice | 文案、UI、导出物均须含硬约束；见 `ai_disclaimer_export` / `ai_notice` |
| Scenario-first | 专业化靠 18 场景 prompt + 场景知识/RAG，不是随便换模型 |
| Executable suggestions | 建议须是可粘贴条款文本；说明性话术要先改写 |
| Verifiable | 尽量有 `clauseId` + 原文 `quote` + 置信度 |
| Review UX | 主流程只读分栏；**不要**恢复 TipTap 为主编辑；壳高 **82vh** |
| Export | 使用 `review.source`，禁止静默改写用户原 DOCX；导出注入免责声明 |
| Privacy | 合同正文不长期落库；修订硬删 ≤24h；**禁止**软删除列假装删除 |
| i18n | zh/en 成对维护；英文路由 `as-needed`（无强制 `/en` 前缀） |
| Auth | 邮箱密码 + Google + 手机 OTP（中国 +86 阿里云，其他 Twilio）；无 Apple |
| Quota copy | 禁用 *unlimited / credits* 等误导词；用文档审阅配额表述 |

---

## 4. 定价快照（Plan A）

真源：`lib/pricing.config.ts` · 说明：`docs/PRICING_PLAN_A.md`

| Plan | 月价（示意） | 每周期配额 | 前台 |
|------|-------------|-----------|------|
| Trial | $0 / ¥0 | 1 | ✅ |
| Pro | $29 / ¥199 | 10 | ✅ Stripe |
| Team | $79 / ¥499 | 30 | ❌ 隐藏（配置保留） |
| Add-on | $5 / ¥39 | +1/包 | ✅ 配额用尽时 |
| Enterprise | 销售 | 定制 | 线索表单 + CNY「人民币通道」咨询 |

年付默认开、约 15% 折扣。配额按**订阅周年日**重置，非自然月。

---

## 5. 系统架构（功能审查地图）

```text
Upload /api/scan          ← 请求内 ephemeral，不 INSERT 合同全文
  → extract text
  → assert login + word limit + document quota
  → analyze.ts (+ scenario overlay + RAG)
  → analysis-pipeline (quote snap → rewrite → critic → confidence)
  → ScanResult UI
  → contract-review-view (lock to source)
  → accept → revision workbook / negotiation email
       (+ AI disclaimer)
  → Pro saveReport（sanitize：剥离 source）
  → Cron hourly：DELETE revisions >24h；scrub 报告残留全文
```

**Jurisdiction Packs：** Base + 单 Pack 插件（如 `us-ca`）；审查时只加载一个法域。  
**社区：** `/community/bounty` 法域 Pack 悬赏（zh/en）。  
**短信：** Supabase Send SMS Hook → `send-sms` → +86 Aliyun / 其他 Twilio。

---

## 6. 请专家重点打开的文件

### 文档

| 路径 | 看什么 |
|------|--------|
| `docs/PRICING_PLAN_A.md` | 商业与结账边界 |
| `docs/PROJECT-STATUS.md` | 上线能力与 backlog |
| `docs/PRIVACY_DATA_RETENTION_AUDIT.md` | **隐私承诺 vs 实现**（硬删 / Cron / RLS） |
| `docs/I18N_COMPLIANCE_DIFF_REPORT.md` | **合规文案 zh/en** 与待确认项 |
| `docs/AI_REVIEW_ENGINE.md` | AI 引擎模块与流程 |
| `docs/contributing-jurisdiction-packs.md` | 法域扩展战略 |
| `docs/PHONE_AUTH_SUPABASE.md` | 中美短信 OTP |
| `docs/ALIYUN_SMS_HOOK.md` | +86 阿里云 Hook（签名运维） |
| `.cursor/skills/clausecheck-project/SKILL.md` | 产品记忆 / 硬约束 |
| `.cursor/skills/clausecheck-project/PROGRESS.md` | 近期交付（#19–#34） |

### 代码（质量与交付核心）

| 路径 | 看什么 |
|------|--------|
| `lib/pricing.config.ts` | 定价真源 |
| `lib/analyze.ts` | 扫描分析入口 |
| `lib/analysis-pipeline.ts` | 质量管线 |
| `lib/ai/review-contract.ts` | 审查工作流 |
| `lib/ai/expert-system-prompt.ts` | 专家系统提示 |
| `lib/rewrite-suggestions.ts` | 可执行建议改写 |
| `lib/contract-scenarios.ts` | 18 场景 |
| `lib/scenario-knowledge.ts` | 场景知识 |
| `lib/lock-suggestions.ts` | 建议锚定原文 |
| `lib/review-to-changes.ts` | 采纳 → 变更 |
| `lib/generateRevisionDocx.ts` | Word 导出 + 免责声明 |
| `lib/negotiation-email.ts` | 谈判邮件 + 免责声明 |
| `lib/privacy/contract-retention.ts` | 持久化脱敏 / 24h 截止 |
| `app/api/scan/route.ts` | 上传扫描 API（鉴权/字数/扣次） |
| `app/api/cron/purge-contract-data/route.ts` | 定时硬删 |
| `app/[locale]/components/contract-review-view.tsx` | 审阅 UI |
| `app/[locale]/components/pricing/CnyPayChannelCta.tsx` | 人民币咨询入口 |
| `lib/auth/session.ts` | Session / 重置密码吊销 |
| `supabase/functions/send-sms/index.ts` | +86 / Twilio 发信 |
| `lib/prompts/jurisdiction-packs/` | 法域 Packs |
| `messages/zh.json` + `messages/en.json` | 产品叙事与合规文案 |

### 线上手测（约 25 分钟）

1. https://www.clausecheck.cc/zh — 试用文案、场景、上传；信任条含「不构成法律意见」  
2. 登录 → 扫一份短合同 → 摘要/风险/审阅分栏  
3. 采纳后下载谈判邮件 /（Pro）Word — 检查免责声明是否醒目  
4. https://www.clausecheck.cc/zh/beta — 创始权益免责  
5. 定价区 — Trial/Pro/Enterprise；CNY 无微信按钮，有人民币咨询 CTA；Stripe 可用  
6. https://www.clausecheck.cc/zh/community/bounty — 中文悬赏 + footer 免责  
7. 手机 +86 OTP（可选）— 短信签名【恒创联众】  
8. `GET https://www.clausecheck.cc/api/health` → `status: ok`，`version` ≈ `73112d2`  
9. （有 `CRON_SECRET`）`Authorization: Bearer …` 调 `/api/cron/purge-contract-data` → `ok: true`

---

## 7. 功能审查问题清单

请逐条给出「通过 / 风险 / 建议」：

1. **定位：** 用户是否清楚这是决策支持而非律师替代？哪里仍像法律意见？  
2. **输出质量：** 建议是否可粘贴进合同？原文引用与置信度是否可信？  
3. **场景价值：** 18 场景是否形成壁垒，还是包装过度？该砍还是该加深？  
4. **审阅 UX：** 82vh 分栏 + 采纳 + Word 导出，律师/商务能否真用？缺什么？  
5. **试用漏斗：** 1 份/周期 + 登录门槛，是否过狠或过松？转化路径是否顺？  
6. **中英与中国市场：** OTP、人民币咨询入口、中文叙事是否够？缺微信收银是否致命？  
7. **安全/合规叙事：** 正文不长期保留、修订 ≤24h、不用于自有模型训练、免责声明与实现是否匹配？（请对照 `PRIVACY_DATA_RETENTION_AUDIT` / `I18N_COMPLIANCE_DIFF_REPORT`）  
8. **法域 Pack：** 插件化是否值得做成核心差异化？众包 bounty 是否可行？

---

## 8. 战略讨论：现状 vs 可加功能

### 已上线（可当基线）

- 场景化 AI 扫描 + 质量管线  
- 分栏审阅 + 谈判/Word 导出（含双语 AI 免责声明）  
- Plan A 订阅（Stripe）+ 试用配额  
- 邮箱 / Google / 手机登录 + 忘记密码；+86 短信运营就绪  
- CNY 人民币通道咨询（微信入口默认关闭）  
- 合同正文硬删 Cron ≤24h + 报告脱敏  
- 合规 i18n 对齐 + Beta / bounty 页  
- 软测级安全收口（mock 支付关闭、session 吊销等）

### 明确 backlog（不是 bug，适合战略选择）

| 选项 | 现状 | 战略含义 |
|------|------|----------|
| 微信/本地支付加油包 | API 有；UI 门控；商户未配 | 中国转化 |
| Team 套餐上架 | 配置隐藏 | SMB 席位 |
| Enterprise 销售流程 | 线索表单 + CNY 咨询 | 大客/法务团队 |
| 更深法域 Pack + 律师校准 | Pack + bounty 骨架 | 护城河 |
| 向量 RAG / 微调 | 偏未来 | 质量上限 |
| Redis / 更强硬限流 | 未配 | 规模化 |
| Discord 社群 | 需 env 才展示 | 社区运营 |
| 隐私政策页迁入 i18n | 硬编码但已与保留策略对齐；整页迁 i18n 可选 | 合规叙事一致性 |
| 微信商户收银 URL | 启用清单已写；缺 `WECHAT_PAY_QR_BASE` | 中国加油包转化 |
| Product Hunt 大宣发 | 材料有，节奏可选 | 获客 |

### 请专家拍板的优先序（选 1–2 个下一季度主轴）

**A.** 付费转化（定价实验、试用策略、微信商户、年付叙事）  
**B.** 审查质量（场景加深、法域 Pack、律师反馈闭环）  
**C.** 企业销售（Team/SSO/采购、批量席位）  
**D.** 社区与供给（bounty、贡献者、内容 SEO）  
**E.** 合规与信任（隐私页、对外表述、导出/OTP 证据链）  
**F.** 其他（请写）

---

## 9. 期望输出格式（请专家按此回复）

```markdown
## 功能结论
- 总评（1–2 句）
- 必修问题（若有）
- 建议改进（按优先级）

## 战略建议
- 下一季度主轴（A/B/C/D/E/F）及理由
- 明确不做的事（避免分心）
- 90 天里程碑建议（3–5 条）

## 可选：竞品/定位一句话
```

---

## 10. 仓库与附件说明

- GitHub：https://github.com/HuaxingZhao/clausecheck  
- 本文件路径：`docs/EXPERT_BRIEF.md`  
- Cursor 技能入口：`.cursor/skills/clausecheck-expert-review/SKILL.md`  

**推荐最小附件包：**

1. 本文件（`EXPERT_BRIEF.md`）  
2. `docs/PRIVACY_DATA_RETENTION_AUDIT.md`  
3. `docs/I18N_COMPLIANCE_DIFF_REPORT.md`  
4. 仓库只读权限（或 zip：上述文件 + §6 列表路径）

---

*ClauseCheck · Decision support only · Not legal advice.*
