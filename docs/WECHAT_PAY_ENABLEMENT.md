# 微信支付加油包 — 启用清单

**状态（2026-07-16）：** 代码就绪；**生产未开**（缺商户收银 URL）。  
**主结账仍走 Stripe。** 本清单只覆盖加油包 WeChat topup。  
金额单位：`amount_cents` = **人民币分**（例：加油包 `3900` = ¥39；专业版档 `19900` = ¥199）。

---

## 架构（已实现）

```text
定价页 CNY
  → WECHAT_PAY_ENABLED=true 且 WECHAT_PAY_QR_BASE 已配
  → 展示微信/钱包入口
  → POST /api/credits/topup → 创建 pending order
  → paymentUrl = WECHAT_PAY_QR_BASE?order_id=&amount_cents=
  → 收银页收款
  → POST /api/webhooks/payment（HMAC：x-payment-signature）
  → fulfillCreditOrder
```

| 变量 | 作用 |
| --- | --- |
| `WECHAT_PAY_QR_BASE` | 真实收银页基址（必填，生产） |
| `WECHAT_PAY_ENABLED=true` | 打开前端入口（`next.config` 会镜像到 `NEXT_PUBLIC_`） |
| `PAYMENT_WEBHOOK_SECRET` | 收银成功回调签名校验（生产必填） |
| `ALLOW_MOCK_WECHAT_PAY` | **禁止**对真实流量设为 `1` |

UI 门控：`isWechatPayUiEnabled` = 开关 **且** 已配置收银（见 `lib/credits/wechat-pay-config.ts`）。

---

## 路径 A：聚合支付 / 跨境收单（推荐）

适合：**新加坡等海外主体**、想尽快收人民币微信、暂不自己办大陆微信商户号。

### 先搞清一件事（避免踩坑）

ClauseCheck **不会**直接调 Ping++ / Airwallex 的 SDK。  
产品只认一个 **HTTPS 收银页基址** `WECHAT_PAY_QR_BASE`：

```text
https://你的收银域名/pay?order_id=<uuid>&amount_cents=<分>
```

绝大多数聚合商给你的是 **API Key +「创建支付」接口**，**不会**直接给你这种静态 URL。  
因此路径 A 的真实工作量是：

```text
① 开聚合商户拿到「能收微信」的能力
② 做一层很薄的「收银适配页」（或让服务商代做）
③ 适配页成功后按我们的格式回调 webhook
④ 把适配页 URL 填进 Vercel
```

没有 ②，只拿到 API Key，**还不能开** `WECHAT_PAY_ENABLED`。

### 阶段 0 — 你准备好什么（30 分钟）

| 准备项 | 说明 |
| --- | --- |
| 公司主体 | 新加坡公司名、注册号、董事护照/住址证明（KYC 常用） |
| 银行账户 | 公司账户（收款结算用；币种以服务商为准，常见 USD/SGD + 可兑 CNY） |
| 网站 | `https://www.clausecheck.cc`（用途：合同 AI 决策支持 SaaS） |
| 金额 | 加油包 ¥39 / 专业档 ¥199（分：`3900` / `19900`） |
| 回调地址（固定） | `https://www.clausecheck.cc/api/webhooks/payment` |

过渡期：**先别开微信入口**；CNY 继续用「人民币支付通道」咨询 CTA。

### 阶段 1 — 选服务商并询价（1–3 天）

目标：找到一家 **支持你主体** + **支持微信扫码或 H5** + **能结算到你公司户** 的聚合/跨境收单。

常见方向（**以对方销售确认为准**，名单会变）：

| 类型 | 例子（仅供检索） | 问什么 |
| --- | --- | --- |
| 跨境收单 | Airwallex、PingPong、WorldFirst 等 | 新加坡主体能否开 WeChat Pay？费率？结算币种？ |
| 支付聚合 | Ping++、易宝/其它 SaaS 聚合（常需大陆主体或服务商通道） | 是否必须大陆执照？有无托管收银台？ |
| Stripe 生态 | Stripe + 其中国/合作伙伴通道 | 账户是否已开 WeChat？能否用于「加油包」一次性付款？ |

**给销售的复制粘贴话术：**

> 我们是新加坡注册的 SaaS（clausecheck.cc），需要收人民币微信支付，用于站内「加油包」一次性付款（约 ¥39 / ¥199）。  
> 请确认：  
> 1）新加坡主体能否开通微信扫码或 H5？  
> 2）费率、结算币种、到账周期、最低月费？  
> 3）是否提供托管收银页，或仅提供 API？  
> 4）支付成功 webhook 能否由我们自定义转发到自有 URL？  
> 5）KYC 需要哪些材料、大概多久？

**通过标准：** 书面确认「能用微信收这几档金额」+ 拿到测试/正式 API 文档。  
若销售说「必须大陆执照且你们没有」→ 换一家，或改走路径 B（代进件）。

### 阶段 2 — 完成 KYC / 开户（数天～数周）

1. 在服务商后台提交公司 KYC。  
2. 等审核通过，拿到：
   - API Key / Client ID / Secret（**不要提交到 Git**）
   - 测试环境（sandbox）说明
   - 微信渠道是否已在后台「已开通」
3. 把密钥只放在密码管理器；之后若我们写适配页，再放进 Vercel Env。

### 阶段 3 — 做「收银适配页」（关键，1 次开发）

