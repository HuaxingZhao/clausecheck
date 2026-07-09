# 上线部署 Open Items 清单

> 最后更新：2026-07-09 · 部署前逐项勾选

---

## P0 阻断项（未通过则禁止部署应用代码）

| # | 项目 | 状态 | 说明 |
|---|------|------|------|
| **P0-DB-1** | **`consume_credit` TEXT 签名迁移** | ⬜ 待执行 | **必须先于代码部署** — 见下方 |
| **P0-DB-2** | **统一 `document_quota` 表迁移** | ⬜ 待执行 | Plan A 订阅配额 — 见下方 |

### P0-DB-1：`consume_credit` 迁移（部署顺序锁定）

```
① 在 Supabase / Neon SQL Editor 执行迁移脚本
   → supabase/migrations/20260712_fix_consume_credit_signature.sql

② 验证通过（任选其一）
   → npm run db:verify-consume-credit
   → 或 Dashboard 内看到 NOTICE: VERIFY OK

③ 部署 Vercel 新代码（git push / Redeploy）

④ 部署后冒烟
   → npm run verify:env
   → BASE_URL=https://www.clausecheck.cc npm run test:smoke
   → curl -s https://www.clausecheck.cc/api/health | jq '.checks.database.status'  # 预期 "ok"
```

**为什么阻断：** 新代码调用 `consume_credit(${userId})`（TEXT）。若库内仍为 `consume_credit(uuid)`，扫描扣费 RPC 会报错，用户无法消耗额度。

**操作指南（网页端）：** [docs/CONSUME_CREDIT_MIGRATION.md](./CONSUME_CREDIT_MIGRATION.md)

### P0-DB-2：统一 `document_quota` 迁移（Plan A 订阅配额）

```
① 在 Supabase / Neon SQL Editor 执行（P0-DB-1 之后）
   → supabase/migrations/20260713_unified_document_quota.sql

② 可选验证
   → SELECT pool_id, COUNT(*), SUM(quota_limit), SUM(used)
     FROM document_quota GROUP BY pool_id;

③ 部署 Vercel 新代码（git push / Redeploy）

④ Stripe Dashboard → Webhooks → 为生产 endpoint 追加事件：
   → invoice.payment_succeeded
   → payment_intent.succeeded
   → payment_method.attached
```

**为什么阻断：** 新代码通过 `document_quota` + `consume_document_quota` 扣减文档审阅配额；未迁移则登录用户扫描/订阅同步会失败或回退异常。

---

## P0 应用项（代码已就绪，随迁移后一起上线）

| # | 项目 | 状态 |
|---|------|------|
| P0-1 | `GET /api/user/credits` → `{ balance }` | ✅ |
| P0-2 | `GET /api/orders/[orderId]/status` | ✅ |
| P0-3 | `/dashboard` → `/account` 重定向 | ✅ |
| P0-6 | 环境变量校验 `npm run verify:env` | ✅ |
| P0-7 | 生产冒烟 `npm run test:smoke` | ✅ |

---

## P1 非阻断（可上线后处理）

| # | 项目 | 跟踪 |
|---|------|------|
| P1-1 | `lib/invite/codes.ts` user_id `::uuid` 残留（16 处） | [TECH_DEBT.md](../TECH_DEBT.md) |
| P1-2 | `lib/admin/queries.ts` user_id `::uuid` 残留（9 处） | [TECH_DEBT.md](../TECH_DEBT.md) |
| P1-3 | 生产环境变量 `PAYMENT_WEBHOOK_SECRET` / `ADMIN_EMAILS` | Vercel Dashboard |

---

## 环境变量部署前检查

```bash
npm run verify:env    # 本地 .env.local 或 CI secrets 须齐全
npm run deploy:prep   # 同上
```
