import type { MatterTypeId } from "../catalog.ts";
import { US_STATES } from "../states.ts";
import { statesMentioned } from "./halt.ts";

export const PAPER_KINDS = [
  "court-order",
  "court-letter",
  "summons",
  "ticket",
  "contract",
  "other",
] as const;

export type PaperKind = (typeof PAPER_KINDS)[number];

export type PaperRead = {
  kind: PaperKind;
  suggestedMatterType: MatterTypeId;
  suggestedTitle: string;
  printedStateCode: string | null;
  causeNumber: string | null;
  court: string | null;
  judge: string | null;
  relief: string[];
};

const ORDER_RE =
  /\b(order of (?:default |declaratory )?judgment|declaratory judgment|default judgment|it is hereby ordered[, ]+adjudged|permanent injunction|done in open court|ordered, adjudged and decreed)\b/i;
const LETTER_RE =
  /\b(court'?s decision|judicial assistant|motion to vacate|this letter documents|please be advised that the court)\b/i;
const SUMMONS_RE = /\b(you are hereby summoned|summons and complaint|notice of hearing)\b/i;
const TICKET_RE = /\b(parking ticket|traffic citation|infraction|pay by|windshield)\b/i;
const CONTRACT_RE = /\b(this agreement|lease agreement|in witness whereof)\b/i;
const CAUSE_RE = /\b(?:cause\s*no\.?|case\s*no\.?|no\.)\s*(\d{2}-\d-\d{4,6}-\d)\b/i;
const COURT_LINE_RE =
  /\b(in the (?:superior|district|circuit|municipal|magistrate|justice) court[^\n.]{0,80})/i;
const JUDGE_RE = /\b(?:judge|commissioner|court commissioner)\s*[:/]?\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3})/;

function firstMatch(re: RegExp, text: string) {
  const m = text.match(re);
  return m?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function reliefLines(text: string) {
  const lines: string[] = [];
  const re = /(?:^|\n)\s*([A-E]\.\s+[^\n]{20,400})/g;
  for (const m of text.matchAll(re)) {
    if (m[1]) lines.push(m[1].replace(/\s+/g, " ").trim());
  }
  return lines.slice(0, 8);
}

function captionTitle(text: string, filename: string, kind: PaperKind) {
  const cause = firstMatch(CAUSE_RE, text);
  const v = text.match(
    /([A-Z][A-Z\s,'&.]{3,60})\s+v(?:ersus|\.)\s+([A-Z][A-Z\s,'&.]{3,60})/i,
  );
  if (v) {
    const left = v[1]!.replace(/\s+/g, " ").trim().slice(0, 40);
    const right = v[2]!.replace(/\s+/g, " ").trim().slice(0, 40);
    return cause ? `${left} v. ${right} (${cause})` : `${left} v. ${right}`;
  }
  if (cause) return `Cause ${cause}`;
  if (kind === "court-order") return filename.replace(/\.[^.]+$/, "") || "Court order";
  if (kind === "ticket") return "Ticket / papers";
  return filename.replace(/\.[^.]+$/, "") || "Papers";
}

export function classifyPaperKind(text: string, filename = ""): PaperKind {
  const name = filename.toLowerCase();
  if (ORDER_RE.test(text) || ((/judgement|judgment|default/.test(name) && /order|judg/.test(name)))) {
    return "court-order";
  }
  if (LETTER_RE.test(text) && /\bcourt\b/i.test(text)) return "court-letter";
  if (SUMMONS_RE.test(text) || /summons/.test(name)) return "summons";
  if (TICKET_RE.test(text) || /ticket|citation|parking/.test(name)) return "ticket";
  if (CONTRACT_RE.test(text)) return "contract";
  if (/\bsuperior court\b/i.test(text) && /\bplaintiff/i.test(text)) return "court-order";
  return "other";
}

export function matterTypeForPaper(kind: PaperKind): MatterTypeId {
  if (kind === "ticket") return "traffic";
  if (kind === "court-order" || kind === "court-letter" || kind === "summons") return "civil";
  if (kind === "contract") return "business";
  return "general";
}

export function readPaper(text: string, filename = ""): PaperRead {
  const kind = classifyPaperKind(text, filename);
  const mentioned = statesMentioned(text);
  return {
    kind,
    suggestedMatterType: matterTypeForPaper(kind),
    suggestedTitle: captionTitle(text, filename, kind),
    printedStateCode: mentioned[0] ?? null,
    causeNumber: firstMatch(CAUSE_RE, text),
    court: firstMatch(COURT_LINE_RE, text),
    judge: firstMatch(JUDGE_RE, text),
    relief: reliefLines(text),
  };
}

export function paperStateLabel(code: string | null) {
  if (!code) return null;
  return US_STATES.find((s) => s.code === code)?.name ?? code;
}

export function structuredPaperNotes(read: PaperRead) {
  const lines = [
    `Document class (deterministic): ${read.kind}`,
    read.court ? `Court line: ${read.court}` : "",
    read.causeNumber ? `Cause / case no.: ${read.causeNumber}` : "",
    read.judge ? `Judge / commissioner line: ${read.judge}` : "",
    read.printedStateCode ? `State named on the paper: ${paperStateLabel(read.printedStateCode)}` : "",
    read.relief.length ? `Decretal / lettered paragraphs found:\n${read.relief.map((r) => `- ${r}`).join("\n")}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Demo / placeholder copy from the intake field — not a real matter. */
export function isDemoSituation(text: string) {
  return /neighbor opened my closed fence/i.test(text) || /parking ticket on main street/i.test(text);
}

export function usableNarrative(text: string) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 8) return "";
  if (/^(n|y|yes|no|none|idk|n\/a|\.|-)$/i.test(t)) return "";
  if (isDemoSituation(t)) return "";
  return t;
}

export function paperSituation(read: PaperRead) {
  if (read.kind !== "court-order" && read.kind !== "court-letter" && read.kind !== "summons") return "";
  return [
    read.suggestedTitle,
    read.court,
    read.causeNumber ? `Cause ${read.causeNumber}` : "",
    read.judge ? `Judge / commissioner: ${read.judge}` : "",
    read.relief.length ? `Printed commands: ${read.relief.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");
}

export function storyMatchesPaper(story: string, read: PaperRead) {
  const s = story.toLowerCase();
  if (read.causeNumber && s.includes(read.causeNumber.toLowerCase())) return true;
  if (read.kind === "court-order" || read.kind === "court-letter") {
    return /\b(judgment|judgement|injunction|plaintiff|defendant|cause no|superior court|vacate)\b/i.test(story);
  }
  return true;
}

export function matterUnrelatedToPaper(story: string, matterType: string, read: PaperRead) {
  if (read.kind !== "court-order" && read.kind !== "court-letter") return false;
  if (isDemoSituation(story)) return true;
  if (matterType === "traffic" && read.suggestedMatterType === "civil") return true;
  const usable = usableNarrative(story);
  if (!usable) return false;
  return !storyMatchesPaper(usable, read);
}
