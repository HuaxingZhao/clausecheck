# Tech Debt 登记

> 不阻塞当前上线 · 按优先级排期修复  
> 登记日期：2026-07-08

---

## TD-001 · user_id `::uuid` 强转与 TEXT schema 不一致

**背景：** `public.users.id`、`user_credits.user_id`、`orders.user_id` 等均为 **TEXT**。`lib/credits/` 已在 P0 修复；以下文件仍有残留。

**修复方式：** 移除 `user_id` / `redeemer_user_id` / `used_by` 相关 `::uuid`；保留 `orders.id`、`invite_codes.id` 等 **uuid 主键** 的 `::uuid`。

**预估总工时：** 2–3h（含本地 Postgres 回归 + admin/invite 流程手测）

---

### `lib/invite/codes.ts` — 16 处 · 优先级 P1 · 预估 1.5h

- [ ] L71 — `user_credits WHERE user_id = ${userId}::uuid`
- [ ] L77 — `VALUES (${userId}::uuid, 3)`
- [ ] L81 — `VALUES (${userId}::uuid, 3, 'register')`
- [ ] L94 — `invite_codes WHERE user_id = ${userId}::uuid`
- [ ] L105 — `VALUES (${userId}::uuid, ${code})`
- [ ] L113 — `invite_codes WHERE user_id = ${userId}::uuid`
- [ ] L135 — `invite_codes WHERE user_id = ${userId}::uuid`
- [ ] L145 — `c.user_id = ${userId}::uuid`
- [ ] L151 — `user_id = ${userId}::uuid`
- [ ] L195 — `redeemer_user_id = ${input.redeemerUserId}::uuid`
- [ ] L229 — `${input.redeemerUserId}::uuid`（invite_redemptions）
- [ ] L238 — `used_by = ${input.redeemerUserId}::uuid`
- [ ] L244 — `VALUES (${input.redeemerUserId}::uuid, …)`
- [ ] L251 — `${input.redeemerUserId}::uuid`（credit_transactions）
- [ ] L262 — `VALUES (${invite.userId}::uuid, …)`
- [ ] L269 — `${invite.userId}::uuid`（credit_transactions）

> L228、L239 的 `${invite.id}::uuid` 为 uuid 主键，**可保留**。

---

### `lib/admin/queries.ts` — 9 处 · 优先级 P1 · 预估 1h

- [ ] L166 — `uc.user_id = u.id::uuid`（JOIN）
- [ ] L170 — `user_id = u.id::uuid`（子查询 orders）
- [ ] L175 — `user_id = u.id::uuid`（子查询 transactions）
- [ ] L203 — `user_id = ${userId}::uuid`
- [ ] L228 — `user_id = ${input.userId}::uuid`
- [ ] L241 — `VALUES (${input.userId}::uuid, ${next})`
- [ ] L246 — `user_id = ${input.userId}::uuid`
- [ ] L253 — `${input.userId}::uuid`（credit_transactions INSERT）
- [ ] L292 — `u.id::uuid = o.user_id`（JOIN 类型不一致）

---

## 完成标准

- [ ] 上述 25 处 user 相关 `::uuid` 全部移除
- [ ] `grep -R 'user_id.*::uuid\|userId.*::uuid' lib/invite lib/admin` 无匹配
- [ ] `/invite` 兑换流程 + `/admin/users` 调额手测通过
