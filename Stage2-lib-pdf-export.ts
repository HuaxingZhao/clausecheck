import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib";
import type { ScanResult } from "./types";

// ── Color palette ──
const COLORS = {
  primary: rgb(0.07, 0.06, 0.16),    // 深色文字
  accent: rgb(0.93, 0.32, 0.22),      // 红色强调
  accentDark: rgb(0.75, 0.18, 0.12),
  medium: rgb(0.96, 0.65, 0.14),      // 中风险黄
  low: rgb(0.16, 0.67, 0.42),         // 低风险绿
  muted: rgb(0.55, 0.55, 0.6),
  lightBg: rgb(0.96, 0.96, 0.98),
  white: rgb(1, 1, 1),
  border: rgb(0.88, 0.88, 0.92),
};

const riskColorMap: Record<string, ReturnType<typeof rgb>> = {
  high: COLORS.accent,
  medium: COLORS.medium,
  low: COLORS.low,
};

const riskLabelZh: Record<string, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
};

const timeTypeLabels: Record<string, string> = {
  auto_renewal: "自动续约",
  deadline: "硬性截止日",
  expiration: "到期/失效",
  notice_period: "通知期限",
};

const timeTypeIcons: Record<string, string> = {
  auto_renewal: "🔄",
  deadline: "⏰",
  expiration: "📅",
  notice_period: "📬",
};

