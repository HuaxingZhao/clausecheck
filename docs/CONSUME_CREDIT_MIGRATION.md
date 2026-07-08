# consume_credit 迁移 — Supabase Dashboard 傻瓜式操作指南

> 适用：只有网页端权限、不使用 CLI 的同学  
> 数据库：Supabase 或 **Neon**（Neon 的 SQL Editor 步骤完全相同，只是入口名称不同）

---

## 你需要准备

1. 数据库 Dashboard 登录账号（Supabase 或 Neon）
2. 本仓库文件：`supabase/migrations/20260712_fix_consume_credit_signature.sql`（全文复制）

---

## 第一步：登录 Dashboard

### Supabase

1. 浏览器打开 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 点击你的 **Organization**（组织名）
3. 在项目列表中点击 **ClauseCheck 对应的项目**

**预期界面：** 左侧出现竖排菜单（Home、Table Editor、SQL Editor、…）

### Neon（若你用的是 Neon 而非 Supabase）

1. 打开 [https://console.neon.tech](https://console.neon.tech)
2. 进入项目 → 左侧 **SQL Editor**

---



## 第二步：打开 SQL Editor



### Supabase

1. 左侧菜单找到 **SQL Editor**（图标像 `</>` 或「终端」）
2. 点击进入

**预期界面：** 中间有大文本框（可写 SQL），右上角有绿色 **Run** 按钮

### Neon

1. 左侧 **SQL Editor** → **New query**

---



## 第三步：粘贴迁移脚本

1. 在本机用 Cursor / VS Code 打开：
  ```
   supabase/migrations/20260712_fix_consume_credit_signature.sql
  ```
2. **全选**（Mac: `Cmd+A`）→ **复制**（`Cmd+C`）
3. 回到 Dashboard SQL Editor，**清空**文本框内旧内容
4. **粘贴**（`Cmd+V`）整段 SQL

**预期界面：** 文本框内从 `-- =============================================================================` 开始，到 `COMMIT;` 结束（约 90 行）。底部 ROLLBACK 注释块可保留，不会执行。

---



## 第四步：运行

1. 点击右上角绿色 **Run**（Supabase）或 **Execute**（Neon）
2. 等待 1–5 秒

---



## 第五步：看结果 — 成功 vs 失败



### ✅ 成功时你应该看到


| 位置              | 预期内容                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------- |
| 结果面板 / Messages | `NOTICE: VERIFY OK: consume_credit(p_user_id text) is active; consume_credit(uuid) removed` |
| 状态              | **Success** / **Completed** / 无红色 Error                                                     |
| 可选二次确认          | 新建查询，粘贴下方「验证查询」，Run 后 **仅 1 行**                                                             |


**验证查询（可选，单独 Run）：**

```sql
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'consume_credit';
```


| function_name  | arguments      | security         |
| -------------- | -------------- | ---------------- |
| consume_credit | p_user_id text | SECURITY DEFINER |




### 本地一条命令验证（有 DATABASE_URL 时）

在项目根目录终端：

```bash
npm run db:verify-consume-credit
```

**成功输出：**

```
✅ consume_credit(p_user_id text) verified (SECURITY DEFINER)
   Safe to deploy application code that calls consume_credit with TEXT user_id.
```



### ❌ 失败时你应该看到


| 错误示例                                                      | 含义                      |
| --------------------------------------------------------- | ----------------------- |
| `VERIFY FAILED: consume_credit(p_user_id text) not found` | 函数未创建成功                 |
| `permission denied`                                       | 当前账号无 DDL 权限，换 Owner 账号 |
| `syntax error at or near ...`                             | 粘贴不完整，重新全选复制            |
| 红色 **Error** 横幅                                           | 整个事务已回滚，数据库未被部分修改       |


**如何反馈给我：**

1. 截图 **完整 SQL Editor**（含粘贴的 SQL 末尾 `COMMIT;`）
2. 截图 **错误信息面板**（红色 Error 全文）
3. 说明用的是 Supabase 还是 Neon

---



## 第六步：部署顺序（重要）

```
✅ SQL 迁移成功
    ↓
✅ npm run db:verify-consume-credit 通过（或 Dashboard 验证查询 1 行）
    ↓
🚀 部署 Vercel 新代码
    ↓
curl -s https://www.clausecheck.cc/api/health
    → checks.database.status 应为 "ok"
```

**禁止顺序：** 先部署代码、后跑 SQL → 扫描扣费可能报错。

---



## 重复执行安全吗？

**可以。** 脚本设计为幂等：

- `DROP FUNCTION IF EXISTS consume_credit(uuid)` — 没有旧函数也不报错
- `CREATE OR REPLACE consume_credit(text)` — 已有则覆盖
- 末尾验证块 — 不对则整事务回滚

---



## 回滚（仅紧急需要）

见迁移文件底部 `ROLLBACK` 注释块。回滚后**必须**同时部署仍使用 `consume_credit(uuid)` 的旧版应用，否则不要回滚。