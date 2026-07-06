import type { ContractChange, LockedReviewItem, ScanResult } from "./types";

export interface NegotiationEmailInput {
  result: ScanResult;
  changes: ContractChange[];
  acceptedItems: LockedReviewItem[];
  locale: "zh" | "en";
  fileName?: string | null;
}

export function buildNegotiationEmail(input: NegotiationEmailInput): string {
  const { result, changes, acceptedItems, locale, fileName } = input;
  const isZh = locale === "zh";

  const signing =
    result.signingRecommendation === "sign"
      ? isZh
        ? "原则上可签署"
        : "Generally acceptable to sign"
      : result.signingRecommendation === "sign_with_changes"
        ? isZh
          ? "建议修改后签署"
          : "Sign after agreed changes"
        : isZh
          ? "不建议按现版本签署"
          : "Do not sign as drafted";

  const lines: string[] = [];

  if (isZh) {
    lines.push("主题：关于合同修订建议的函");
    lines.push("");
    lines.push("尊敬的对方：");
    lines.push("");
    lines.push(
      `感谢贵方提供${fileName ? `《${fileName.replace(/\.[^.]+$/, "")}》` : "合同草案"}。我方已完成审阅，现就以下条款提出修订建议，供贵方考虑：`
    );
    lines.push("");
    lines.push(`【审阅结论】${signing}`);
    if (result.signingRationale) lines.push(result.signingRationale);
    lines.push("");
    lines.push(`【建议修改事项】共 ${changes.length} 条`);
  } else {
    lines.push("Subject: Proposed contract revisions");
    lines.push("");
    lines.push("Dear Counterparty,");
    lines.push("");
    lines.push(
      `Thank you for sharing ${fileName ? `"${fileName}"` : "the draft agreement"}. After review, we propose the following revisions:`
    );
    lines.push("");
    lines.push(`[Conclusion] ${signing}`);
    if (result.signingRationale) lines.push(result.signingRationale);
    lines.push("");
    lines.push(`[Proposed changes] ${changes.length} item(s)`);
  }

  changes.forEach((ch, i) => {
    const item = acceptedItems[i];
    const num = i + 1;
    lines.push("");
    if (isZh) {
      lines.push(`${num}. ${ch.section || "相关条款"}`);
      if (ch.original) {
        lines.push(`   原文：「${ch.original}」`);
        lines.push(`   建议修改为：「${ch.revised}」`);
      } else {
        lines.push(`   建议新增：「${ch.revised}」`);
      }
      if (ch.reason) lines.push(`   理由：${ch.reason}`);
    } else {
      lines.push(`${num}. ${ch.section || "Relevant clause"}`);
      if (ch.original) {
        lines.push(`   Current: "${ch.original}"`);
        lines.push(`   Proposed: "${ch.revised}"`);
      } else {
        lines.push(`   Proposed addition: "${ch.revised}"`);
      }
      if (ch.reason) lines.push(`   Rationale: ${ch.reason}`);
    }
    if (item?.level === "high") {
      lines.push(isZh ? "   （优先级：必须修改）" : "   (Priority: must-fix)");
    }
  });

  lines.push("");
  if (isZh) {
    lines.push("以上修改旨在平衡双方权利义务，降低履约与争议风险。恳请贵方予以考虑，我方愿进一步沟通细节。");
    lines.push("");
    lines.push("此致");
    lines.push("敬礼");
    lines.push("");
    lines.push("[您的姓名 / 公司名称]");
    lines.push("[日期]");
  } else {
    lines.push(
      "These revisions aim to balance rights and obligations and reduce performance and dispute risk. We welcome further discussion."
    );
    lines.push("");
    lines.push("Best regards,");
    lines.push("");
    lines.push("[Your name / Company]");
    lines.push("[Date]");
  }

  return lines.join("\n");
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
