import type { ScanResult } from "./types";

/** Generate a standalone HTML report — no fonts, no layout math, just CSS. */
export function generateReportHtml(result: ScanResult): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClauseCheck · AI 合同风险报告</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;color:#1a1a2e;background:#f5f5f7;line-height:1.6}
  .report{max-width:780px;margin:0 auto;padding:56px 40px;background:#fff}
  @media print{body{background:#fff}.report{max-width:none;padding:40px 48px;box-shadow:none}}

  /* ── Header ── */
  .header{border-top:4px solid #e05a38;padding-top:32px;margin-bottom:40px}
  .header h1{font-size:28px;font-weight:700;letter-spacing:-0.5px}
  .header .sub{font-size:15px;color:#6b7280;margin-top:6px}
  .header .date{font-size:12px;color:#9ca3af;margin-top:8px}

  /* ── Score ── */
  .score-block{text-align:center;padding:40px 0;margin-bottom:32px}
  .score-num{font-size:72px;font-weight:800;letter-spacing:-2px}
  .score-label{font-size:22px;font-weight:700;margin-top:8px}
  .score-formula{font-size:13px;color:#6b7280;margin-top:10px}
  .score-high{color:#e05a38}
  .score-medium{color:#f5a623}
  .score-low{color:#2a9d8f}

  /* ── Section ── */
  .section{margin-bottom:36px}
  .section-title{font-size:18px;font-weight:700;padding-bottom:10px;margin-bottom:18px;border-bottom:1px solid #e5e7eb}
  .section-sub{font-size:13px;color:#9ca3af;margin-top:-10px;margin-bottom:16px}

  /* ── Dimension bars ── */
  .dim-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  .dim-label{width:90px;font-size:14px;flex-shrink:0}
  .dim-bar-wrap{flex:1;max-width:320px;height:18px;background:#f0f0f3;border-radius:9px;overflow:hidden;position:relative}
  .dim-bar-fill{height:100%;border-radius:9px;transition:width .4s}
  .dim-bar-fill.score-high{background:#e05a38}
  .dim-bar-fill.score-medium{background:#f5a623}
  .dim-bar-fill.score-low{background:#2a9d8f}
  .dim-val{font-size:14px;font-weight:700;width:36px;text-align:right}

  /* ── Risk cards ── */
  .flag-card{background:#fafafa;border-left:4px solid #e5e7eb;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:12px}
  .flag-card.high{border-left-color:#e05a38;background:#fef7f5}
  .flag-card.medium{border-left-color:#f5a623;background:#fffcf5}
  .flag-card.low{border-left-color:#2a9d8f;background:#f5fcfa}
  .flag-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .flag-badge{display:inline-flex;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;color:#fff;white-space:nowrap}
  .badge-high{background:#e05a38}
  .badge-medium{background:#f5a623}
  .badge-low{background:#2a9d8f}
  .flag-title{font-size:14px;font-weight:600}
  .flag-suggestion{font-size:13px;color:#6b7280;padding-left:10px;border-left:2px solid #e5e7eb;margin-left:4px}

  /* ── Time terms ── */
  .time-item{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;font-size:14px}
  .time-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px}
  .time-dot.high{background:#e05a38}
  .time-dot.medium{background:#f5a623}
  .time-dot.low{background:#2a9d8f}
  .time-date{color:#9ca3af;font-size:12px;margin-left:6px}

  /* ── Negotiations ── */
  .nego-card{background:#fafafa;border-radius:8px;padding:18px 20px 16px 20px;margin-bottom:14px}
  .nego-head{display:flex;align-items:center;gap:14px;margin-bottom:10px}
  .nego-num{width:28px;height:28px;border-radius:50%;background:#e05a38;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
  .nego-clause{font-size:14px;font-weight:600}
  .nego-detail{font-size:13px;line-height:1.7;margin-left:42px}
  .nego-current{color:#4b5563;margin-bottom:4px}
  .nego-suggested{color:#e05a38;font-weight:500;margin-bottom:4px}
  .nego-reason{color:#9ca3af;font-size:12px;font-style:italic}

  /* ── Summary ── */
  .summary-list{counter-reset:s;padding-left:0}
  .summary-item{font-size:14px;margin-bottom:8px;padding-left:24px;position:relative}
  .summary-item::before{counter-increment:s;content:counter(s);position:absolute;left:0;color:#e05a38;font-weight:600}

  /* ── Disclaimer ── */
  .disclaimer{border-top:1px solid #e5e7eb;padding-top:16px;margin-top:32px}
  .disclaimer h3{font-size:14px;font-weight:600;color:#6b7280;margin-bottom:4px}
  .disclaimer p{font-size:12px;color:#9ca3af;line-height:1.8}

  /* ── Footer ── */
  .footer{border-top:1px solid #e5e7eb;margin-top:36px;padding-top:16px;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}
</style>
</head>
<body>
<div class="report">
${renderHeader(result)}
${renderScore(result)}
${renderDimensions(result)}
${renderFlags(result.flags)}
${result.timeTerms?.length ? renderTimeTerms(result.timeTerms!) : ""}
${result.negotiations?.length ? renderNegotiations(result.negotiations) : ""}
${renderSummary(result)}
</div>
</body>
</html>`;
}

/* ── Header ── */
function renderHeader(r: ScanResult): string {
  const now = new Date();
  const ds = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return `<div class="header">
    <h1>ClauseCheck</h1>
    <div class="sub">AI 合同风险报告</div>
    <div class="date">生成时间：${ds}</div>
  </div>`;
}

/* ── Score ── */
function renderScore(r: ScanResult): string {
  const cls = r.scoreNum >= 70 ? "score-high" : r.scoreNum >= 40 ? "score-medium" : "score-low";
  return `<div class="score-block">
    <div class="score-num ${cls}">${r.scoreNum}</div>
    <div class="score-label ${cls}">${r.scoreText}</div>
    <div class="score-formula">加权公式：公平性 × 35% + 合规性 × 25% + 财务风险 × 40%</div>
  </div>`;
}

/* ── Dimensions ── */
function renderDimensions(r: ScanResult): string {
  if (!r.dimensions) return "";
  const dims = [
    { label: "合同公平性", val: r.dimensions.fairness },
    { label: "法律合规性", val: r.dimensions.compliance },
    { label: "财务风险",   val: r.dimensions.financial },
  ];
  const rows = dims.map(d => {
    const cls = d.val >= 70 ? "score-high" : d.val >= 40 ? "score-medium" : "score-low";
    return `<div class="dim-row">
      <span class="dim-label">${d.label}</span>
      <div class="dim-bar-wrap"><div class="dim-bar-fill ${cls}" style="width:${d.val}%"></div></div>
      <span class="dim-val ${cls}">${d.val}</span>
    </div>`;
  }).join("");
  return `<div class="section">
    <div class="section-title">分维度风险评分</div>
    ${rows}
    <div class="section-sub">分数越高 = 该维度风险越大。建议优先关注红色维度。</div>
  </div>`;
}

/* ── Risk Flags ── */
function renderFlags(flags: ScanResult["flags"]): string {
  const cards = flags.map(f => {
    const lvl = f.level || "medium";
    const lvlLabel = lvl === "high" ? "高风险" : lvl === "low" ? "低风险" : "中风险";
    const icon = safeIcon(f.icon);
    const title = `${icon} ${f.text}` + (f.category ? `（${f.category}）` : "");
    const sug = f.suggestion ? `<div class="flag-suggestion">${f.suggestion}</div>` : "";
    return `<div class="flag-card ${lvl}">
      <div class="flag-head">
        <span class="flag-badge badge-${lvl}">${lvlLabel}</span>
        <span class="flag-title">${title}</span>
      </div>
      ${sug}
    </div>`;
  }).join("");
  return `<div class="section">
    <div class="section-title">发现 ${flags.length} 个需关注条款</div>
    ${cards}
  </div>`;
}

/* ── Time Terms ── */
function renderTimeTerms(terms: ScanResult["timeTerms"]): string {
  const labels: Record<string, string> = {
    auto_renewal: "自动续期", deadline: "截止日期",
    expiration: "到期/失效", notice_period: "通知期",
  };
  const items = terms.map(t => {
    const date = t.date ? `<span class="time-date">· ${t.date}</span>` : "";
    return `<div class="time-item">
      <span class="time-dot ${t.risk}"></span>
      <span>${labels[t.type] || t.type} ${t.description}${date}</span>
    </div>`;
  }).join("");
  return `<div class="section">
    <div class="section-title">时间敏感条款</div>
    ${items}
  </div>`;
}

/* ── Negotiations ── */
function renderNegotiations(nego: ScanResult["negotiations"]): string {
  if (!nego) return "";
  const cards = nego.map(n => {
    return `<div class="nego-card">
      <div class="nego-head">
        <div class="nego-num">${n.priority}</div>
        <div class="nego-clause">${n.clause}</div>
      </div>
      <div class="nego-detail">
        <div class="nego-current">当前表述：${n.current}</div>
        <div class="nego-suggested">建议改为：${n.suggested}</div>
        <div class="nego-reason">${n.reason}</div>
      </div>
    </div>`;
  }).join("");
  return `<div class="section">
    <div class="section-title">谈判优先级</div>
    ${cards}
  </div>`;
}

/* ── Summary ── */
function renderSummary(r: ScanResult): string {
  const parts = r.summary.split(/\d+\.\s+/).filter(Boolean);
  const items = parts.map((p, i) => `<div class="summary-item">${p.trim()}</div>`).join("");
  return `<div class="section">
    <div class="section-title">综合评估与行动建议</div>
    <div class="summary-list">${items}</div>
    <div class="disclaimer">
      <h3>免责声明</h3>
      <p>本报告由 AI 自动生成，仅供参考，不构成法律意见。涉及重大利益的合同，建议咨询专业律师。ClauseCheck 不对因使用本报告而产生的任何损失承担责任。</p>
    </div>
    <div class="footer">
      <span>ClauseCheck · AI 合同风险报告</span>
      <span>${new Date().toISOString().slice(0, 10)}</span>
    </div>
  </div>`;
}

/** Keep emoji characters but sanitize anything weird. */
function safeIcon(s: string): string {
  // Strip zero-width joiners, variation selectors
  return s.replace(/[\u200d\ufe0f]/g, "").trim() || "●";
}
