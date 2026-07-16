# 微信支付加油包 — 启用清单

**状态（2026-07-16）：** 代码就绪；**生产未开**（缺商户收银 URL）。  
**主结账仍走 Stripe。** 本清单只覆盖加油包 WeChat topup。

---

## 架构（已实现）

```text
定价页 CNY
  → WECHAT_PAY_ENABLED=true 且 WECHAT_PAY_QR_BASE 已配
  → 展示微信/钱包入口
  → POST /api/credits/topup → 创建 pending order
  → paymentUrl = WECHAT_PAY_QR_BASE?order_id=&amount_cents=
  → 商户收银完成后回调
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

## 你需要提供 / 配置的内容

1. **微信商户或聚合收银**可打开的收银台 URL（HTTPS），能接收：
   - `order_id`（UUID）
   - `amount_cents`（整数分）
2. 收银成功后由商户侧（或中间件）向  
   `https://www.clausecheck.cc/api/webhooks/payment`  
   `POST` JSON，并用 `PAYMENT_WEBHOOK_SECRET` 做 HMAC-SHA256，放在头 `x-payment-signature`（可带 `sha256=` 前缀）。

### Webhook body

```json
{
  "order_id": "<uuid>",
  "provider_trade_no": "<微信/渠道交易号>",
  "status": "success",
  "amount_cents": 9900
}
```

签名：`HMAC-SHA256(rawBody, PAYMENT_WEBHOOK_SECRET)` → hex。

---

## Vercel 启用顺序（有收银 URL 后再做）

```bash
# 1) 配收银与密钥（Production）
vercel env add WECHAT_PAY_QR_BASE production
vercel env add WECHAT_PAY_ENABLED production   # 值：true
# PAYMENT_WEBHOOK_SECRET 若已有可跳过；没有则先加

# 2) 重新部署
vercel --prod

# 3) 冒烟
# - /zh/pricing CNY：出现微信入口（非「人民币咨询」CTA）
# - topup 不再 503
# - 用测试单走完 webhook → 配额到账
# - GET /api/webhooks/payment/mock-qr 仍为 404
```

**未拿到 `WECHAT_PAY_QR_BASE` 前不要设 `WECHAT_PAY_ENABLED=true`。**

---

## 验收

- [ ] `WECHAT_PAY_QR_BASE` 指向真实收银（非 mock）
- [ ] `WECHAT_PAY_ENABLED=true` 已部署
- [ ] `PAYMENT_WEBHOOK_SECRET` 已配且商户回调验签通过
- [ ] 加油包支付成功 → `orders.status=paid` + 配额增加
- [ ] `ALLOW_MOCK_WECHAT_PAY` 未在生产开启
- [ ] mock-qr 生产仍 404

---

*商户号 / 聚合服务商由创始人侧采购；产品侧只接 QR_BASE + 签名 webhook。*