// ── Helpers ──
function hexToRgb(hex: string) {
  const v = parseInt(hex.replace("#", ""), 16);
  return rgb(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

const scoreColorMap: Record<string, ReturnType<typeof rgb>> = {
  high: COLORS.accent,
  medium: COLORS.medium,
  low: COLORS.low,
};

export async function generateReportPdf(result: ScanResult): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { width, height } = PageSizes.A4;
  const margin = 50;
  const contentW = width - margin * 2;

  // ── Fonts ──
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ── Paging helpers ──
  let page = doc.addPage([width, height]);
  let y = height - 60;
  const lineH = 16;
  const paraGap = 10;

  function ensureSpace(needed: number) {
    if (y - needed < margin + 30) {
      page = doc.addPage([width, height]);
      y = height - 60;
      // Footer
      drawFooter(page, font);
    }
  }

  function drawFooter(p: typeof page, f: typeof font) {
    const pageNum = doc.getPages().indexOf(p) + 1;
    p.drawText(`ClauseCheck · AI 合同风险报告 · 第 ${pageNum} 页`, {
      x: margin,
      y: 20,
      size: 8,
      font: f,
      color: COLORS.muted,
    });
    p.drawText(`${new Date().toISOString().slice(0, 10)}`, {
      x: width - margin - 70,
      y: 20,
      size: 8,
      font: f,
      color: COLORS.muted,
    });
  }

  function drawText(
    text: string,
    opts: { size?: number; color?: ReturnType<typeof rgb>; bold?: boolean; oblique?: boolean; maxWidth?: number } = {}
  ) {
    const { size = 10, color = COLORS.primary, bold = false, oblique = false, maxWidth = contentW } = opts;
    const f = bold ? fontBold : oblique ? fontOblique : font;
    const lines = wrapText(text, f, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 4;
    }
  }

  function wrapText(text: string, f: typeof font, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (!paragraph) { lines.push(""); continue; }
      const words = paragraph.split("");
      let current = "";
      for (const ch of words) {
        const test = current + ch;
        if (f.widthOfTextAtSize(test, size) > maxWidth && current.length > 0) {
          lines.push(current);
          current = ch;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  function drawHorizRule(yPos: number) {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: COLORS.border,
    });
  }

  function drawRoundedRect(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>, radius = 4) {
    page.drawRectangle({ x, y: y - h, width: w, height: h, color });
  }

  function drawRect(x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
    page.drawRectangle({ x, y: y - h, width: w, height: h, color });
  }

  // ═══════════════════════════════════════════
  //  PAGE 1:  COVER / SUMMARY
  // ═══════════════════════════════════════════

  // Header bar
  drawRect(0, height, width, 4, COLORS.accent);

  // Title
  y = height - 100;
  drawText("ClauseCheck", { size: 22, bold: true, color: COLORS.accent });
  y -= 6;
  drawText("AI 合同风险报告", { size: 16, bold: true });
  y -= 24;
  drawHorizRule(y);
  y -= 20;

  // Generated date
  drawText(`生成时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`, { size: 9, color: COLORS.muted });
  y -= 20;

  // ── Overall Score ──
  ensureSpace(80);
  const riskKey = result.scoreText.includes("高") ? "high" : result.scoreText.includes("中") ? "medium" : "low";
  const scoreColor = scoreColorMap[riskKey] || COLORS.muted;

  // Score circle (simulated)
  const circleX = margin + 30;
  const circleY = y - 30;
  drawText("综合风险评分", { size: 11, bold: true });
  y -= 18;
  drawText(`${result.scoreNum}`, { size: 42, bold: true, color: scoreColor });
  y -= 6;
  drawText(result.scoreText, { size: 13, bold: true, color: scoreColor });
  y -= 10;
  drawText("加权公式：公平性 ×35% + 合规性 ×25% + 财务风险 ×40%", { size: 8, color: COLORS.muted });
  y -= 18;

  // ── Dimension Scores ──
  if (result.dimensions) {
    drawHorizRule(y);
    y -= 16;
    drawText("分维度风险评分", { size: 11, bold: true });
    y -= 14;

    const dims = [
      { label: "合同公平性", value: result.dimensions.fairness, kind: "fairness" as const },
      { label: "法律合规性", value: result.dimensions.compliance, kind: "compliance" as const },
      { label: "财务风险", value: result.dimensions.financial, kind: "financial" as const },
    ];
    const dimColors: Record<string, ReturnType<typeof rgb>> = {
      fairness: COLORS.accent,
      compliance: rgb(0.2, 0.4, 0.75),
      financial: COLORS.medium,
    };

    for (const dim of dims) {
      const dimC = dimColors[dim.kind] || COLORS.primary;
      ensureSpace(30);
      drawText(dim.label, { size: 9, color: COLORS.primary });
      // Bar
      const barX = margin + 80;
      const barW = contentW - 120;
      const barH = 12;
      const barY = y + 6;
      drawRoundedRect(barX, barY, barW, barH, COLORS.lightBg);
      const fillW = (dim.value / 100) * barW;
      if (fillW > 0) drawRoundedRect(barX, barY, fillW, barH, dimC);
      // Value text
      page.drawText(`${dim.value}`, {
        x: barX + barW + 8,
        y: barY - barH + 2,
        size: 9,
        font: fontBold,
        color: dimC,
      });
      y -= 22;
    }
    y -= 6;
    drawText("分数越高 = 该维度风险越大。建议优先关注红色维度。", { size: 8, color: COLORS.muted });
    y -= 14;
  }

  // ═══════════════════════════════════════════
  //  PAGE 2+:  RISK FLAGS
  // ═══════════════════════════════════════════

  ensureSpace(40);
  drawHorizRule(y);
  y -= 16;
  drawText(`发现 ${result.flags.length} 个需关注条款`, { size: 13, bold: true });
  y -= 18;

  for (const flag of result.flags) {
    const lvl = flag.level || "medium";
    const flagColor = riskColorMap[lvl] || COLORS.medium;
    const needed = 60;
    ensureSpace(needed);

    // Icon + text
    drawText(`${flag.icon || "⚠️"}  ${flag.text}`, { size: 10, bold: true, maxWidth: contentW - 60 });
    // Level badge
    const badgeX = width - margin - 60;
    const badgeY = y + 14;
    drawRoundedRect(badgeX, badgeY, 50, 16, flagColor);
    page.drawText(riskLabelZh[lvl], {
      x: badgeX + (lvl === "high" ? 8 : 5),
      y: badgeY - 13,
      size: 8,
      font: fontBold,
      color: COLORS.white,
    });

    if (flag.suggestion) {
      y -= 2;
      drawText(`💡 ${flag.suggestion}`, { size: 9, color: COLORS.muted, maxWidth: contentW - 10 });
    }
    if (flag.category) {
      y -= 2;
      drawText(`类别：${flag.category}`, { size: 8, color: COLORS.muted, oblique: true });
    }
    y -= 12;
  }

  // ═══════════════════════════════════════════
  //  TIME TERMS
  // ═══════════════════════════════════════════
  if (result.timeTerms && result.timeTerms.length > 0) {
    ensureSpace(40);
    drawHorizRule(y);
    y -= 16;
    drawText("⏱️ 时间敏感条款", { size: 13, bold: true });
    y -= 16;

    for (const t of result.timeTerms) {
      ensureSpace(36);
      const icon = timeTypeIcons[t.type] || "📌";
      const label = timeTypeLabels[t.type] || t.type;
      const tc = riskColorMap[t.risk] || COLORS.medium;
      drawText(`${icon}  ${label}`, { size: 10, bold: true, color: tc });
      drawText(t.description, { size: 9, color: COLORS.primary, maxWidth: contentW - 10 });
      if (t.date) {
        drawText(`日期：${t.date}`, { size: 8, color: COLORS.muted });
      }
      y -= 10;
    }
  }

  // ═══════════════════════════════════════════
  //  NEGOTIATIONS
  // ═══════════════════════════════════════════
  if (result.negotiations && result.negotiations.length > 0) {
    ensureSpace(40);
    drawHorizRule(y);
    y -= 16;
    drawText("谈判优先级", { size: 13, bold: true });
    y -= 16;

    for (const n of result.negotiations) {
      ensureSpace(60);
      // Priority number
      const nx = margin;
      const ny = y + 2;
      drawRoundedRect(nx, ny, 22, 22, COLORS.accent);
      page.drawText(`${n.priority}`, {
        x: nx + (n.priority >= 10 ? 3 : 7),
        y: ny - 17,
        size: 13,
        font: fontBold,
        color: COLORS.white,
      });

      drawText(n.clause, { size: 10, bold: true, maxWidth: contentW - 30 });
      drawText(`当前表述：${n.current}`, { size: 9, color: COLORS.muted, maxWidth: contentW - 20 });
      drawText(`建议改为：${n.suggested}`, { size: 9, bold: true, color: COLORS.accentDark, maxWidth: contentW - 20 });
      drawText(`💬 ${n.reason}`, { size: 8, color: COLORS.muted, maxWidth: contentW - 20 });
      y -= 12;
    }
  }

  // ═══════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════
  ensureSpace(40);
  drawHorizRule(y);
  y -= 16;
  drawText("综合评估与行动建议", { size: 13, bold: true });
  y -= 16;
  drawText(result.summary, { size: 10, maxWidth: contentW });

  // ── Footer on all pages ──
  for (const p of doc.getPages()) {
    drawFooter(p, font);
  }

  // ── Disclaimer on last page ──
  ensureSpace(40);
  drawHorizRule(y);
  y -= 12;
  drawText("免责声明", { size: 9, bold: true, color: COLORS.muted });
  drawText(
    "本报告由 AI 自动生成，仅供参考，不构成法律意见。涉及重大利益的合同，建议咨询专业律师。ClauseCheck 不对因使用本报告而产生的任何损失承担责任。",
    { size: 8, color: COLORS.muted, maxWidth: contentW }
  );

  return doc.save();
}
