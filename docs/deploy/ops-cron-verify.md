# Cron 密钥与任务抽查（运维）

> 生产：`https://www.clausecheck.cc`  
> 密钥：`CRON_SECRET`（Vercel Sensitive；**勿贴进聊天 / 勿提交仓库**）

## 2026-07-17 代理核查结果

| 检查 | 结果 |
|------|------|
| `vercel env ls` 可见 `CRON_SECRET`（Production + Preview） | ✅ |
| `vercel env pull` 读出密钥 | ❌ Sensitive，CLI 默认不下载（预期） |
| 无 `Authorization` 调 purge / renewal | ✅ 均 **401** `Unauthorized`（未裸奔） |
| `vercel.json` 两路 cron 已登记 | ✅ 小时 purge · 每日 01:00 UTC renewal |

## 你需要完成的一次正向抽查（约 2 分钟）

1. Vercel Dashboard → Project → **Settings → Environment Variables** → 打开 `CRON_SECRET`（Reveal）。  
   - 若该值曾在聊天里泄露过：**先 Rotate**（生成新值 → Save → Redeploy），再用新值抽查。
2. 本机（密钥只留在本机 shell，勿发给任何人）：

```bash
export CRON_SECRET='…'   # 从 Dashboard 粘贴，用完 unset
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  https://www.clausecheck.cc/api/cron/purge-contract-data
# 预期：JSON 含 ok / purged 类字段，非 Unauthorized

curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://www.clausecheck.cc/api/cron/pro-renewal-reminders
# 预期：JSON 成功（可 sent=0）；非 Unauthorized

unset CRON_SECRET
```

3. Vercel → **Cron Jobs**（或 Deployments → 函数日志）确认最近一次 scheduled 调用 **200**（Vercel 会自动带 Bearer）。

## 失败排查

| 现象 | 方向 |
|------|------|
| 手动 Bearer 仍 401 | Dashboard 与生产运行时密钥不一致 → Redeploy；确认未多空格 |
| 定时任务 401 | 未设 `CRON_SECRET` 或 Vercel 未注入（查 Cron 文档 / 项目 env） |
| renewal 无邮件 | 窗口内无 `pro_billing=prepaid` 用户；或账号无邮箱 |

## 相关代码

- 鉴权：`lib/privacy/cron-auth.ts`
- 硬删：`app/api/cron/purge-contract-data/route.ts`
- 续费提醒：`app/api/cron/pro-renewal-reminders/route.ts`
