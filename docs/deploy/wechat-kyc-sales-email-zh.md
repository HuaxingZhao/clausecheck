# 发给聚合商销售的询价邮件（可直接复制）

**主题：** 新加坡 SaaS 开通微信收款询价 — ClauseCheck（加油包约 ¥39）

---

您好，

我们是新加坡注册的 SaaS 产品 ClauseCheck（https://www.clausecheck.cc），提供 AI 合同风险扫描（决策支持，非法律意见）。

现需为中国用户开通**人民币微信支付**，主要用于站内「加油包」一次性付款（约 **¥39** / 档；专业版预付也可约 **¥199** 量级）。

请协助确认：

1. **新加坡主体**能否开通微信扫码或 H5 收款？  
2. 费率、结算币种、到账周期、是否有最低月费？  
3. 贵司提供**托管收银页**，还是仅提供创建支付 API？  
4. 支付成功后，webhook / 回调是否可转发到我们自有 URL：  
   `https://www.clausecheck.cc/api/webhooks/payment`  
5. KYC 需要哪些材料、预计审核多久？是否有 sandbox？

我们产品侧已预留收银基址配置（`WECHAT_PAY_QR_BASE`），适配页需接受：

`GET {收银基址}?order_id=<uuid>&amount_cents=<分>`

期待贵司方案与报价，谢谢。

ClauseCheck  
support@clausecheck.cc  

---

**KYC 材料自备清单：** 公司注册文件、董事护照/住址证明、公司银行账户信息、网站用途说明（合同 AI SaaS）。  
**下一步：** 对方书面确认能收微信后 → 做收银适配页 → 再填 Vercel 环境变量（见 `wechat-merchant-founder-actions.md`）。
