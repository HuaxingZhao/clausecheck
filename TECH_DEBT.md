# Tech Debt 登记

> 不阻塞当前上线 · 按优先级排期修复  
> 登记日期：2026-07-08

---

## TD-001 · user_id `::uuid` 强转与 TEXT schema 不一致

**背景：** `public.users.id`、`user_credits.user_id`、`orders.user_id` 等均为 **TEXT**。`lib/credits/` 已在 P0 修复；以下文件仍有残留。

**修复方式：** 移除 `user_id` / `redeemer_user_id` / `used_by` 相关 `::uuid`；保留 `orders.id`、`invite_codes.id` 等 **uuid 主键** 的 `::uuid`。

**预估总工时：** 2–3h（含本地 Postgres 回归 + admin/invite 流程手测）

---

### `lib/invite/codes.ts` — 16 处 · 优先级 P1 · 预估 1.5h · ✅ 已修复（2026-07-14 核实无残留）

- [x] L71 — `user_credits WHERE user_id = ${userId}::uuid`
- [x] L77 — `VALUES (${userId}::uuid, 3)`
- [x] L81 — `VALUES (${userId}::uuid, 3, 'register')`
- [x] L94 — `invite_codes WHERE user_id = ${userId}::uuid`
- [x] L105 — `VALUES (${userId}::uuid, ${code})`
- [x] L113 — `invite_codes WHERE user_id = ${userId}::uuid`
- [x] L135 — `invite_codes WHERE user_id = ${userId}::uuid`
- [x] L145 — `c.user_id = ${userId}::uuid`
- [x] L151 — `user_id = ${userId}::uuid`
- [x] L195 — `redeemer_user_id = ${input.redeemerUserId}::uuid`
- [x] L229 — `${input.redeemerUserId}::uuid`（invite_redemptions）
- [x] L238 — `used_by = ${input.redeemerUserId}::uuid`
- [x] L244 — `VALUES (${input.redeemerUserId}::uuid, …)`
- [x] L251 — `${input.redeemerUserId}::uuid`（credit_transactions）
- [x] L262 — `VALUES (${invite.userId}::uuid, …)`
- [x] L269 — `${invite.userId}::uuid`（credit_transactions）

> `invite.id` 现以参数绑定直传（无需 `::uuid`）；此前可保留的主键强转亦已不存在。

---

### `lib/admin/queries.ts` — 9 处 · 优先级 P1 · 预估 1h · ✅ 已修复（2026-07-14）

- [x] L166 — `uc.user_id = u.id::uuid`（JOIN）
- [x] L170 — `user_id = u.id::uuid`（子查询 orders）
- [x] L175 — `user_id = u.id::uuid`（子查询 transactions）
- [x] L203 — `user_id = ${userId}::uuid`
- [x] L228 — `user_id = ${input.userId}::uuid`
- [x] L241 — `VALUES (${input.userId}::uuid, ${next})`
- [x] L246 — `user_id = ${input.userId}::uuid`
- [x] L253 — `${input.userId}::uuid`（credit_transactions INSERT）
- [x] L292 — `u.id::uuid = o.user_id`（JOIN 类型不一致）

---

## 完成标准

- [x] 上述 25 处 user 相关 `::uuid` 全部移除
- [x] `grep -R 'user_id.*::uuid\|userId.*::uuid' lib/invite lib/admin` 无匹配
- [ ] `/invite` 兑换流程 + `/admin/users` 调额手测通过（代码 TD-001 已清；运维回归仍待勾）
