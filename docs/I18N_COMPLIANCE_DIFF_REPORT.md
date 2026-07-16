# i18n 合规文案差异报告

**日期：** 2026-07-16  
**范围：** `messages/zh.json` ↔ `messages/en.json`（仓库无 `lib/i18n/` 语言包目录；合规文案在 `messages/`）  
**硬约束（EXPERT_BRIEF）：** 决策支持 / 谈判材料；**不构成法律意见（not legal advice）**；中英成对维护。

---

## 1. 结构校验结果

| 检查项 | 结果 |
| --- | --- |
| 全量叶子 key 数量 | zh **863** = en **863** |
| 缺失 key | **无**（互相对称） |
| 空值 / 占位符 | 合规相关 key **无空串** |
| 路径名含 disclaimer / privacy / terms / ai_* | 修复后 zh/en **数量一致** |

说明：`hero.zhNote` 英文为空串属产品设计（仅中文站展示中国叙事），**不是**合规 key，未改。

---

## 2. 合规相关 key 清单（路径名匹配）

| Key | 硬约束 | 备注 |
| --- | --- | --- |
| `ai_disclaimer_export` | ✅ 已有 | 导出 Word / 谈判邮件 |
| `ai_notice` | ✅ **新增** | 短告知，供 UI 复用 |
| `auth.legalFooter` | ✅ | 登录同意 + 不构成法律意见 |
| `pricing.disclaimer` | ✅ | |
| `pricing.payment.disclaimer` | ✅ | |
| `communityBounty.disclaimer` | ✅ | |
| `communityBounty.footerDisclaimer` | ✅ **已补硬约束** | |
| `dpa.disclaimerFoot` | ✅ **已补硬约束** | |
| `sample.disclaimer` | ✅ **已补硬约束** | |
| `sample.trust[2]` | ✅ | |
| `footer.text` | ✅ | |
| `beta.benefits.disclaimer` | n/a | **权益发放说明**，非法律免责（见 §4） |

`timeTerms.*` / `results.timeTerms*` 为合同「时间条款」标签，**不是**法律免责声明，排除在硬约束强制列表外。

---

## 3. 本次已补全 / 对齐的文案

| Key | 变更 |
| --- | --- |
| `ai_notice` | **新增** zh/en 成对短告知 |
| `hero.trust` | 中英均含扫完即删语义 + **不构成法律意见 / Not legal advice** |
| `sample.disclaimer` | 补硬约束 |
| `dpa.disclaimerFoot` | 中文化并补「不构成法律意见」；英补 not legal advice |
| `faq.items[1].a`（主站 FAQ） | 中文补「不构成法律意见」，对齐英文已有表述 |
| `beta.faq.items[3].a` | 中英显式写入硬约束短语 |
| `communityBounty.footerDisclaimer` | 中英补硬约束（与 `disclaimer` 一致） |

---

## 4. 仍需法务 / 创始人最终确认

| 文案 / 位置 | 为何需确认 | 建议 |
| --- | --- | --- |
| `hero.trust` 长度增加 | 首屏信任条变长，是否影响转化 | 确认是否保留「不构成法律意见」或改为悬浮/脚注 |
| `faq.items[0].a` / `how.step1.desc`「扫完即删 / never store」 | 与 Pro 报告元数据保留、修订稿 ≤24h 硬删的技术现实需叙事一致 | 对照 `docs/PRIVACY_DATA_RETENTION_AUDIT.md` 决定是否改软表述为「正文不长期保留」 |
| `app/[locale]/privacy/page.tsx`、`terms` 页 | **硬编码**中英，不在 `messages/`；联系邮箱仍见 `privacy@clausecheck.com` | 迁入 i18n 或单独法务审稿；统一 `support@clausecheck.cc` |
| `beta.benefits.disclaimer` | 名称含 disclaimer 但内容是权益发放 | 可改名为 `perkNote` 以免审计误报（可选） |
| `faq.items[7].a`「AI 已在…合同类型上做过训练」 | 易被误解为「用用户合同训练」 | 改成「模型具备广泛合同类型能力」类表述（建议确认） |
| OpenAI / 第三方日志留存 | FAQ 称绝不用于训练 | 与供应商 DPA 对齐后由法务签字 |

---

## 5. 验收对照

- [x] zh/en 合规相关路径 key 成对、数量一致  
- [x] 无空值占位  
- [x] 导出 / 定价 / 支付 / 社区 / DPA / 样本 / FAQ / Beta FAQ / 页脚含硬约束短语  
- [ ] **待确认：** §4 列表（隐私页硬编码、扫完即删表述粒度、FAQ「训练」措辞）

---

*本报告可作为 EXPERT_BRIEF「中英合规文案成对」检查的交付物；法律效力最终以法务/创始人确认及正式隐私政策/用户协议为准。*
