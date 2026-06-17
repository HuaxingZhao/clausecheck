# ClauseCheck — AI 合同风险扫描

上传 PDF / DOCX 合同，AI 逐条分析风险条款，3 分钟出报告。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（不填也能跑，用 demo 数据）
cp env.example .env
# 编辑 .env 填入 OPENAI_API_KEY

# 3. 启动开发服务器
npm run dev
# → 浏览器打开 http://localhost:3000
```

> **不需要 OpenAI Key 也能预览 UI**：代码内置了 demo 数据，前端可以直接看到完整效果。

## 项目结构

```
clausecheck/
├── app/
│   ├── api/
│   │   ├── extract/route.ts   # PDF / DOCX 文本提取
│   │   └── scan/route.ts      # 合同分析 API
│   ├── globals.css            # Tailwind + 自定义样式
│   ├── layout.tsx             # 根布局
│   └── page.tsx               # 主页（hero + 上传 + 结果 + 定价 + FAQ）
├── lib/
│   ├── types.ts               # 类型定义
│   ├── extract-text.ts        # 文本提取逻辑
│   └── analyze.ts             # AI 分析 + demo 模式
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
└── env.example
```

## 技术栈

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** — 暖色系合同风格
- **OpenAI API** — gpt-4o-mini 做合同分析
- **pdf-parse** + **mammoth** — PDF / DOCX 文本提取

## 如何接 Stripe 收钱

1. 去 [Stripe](https://stripe.com) 注册（可个人，无需公司）
2. 创建 Payment Link（产品 → Payment Links → Create）
3. 把链接填入 `.env` 的 `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`
4. 定价页面按钮自动跳转到 Stripe 付款

## 部署 (Vercel)

```bash
# 推送到 GitHub 后：
# 1. vercel.com → 导入 repo
# 2. 环境变量填 OPENAI_API_KEY
# 3. Deploy → 获取公开域名
```

## License

MIT
