export type EvidenceFact = {
  id: string;
  kind: "date" | "money" | "case-number" | "party";
  value: string;
  excerpt: string;
  documentId: string;
  confidence: "printed";
};

const MONEY = /\$[\d,]+(?:\.\d{2})?/g;
const ISOISH = /\b(?:20\d{2}|19\d{2})[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b/g;
const US_DATE = /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:20\d{2}|\d{2})\b/g;
const CASE_NO = /\b(?:case|citation|ticket|docket|notice)\s*(?:no\.?|#|number)?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{4,})\b/gi;
const CAUSE = /\b(?:cause\s*no\.?|case\s*no\.?|no\.)\s*(\d{2}-\d-\d{4,6}-\d)\b/gi;

function around(text: string, match: string) {
  const i = text.indexOf(match);
  if (i < 0) return match;
  return text.slice(Math.max(0, i - 40), Math.min(text.length, i + match.length + 40)).replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.replace(/,/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Deterministic facts from paper text. Never infers a legal rule. */
export function extractEvidenceFacts(text: string, documentId = "paper"): EvidenceFact[] {
  const raw = text.slice(0, 12000);
  if (!raw.trim()) return [];
  const facts: EvidenceFact[] = [];
  let n = 0;
  const push = (kind: EvidenceFact["kind"], value: string) => {
    n += 1;
    facts.push({
      id: `${documentId}-${kind}-${n}`,
      kind,
      value,
      excerpt: around(raw, value),
      documentId,
      confidence: "printed",
    });
  };
  for (const v of unique(raw.match(MONEY) ?? [])) push("money", v);
  for (const v of unique([...(raw.match(ISOISH) ?? []), ...(raw.match(US_DATE) ?? [])])) push("date", v);
  for (const m of raw.matchAll(CASE_NO)) {
    if (m[1]) push("case-number", m[1]);
  }
  for (const m of raw.matchAll(CAUSE)) {
    if (m[1]) push("case-number", m[1]);
  }
  return facts.slice(0, 24);
}
