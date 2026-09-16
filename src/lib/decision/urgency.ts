import type { UrgencyLevel } from "./types.ts";

export type UrgencyInput = {
  text: string;
  hasPrintedDate: boolean;
  served: boolean;
};

export type UrgencyResult = {
  level: UrgencyLevel;
  why: string;
  escalate: boolean;
  escalateReasons: string[];
};

const EMERGENCY = /\b(arrest(ed)?|in jail|warrant|ice detention|child (was )?taken|kidnap|restraining order tonight|lockout today|bleeding|ambulance)\b/i;
const URGENT =
  /\b(summons|complaint served|active (case|lawsuit)|custody|child support|immigration|deport|felony|misdemeanor|eviction hearing|injunction|temporary restraining|default judgment|declaratory judgment|order of default|permanent injunction|transfer the real property)\b/i;
const TIME = /\b(appear(ance)? date|answer due|deadline|days to (respond|answer|pay)|pay by|due on)\b/i;
const ATTENTION = /\b(ticket|citation|demand letter|collection|unpaid|lease|wage)\b/i;

export function classifyUrgency(input: UrgencyInput): UrgencyResult {
  const t = input.text;
  const reasons: string[] = [];
  let level: UrgencyLevel = "ROUTINE";

  if (EMERGENCY.test(t)) {
    level = "EMERGENCY";
    reasons.push("The facts suggest arrest, detention, immediate lockout, or a child-safety crisis.");
  } else if (input.served || URGENT.test(t)) {
    level = "URGENT_ATTORNEY_REVIEW";
    reasons.push("A court judgment, injunction, lawsuit, custody, immigration, or criminal exposure appears to be in play.");
  } else if (input.hasPrintedDate || TIME.test(t)) {
    level = "TIME_SENSITIVE";
    reasons.push("A date or response window is mentioned. Exact deadlines still need verification from the paper or the clerk.");
  } else if (ATTENTION.test(t)) {
    level = "ATTENTION_NEEDED";
    reasons.push("A ticket, demand, housing, or wage issue should be organized promptly, but no court emergency was described.");
  } else {
    reasons.push("No court deadline, service, or emergency language was detected in the text provided.");
  }

  const escalate =
    level === "EMERGENCY" ||
    level === "URGENT_ATTORNEY_REVIEW" ||
    /\b(criminal|custody|immigration|injury|bodily)\b/i.test(t);

  if (escalate && !reasons.some((r) => /attorney|counsel|lawyer/i.test(r))) {
    reasons.push("A licensed attorney in the governing jurisdiction should review before you file, ignore, or rely on a draft.");
  }

  return {
    level,
    why: reasons.join(" "),
    escalate,
    escalateReasons: escalate ? reasons : [],
  };
}