适配页职责（可用 Cloudflare Worker / 独立小服务 / 或以后加进 ClauseCheck）：

| 步骤 | 行为 |
| --- | --- |
| 1. 接收打开 | `GET {WECHAT_PAY_QR_BASE}?order_id=…&amount_cents=…` |
| 2. 校验 | `order_id` 为 UUID；`amount_cents` 为正整数（建议只允许 `3900` / `19900`） |
| 3. 向聚合商下单 | 调用其「创建微信支付」API，金额 = `amount_cents` 分，商户侧订单号建议 = `order_id` |
| 4. 展示支付 | 展示微信扫码图，或跳转微信 H5 |
| 5. 成功回调 | 聚合商通知适配页「已支付」后，适配页再 `POST` 我们的 webhook（见下） |

#### 我们必须收到的 webhook

`POST https://www.clausecheck.cc/api/webhooks/payment`

Headers:

```http
Content-Type: application/json
x-payment-signature: <HMAC-SHA256 hex of raw body，可用 sha256= 前缀>
```

Body（字段名必须一致）：

```json
{
  "order_id": "<与 URL 里相同的 uuid>",
  "provider_trade_no": "<微信或聚合商交易号>",
  "status": "success",
  "amount_cents": 3900
}
```

签名算法：

```text
signature = HMAC_SHA256(key = PAYMENT_WEBHOOK_SECRET, message = rawRequestBody).hex()
```

`amount_cents` **必须**与创建订单时一致，否则接口会拒收。

#### 给外包 / 服务商的一页需求（可直接转发）

> 请实现 HTTPS 收银页：  
> - URL：`https://pay.example.com/wechat`（此地址将作为 `WECHAT_PAY_QR_BASE`）  
> - Query：`order_id`（UUID）、`amount_cents`（人民币分）  
> - 用我们提供的聚合商 API 拉起微信扫码/H5  
> - 支付成功后 POST 到 `https://www.clausecheck.cc/api/webhooks/payment`，JSON 字段：`order_id`, `provider_trade_no`, `status`（`success` 或 `paid`）, `amount_cents`  
> - 用共享密钥对 **原始 body** 做 HMAC-SHA256，放入头 `x-payment-signature`  
> - 幂等：同一 `order_id` 重复通知可接受  

### 阶段 4 — 联调（沙箱或 1 分钱单）

1. 本地或临时环境把 `WECHAT_PAY_QR_BASE` 指到适配页。  
2. 浏览器打开：  
   `https://你的收银/…?order_id=<任意测试uuid>&amount_cents=3900`  
3. 付一笔测试款。  
4. 确认 ClauseCheck webhook 返回 200，且订单变为 paid、配额增加。  
5. 故意改错签名 / 改错金额 → 应失败（验安全）。

### 阶段 5 — 交给我上生产（你发 3 样东西）

发到对话里即可：

1. **`WECHAT_PAY_QR_BASE`** = 适配页基址（不要带 query）  
   例：`https://pay.yourdomain.com/wechat`  
2. 确认适配页已按上面格式打 webhook  
3. 若你还没有生产 `PAYMENT_WEBHOOK_SECRET`，说一声（我帮你在 Vercel 生成并只把密钥给你配适配页）

然后我会（或你按下面命令）：

```bash
vercel env add WECHAT_PAY_QR_BASE production
vercel env add WECHAT_PAY_ENABLED production   # true
# 确认 PAYMENT_WEBHOOK_SECRET 已存在且与适配页一致
# 重新部署 Production
```

### 阶段 6 — 上线验收清单

- [ ] `/zh/pricing` CNY：出现微信/钱包相关入口（不再只有「人民币咨询」）
- [ ] `POST /api/credits/topup` 不再 `WECHAT_PAY_NOT_CONFIGURED` 503
- [ ] 真实付一笔加油包 → 配额到账
- [ ] `ALLOW_MOCK_WECHAT_PAY` 未开
- [ ] `GET /api/webhooks/payment/mock-qr` 仍为 **404**

---

## 路径 B（对照，更慢）

大陆营业执照或服务商代进件 → 微信商户平台 Native/H5 → 自己写收银页（职责同路径 A 阶段 3）→ 同样填 `WECHAT_PAY_QR_BASE`。

---

## Vercel 启用顺序（有收银 URL 后再做）

```bash
vercel env add WECHAT_PAY_QR_BASE production
vercel env add WECHAT_PAY_ENABLED production   # 值：true
# PAYMENT_WEBHOOK_SECRET 若已有可跳过；没有则先加
# 重新部署后冒烟
```

**未拿到可用的 `WECHAT_PAY_QR_BASE` 前不要设 `WECHAT_PAY_ENABLED=true`。**

---

## 你现在立刻要做的（最小动作）

1. **本周：** 用阶段 1 话术联系 2–3 家服务商，问清「新加坡主体 + 微信」是否可行。  
2. **并行：** CNY 继续咨询 CTA，不挡软发布。  
3. **开户通过后：** 要么让服务商按「一页需求」代做适配页，要么把 API 文档发我，我们再评估是否在仓库里加适配路由。  
4. **拿到收银基址后：** 发我三样东西（阶段 5），再开生产开关。

---

*商户号 / 聚合服务商由创始人侧采购；产品侧只接 QR_BASE + 签名 webhook。*
