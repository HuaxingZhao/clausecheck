# Plan A — Tiered Subscription Pricing

ClauseCheck Plan A pricing is defined in **`lib/pricing.config.ts`** (single source of truth). Do not hardcode prices elsewhere.

## Phase 1 scope (current)

| Plan | Card | Checkout | Notes |
|------|------|----------|-------|
| Trial | ✅ | ❌ | Start free — scroll to upload |
| Pro | ✅ | ✅ | Stripe Payment Element; monthly/annual |
| Team | ✅ placeholder | ❌ | Prices shown; CTA opens guidance dialog only |
| Enterprise | ✅ placeholder | ❌ | No form submission; email guidance only |
| Add-on | ✅ | ✅ | Pro-tier quota exhausted only |

`checkoutEnabled` in `pricing.config.ts` gates all server routes. Team/Enterprise fields are reserved for phase 2.

## Plans

| Plan | USD/mo | CNY/mo | Quota / cycle |
|------|--------|--------|---------------|
| Trial | $0 | ¥0 | 1 |
| Pro | $29 | ¥199 | 10 |
| Team | $79 | ¥499 | 30 |
| Add-on | $5 | ¥39 | +1 per pack |
| Enterprise | Contact sales | Contact sales | Custom |

- **CNY_RATE** = 7.25 (fixed display/reference; list prices are explicit in config)
- **ANNUAL_DISCOUNT** = 0.85 (annual billing default ON → 15% off vs monthly)
- Quotas reset on **subscription anniversary** (stored as ISO `resetDate` in `usePricingStore` persist)

## UI components

Located under `app/[locale]/components/pricing/`:

1. **PricingToggle** — monthly / annual (default annual) with savings badge
2. **PlanCard** — plan details; Pro recommended; Enterprise contact-only
3. **QuotaMeter** — progress bar; amber ≥80%; red at 100% → add-on entry
4. **AddOnModal** — quota exhausted only; +1 / +5 / +10 packs
5. **CurrencySelector** — USD / CNY; CNY shows WeChat/Alipay note
6. **ContactSalesForm** — Enterprise lead form (no prices)
7. **PaymentGateway** — Stripe Payment Element wrapper

Banned UI copy: *token*, *unlimited*, *credits* → use **文档审阅配额 / 分配额度 / 许可量** (or EN equivalents). Use **Trial**, not “免费层”.

## Payment method restrictions

All checkout uses **Stripe Payment Element** (`PaymentGateway`). Methods are filtered server-side via `getPaymentMethodTypes()` in `pricing.config.ts`.

### USD / CNY subscriptions

| Purchase | Billing | Server-side types | Payment Element |
|----------|---------|-------------------|-----------------|
| Pro subscription | Monthly / Annual | `card` only | Apple Pay, Google Pay, Link, WeChat, etc. when **enabled in [Stripe Dashboard](https://dashboard.stripe.com/settings/payment_methods)** |

We intentionally do **not** pass `us_bank_account`, `wechat_pay`, or `alipay` in subscription `payment_settings` unless your Stripe account has them activated — otherwise checkout fails with “payment method type is invalid”.

### CNY add-ons

One-time add-ons use `automatic_payment_methods` on PaymentIntent — Stripe shows whatever is enabled on your account.

### Client quota gate

Add-on checkout is blocked client-side unless `usedQuota >= quotaLimit` (`canPurchaseAddOn`).

## API

| Route | Purpose |
|-------|---------|
| `POST /api/stripe/create-intent` | Payment Element — subscription or add-on PaymentIntent |
| `POST /api/checkout` | Legacy Stripe Checkout redirect (prices from config) |
| `POST /api/contact/sales` | Enterprise contact form |

## Store

`stores/usePricingStore.ts` — Zustand + `persist` (localStorage), hydration-safe via `_hasHydrated`.

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payment Element in browser (`pk_live_` / `pk_test_`) |
| `STRIPE_SECRET_KEY` | `create-intent` / webhooks (server only) |

See [DEPLOY.md](./DEPLOY.md) for Vercel setup. Redeploy after adding `NEXT_PUBLIC_*` vars.

## Tests

```bash
node --import tsx --test lib/pricing.config.test.ts
npm run build
```
