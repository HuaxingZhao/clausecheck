# 微信商户 / 中国转化 — 创始人行动清单

> **代码侧已就绪；本文件是商业侧必须由人完成的步骤。**  
> 技术细节：`docs/WECHAT_PAY_ENABLEMENT.md`

## 当前生产状态（2026-07-17）

| 项 | 状态 |
|----|------|
| Stripe 主结账 | ✅ |
| CNY Pro **预付**（Payment Element，可含 Stripe WeChat） | ✅ #38 |
| 定价页 CNY「人民币支付通道」咨询 CTA | ✅ #43（浏览器已核实） |
| `WECHAT_PAY_ENABLED` / `WECHAT_PAY_QR_BASE` | ⬜ **未配置（正确保持关闭）** |
| 独立加油包 WeChat topup UI | ⏸ 门控关闭，避免 503 |
| `ALLOW_MOCK_WECHAT_PAY` | ⬜ 未设（生产 mock-qr = 404） |

**结论：** 中国用户今天即可用 **Stripe CNY 预付**（卡 / 可能的微信钱包，视 Stripe 账号开通）或 **企业咨询**；独立商户收银是增量转化，不是上线阻断。

---

## 路径选择（二选一）

### A. 聚合 / 跨境收单（推荐海外主体）

适合新加坡等主体、尽快收人民币微信。

| # | 行动 | ☐ |
|---|------|---|
| 1 | 选定聚合商（如 Airwallex / Ping++ / 同类跨境收单）并完成 KYC | ☐ |
| 2 | 确认商户能力含 **微信扫码/H5 收款** | ☐ |
| 3 | 自建或让集成方提供 **HTTPS 收银适配页**，接受 `order_id` + `amount_cents` | ☐ |
| 4 | 适配页收款成功后 `POST /api/webhooks/payment`（HMAC：`PAYMENT_WEBHOOK_SECRET`） | ☐ |
| 5 | 把收银基址填入 Vercel `WECHAT_PAY_QR_BASE`（无 query） | ☐ |
| 6 | 设 `WECHAT_PAY_ENABLED=true` → Redeploy | ☐ |
| 7 | 按 `WECHAT_PAY_ENABLEMENT.md` 验收清单手测加油包 | ☐ |

### B. 大陆微信直连商户

需大陆营业执照 / 服务商代进件 → 自建收银页 → 同填 `WECHAT_PAY_QR_BASE`。周期通常更长。

---

## 启用前红线

- **未拿到可用 `WECHAT_PAY_QR_BASE` 前不要**设 `WECHAT_PAY_ENABLED=true`。
- **禁止**对真实流量开 `ALLOW_MOCK_WECHAT_PAY=1`。
- 主结账继续走 Stripe；独立 topup 仅加油包路径。

## 启用后一键恢复（代码已支持）

```text
WECHAT_PAY_QR_BASE=https://pay.example.com/wechat
WECHAT_PAY_ENABLED=true
# Redeploy → UI 恢复钱包文案（isWechatPayUiEnabled）
```

联系销售 / 对公：`support@clausecheck.cc`（咨询 CTA 已指向此通道）。
