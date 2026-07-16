# i18n 合规文案差异报告

**日期：** 2026-07-16（§4 产品侧收口）  
**范围：** `messages/zh.json` ↔ `messages/en.json`；`privacy` / `terms` / `about` 硬编码页  
**硬约束（EXPERT_BRIEF）：** 决策支持 / 谈判材料；**不构成法律意见（not legal advice）**；中英成对维护。  
**状态：** §4 产品可决项已落地；OpenAI/供应商 DPA 签字仍属法务外部事项。

---

## 1. 结构校验结果

| 检查项 | 结果 |
| --- | --- |
| 全量叶子 key 数量 | zh/en 应对称（改后含 `beta.benefits.perkNote`） |
| 缺失 key | **无**（互相对称） |
| 空值 / 占位符 | 合规相关 key **无空串** |
| 路径名含 disclaimer / privacy / terms / ai_* | zh/en **数量一致**（`perkNote` 不再误标为法律 disclaimer） |

说明：`hero.zhNote` 英文为空串属产品设计（仅中文站展示中国叙事），**不是**合规 key，未改。

---

## 2. 合规相关 key 清单（路径名匹配）

| Key | 硬约束 | 备注 |
| --- | --- | --- |
| `ai_disclaimer_export` | ✅ | 导出 Word / 谈判邮件 |
| `ai_notice` | ✅ | 短告知，供 UI 复用 |
| `auth.legalFooter` | ✅ | 登录同意 + 不构成法律意见 |
| `pricing.disclaimer` | ✅ | |
| `pricing.payment.disclaimer` | ✅ | |
| `communityBounty.disclaimer` | ✅ | |
| `communityBounty.footerDisclaimer` | ✅ | |
| `dpa.disclaimerFoot` | ✅ | |
| `sample.disclaimer` | ✅ | |
| `sample.trust[2]` | ✅ | |
| `footer.text` | ✅ | |
| `beta.benefits.perkNote` | n/a | **权益发放说明**（原 `disclaimer` 已改名） |

`timeTerms.*` / `results.timeTerms*` 为合同「时间条款」标签，**不是**法律免责声明。

---

## 3. 已补全 / 对齐的文案（含 §4 收口）

| Key / 位置 | 变更 |
| --- | --- |
| `ai_notice` | 成对短告知 |
| `hero.trust` | 保留「不构成法律意见」；「扫完即删」→「正文不长期保留 / No long-term body retention」 |
| `how.step1.desc` | 对齐 ≤24h 硬删 + 不落长期库 |
| `faq.items[0].a` | 与 `PRIVACY_DATA_RETENTION_AUDIT` 一致（扫描不落库 / 报告元数据 / 修订 ≤24h） |
| `faq.items[5].a` | 弱化绝对第三方承诺；明确「我们不用于自有模型训练」 |
| `faq.items[7].a` | 去掉「已在…上做过训练」歧义 |
| `beta.benefits.perkNote` | 原 `disclaimer` 改名 |
| `privacy` / `terms` 页 | 保留策略与审计一致；联系邮箱统一 `support@clausecheck.cc`；日期 → 2026-07 |
| `about` 哲学条 | 与上述叙事一致 |

---

## 4. §4 决策记录（产品侧已决）

| 文案 / 位置 | 决策 | 状态 |
| --- | --- | --- |
| `hero.trust` 含「不构成法律意见」 | **保留**（硬约束；不挪到脚注） | ✅ |
| 「扫完即删 / never store」 | **改为**「正文不长期保留」+ FAQ/隐私页写清报告元数据与 ≤24h 修订删除 | ✅ |
| `privacy` / `terms` 硬编码 | **暂不整页迁 i18n**；已对齐技术现实 + 统一 `support@clausecheck.cc` | ✅ |
| `beta.benefits.disclaimer` | **改名为** `perkNote` | ✅ |
| FAQ「AI 已…训练」 | **改为**「模型具备…能力（非用你的上传训练）」 | ✅ |
| OpenAI / 第三方日志 | FAQ/隐私改为「适用其商业 API 政策 + 基础设施日志可能短期留存」 | ✅ 文案；⬜ 法务对照供应商 DPA 签字 |

---

## 5. 验收对照

- [x] zh/en 合规相关路径 key 成对  
- [x] 无空值占位  
- [x] 导出 / 定价 / 支付 / 社区 / DPA / 样本 / FAQ / Beta / 页脚含硬约束短语  
- [x] §4 产品可决项已落地  
- [ ] **外部：** 法务对照 OpenAI / Vercel 等 DPA 后签字确认第三方留存表述  

---

*法律效力最终以正式隐私政策/用户协议及法务确认为准；本报告记录产品侧与实现一致的叙事收口。*
