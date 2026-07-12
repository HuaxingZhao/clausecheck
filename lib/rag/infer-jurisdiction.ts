/**
 * Heuristic jurisdiction inference for knowledge chunks (backfill + runtime).
 */

import type { KnowledgeDocType, KnowledgeJurisdiction } from "./knowledge-meta";

const CN_RE =
  /民法典|公司法|劳动合同法|民事诉讼法|个人信息保护法|广告法|电子商务法|代理记账|劳动法|证券法|中华人民共和国|PRC\s+Civil\s+Code|Civil\s+Code\s+art|PIPL|China\s+Company\s+Law/i;

const US_CA_RE =
  /California|CPRA|CCPA|Cal\.\s*Civ|US-CA|加州/i;

const US_NY_RE = /New\s+York|N\.Y\.|NY\s+GBL|US-NY/i;

const US_RE =
  /\bUCC\b|Uniform\s+Commercial\s+Code|FTC|federal\s+(law|statute)|United\s+States|U\.S\.\s+Code|Delaware/i;

const UK_RE =
  /England\s+and\s+Wales|UK\s+GDPR|TUPE|Companies\s+Act\s+2006|English\s+law|solicitor/i;

const EU_RE = /\bGDPR\b|EU\s+law|European\s+Union|ePrivacy|Digital\s+Services\s+Act/i;

const INTL_RE =
  /Incoterms|CISG|UNCITRAL|international\s+commercial|跨境|standard\s+contractual\s+clauses|\bSCCs?\b|New\s+York\s+Convention/i;

/**
 * Infer jurisdiction from title + body text.
 * Prefer more specific US-CA / US-NY over generic US when both match.
 */
export function inferKnowledgeJurisdiction(text: string): KnowledgeJurisdiction {
  const t = text || "";
  if (CN_RE.test(t)) return "CN";
  if (US_CA_RE.test(t)) return "US-CA";
  if (US_NY_RE.test(t)) return "US-NY";
  if (UK_RE.test(t)) return "UK";
  if (EU_RE.test(t)) return "EU";
  if (INTL_RE.test(t)) return "INTL";
  if (US_RE.test(t)) return "US";

  // Bilingual clause templates / generic commercial checks → GENERAL
  if (
    /liabilit|indemnif|terminat|confidential|SLA|责任|赔偿|保密|管辖|governing\s+law|dispute/i.test(
      t
    )
  ) {
    return "GENERAL";
  }

  // Chinese-only commercial wording without named statute → still often PRC-oriented
  if (/[\u4e00-\u9fff]{8,}/.test(t) && !/[a-z]{4,}/i.test(t)) {
    return "CN";
  }

  return "UNKNOWN";
}

export function inferDocType(
  kind: "mandatory_check" | "statute" | "template",
  text: string
): KnowledgeDocType {
  if (kind === "mandatory_check") return "mandatory_check";
  if (kind === "template") return "clause_template";
  if (/regulation|管理办法|条例|规则/i.test(text)) return "regulation";
  if (/\bv\.?\s+[A-Z]|case\s+law|判例/i.test(text)) return "case_law";
  return "statute";
}
