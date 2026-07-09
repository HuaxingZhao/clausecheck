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

### USD

| Purchase | Billing | Allowed methods |
|----------|---------|-----------------|
| Pro / Team subscription | Monthly | Card, Link, US bank transfer |
| Pro subscription | Annual | Card, Link, US bank transfer |
| Add-on packs | One-time | Card, Link, US bank transfer |

### CNY

| Purchase | Billing | Allowed methods |
|----------|---------|-----------------|
| Pro subscription | **Monthly** | **Card only** |
| Pro subscription | **Annual** | Card, **WeChat Pay**, **Alipay** |
| Add-on packs | One-time | Card, **WeChat Pay**, **Alipay** |

**Monthly CNY + wallet:** WeChat/Alipay are not offered on monthly subscriptions. Users may pay monthly with card, or switch to **annual** billing to use WeChat/Alipay. The currency selector shows this note; add-ons always allow wallet methods in CNY.

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
