import type { FollowUp } from "./types.ts";

export type QuestionContext = {
  summary: string;
  facts: string;
  eventDate: string;
  eventPlace: string;
  parties: string;
  goals: string;
  hasPapers: boolean;
  answers: Record<string, string>;
};

const BANK: Omit<FollowUp, "answer">[] = [
  {
    id: "where",
    question: "Where did this happen (city, county, and state on the papers or at the event)?",
    why: "Governing law is usually the place of the event, the court named on the papers, or a contract’s choice-of-law clause — not automatically where you live.",
  },
  {
    id: "when",
    question: "On what date did the event happen, and is any response or appearance date printed on a paper?",
    why: "Law and deadlines can depend on the event date. Dates must come from you or the paper — this desk will not invent them.",
  },
  {
    id: "served",
    question: "Have you been handed or mailed a summons, complaint, citation, or other court paper?",
    why: "Service of court papers can create short, high-risk deadlines and usually means a licensed attorney should review.",
  },
  {
    id: "injury",
    question: "Was anyone injured, arrested, or is a child, immigration status, or a home lockout involved?",
    why: "Those facts change urgency and almost always warrant professional help.",
  },
  {
    id: "parties",
    question: "Who are the other people or organizations, and where do they live or operate?",
    why: "Venue, who can be sued, and which court may hear the matter can turn on the other party’s location.",
  },
  {
    id: "want",
    question: "What do you want to happen (dismiss a ticket, get money back, keep housing, understand risk, talk to a lawyer)?",
    why: "Next steps differ if you need to respond to a lawsuit versus organizing facts before you decide.",
  },
];

function blob(ctx: QuestionContext) {
  return `${ctx.summary}\n${ctx.facts}\n${ctx.eventDate}\n${ctx.eventPlace}\n${ctx.parties}\n${ctx.goals}`.toLowerCase();
}

function alreadyAnswered(id: string, ctx: QuestionContext) {
  const t = blob(ctx);
  if (id === "when" && ctx.eventDate.trim()) return true;
  if (id === "where" && ctx.eventPlace.trim()) return true;
  if (id === "parties" && ctx.parties.trim().length > 8) return true;
  if (id === "want" && ctx.goals.trim().length > 8) return true;
  if (id === "served" && /\b(summons|complaint|citation|served)\b/.test(t)) return true;
  if (id === "injury" && /\b(arrest|injur|custody|ice|evict|lockout)\b/.test(t)) return true;
  return false;
}

/** Material follow-ups only. Skip any the user already answered in intake. */
export function materialQuestions(ctx: QuestionContext): FollowUp[] {
  return BANK.filter((q) => !alreadyAnswered(q.id, ctx)).map((q) => ({
    ...q,
    answer: ctx.answers[q.id] ?? "",
  }));
}
