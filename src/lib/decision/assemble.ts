import { auditCitations } from "./citations.ts";
import { evaluateGates, hasVerifiedSection, isFullyReviewed } from "./gates.ts";
import { jurisdictionHalt } from "./halt.ts";
import {
  isDemoSituation,
  paperSituation,
  readPaper,
  usableNarrative,
} from "./paper.ts";
import type {
  Authority,
  Conflict,
  DeadlineCandidate,
  DecisionReport,
  IssueAnalysis,
  IssueSpot,
} from "./types.ts";
import { classifyUrgency } from "./urgency.ts";

export type AssembleInput = {
  summary: string;
  facts: string;
  goals: string;
  parties: string;
  eventDate: string;
  eventPlace: string;
  jurisdictionLabel: string;
  stateCode: string;
  jurisdictionConfirmed: boolean;
  evidenceNotes: string;
  issues: IssueSpot[];
  authorities: Authority[];
  conflicts: Conflict[];
  deadlines: DeadlineCandidate[];
  model: {
    found?: string;
    whatLawAppearsToSay?: string;
    howLawMayApply?: string;
    factsHelping?: string;
    factsHurting?: string;
    otherSide?: string;
    stillUnknown?: string;
    options?: string;
    nextSteps?: string;
    attorney?: string;
    issueAnalyses?: IssueAnalysis[];
  };
  retrievedCorpus: string;
  auditLog?: { at: string; step: string; detail: string }[];
};

function indexOnlyCopy(authorities: Authority[]) {
  const opened = authorities.filter((a) => a.verificationStatus === "retrieved");
  if (!opened.length) {
    return "No official legal text was retrieved for this run. Treat every legal proposition as unverified. Use the official links in Sources; do not treat this paragraph as the law.";
  }
  return `Official index or self-help pages were opened (${opened.map((a) => a.title).join("; ")}). Those pages are starting points, not a verified, in-force section for these facts. A licensed attorney must confirm.`;
}

function auditField(text: string, corpus: string, flagged: string[]) {
  const r = auditCitations(text, corpus);
  flagged.push(...r.flagged);
  return r.text;
}

export function assembleReport(input: AssembleInput): DecisionReport {
  const halt = jurisdictionHalt({
    jurisdictionConfirmed: input.jurisdictionConfirmed,
    stateCode: input.stateCode,
    eventPlace: input.eventPlace,
  });
  const served = /\b(summons|served|complaint)\b/i.test(`${input.summary} ${input.facts} ${input.evidenceNotes}`);
  const urgency = classifyUrgency({
    text: `${input.summary}\n${input.facts}\n${input.evidenceNotes}`,
    hasPrintedDate: Boolean(input.eventDate) || input.deadlines.length > 0,
    served,
  });

  const sectionVerified = hasVerifiedSection(input.authorities);
  const emitLaw = halt.allowLaw && sectionVerified;

  const gates = evaluateGates({
    stateCode: input.stateCode,
    eventPlace: input.eventPlace,
    jurisdictionConfirmed: input.jurisdictionConfirmed,
    allowLaw: halt.allowLaw,
    jurisdictionDetail: halt.reason,
    facts: input.facts,
    summary: input.summary,
    eventDate: input.eventDate,
    authorities: input.authorities,
    conflicts: input.conflicts,
    deadlines: input.deadlines,
    escalationChecked: true,
    temporalValidated: false,
  });

  const paper = readPaper(input.evidenceNotes);
  const courtPaper = paper.kind === "court-order" || paper.kind === "court-letter" || paper.kind === "summons";
  const paperSit = paperSituation(paper);
  const typed = usableNarrative(input.summary) || usableNarrative(input.facts);
  const leftoverDemo = isDemoSituation(`${input.summary} ${input.facts}`);

  const flagged: string[] = [];
  const withheldLaw =
    "Jurisdiction-specific legal conclusions are withheld. Confirm the governing state and court, then re-run. Official links are listed under Sources for you to read; they are not applied as law here.";
  const unverifiedLaw = indexOnlyCopy(input.authorities);
  const withheldApply =
    "No fact-to-rule application was performed because no verified, in-force section is on file for this matter.";

  const lawText = emitLaw
    ? auditField(input.model.whatLawAppearsToSay?.trim() || unverifiedLaw, input.retrievedCorpus, flagged)
    : halt.allowLaw
      ? unverifiedLaw
      : withheldLaw;
  const applyText = emitLaw
    ? auditField(input.model.howLawMayApply?.trim() || withheldApply, input.retrievedCorpus, flagged)
    : withheldApply;

  const deadlineText =
    input.deadlines.length === 0
      ? "Potential deadline identified only if a date is printed on your papers — exact deadline requires verification. This desk did not calculate a filing deadline."
      : input.deadlines
          .map(
            (d) =>
              `${d.deadlineType}: ${d.date || "date unknown"} (${d.verificationStatus}; ${d.confidence}). ${d.calculationMethod} Exact deadline requires verification.`,
          )
          .join("\n");

  const attorney =
    auditField(
      input.model.attorney?.trim() ||
        (urgency.escalate || courtPaper
          ? `Speak with a licensed attorney in the court named on the paper${paper.printedStateCode ? ` (${paper.printedStateCode})` : ""} — not automatically ${input.jurisdictionLabel || "the Settings state"} — before you file, ignore, record, or rely on this report.`
          : `Consider a licensed attorney or legal aid if money, housing, children, injury, or a court date is involved. Legal aid links are in Sources.`),
      input.retrievedCorpus,
      flagged,
    );

  const analyses: IssueAnalysis[] = emitLaw
    ? (input.model.issueAnalyses ?? []).map((a) => ({
        ...a,
        rule: auditField(a.rule, input.retrievedCorpus, flagged),
        authority: auditField(a.authority, input.retrievedCorpus, flagged),
      }))
    : [];

  const situation = paperSit
    ? leftoverDemo || !typed
      ? `From the papers: ${paperSit}`
      : `From the papers: ${paperSit}\nTyped account: ${typed}`
    : typed || input.summary.trim() || input.facts.trim() || "No situation text yet.";

  const factLines = [
    usableNarrative(input.facts) && usableNarrative(input.facts) !== typed ? usableNarrative(input.facts) : "",
    input.parties.trim().length > 1 ? `Parties: ${input.parties.trim()}` : "",
    input.eventDate ? `Event date (typed): ${input.eventDate}` : "",
    paper.causeNumber ? `Cause number on paper: ${paper.causeNumber}` : "",
    paper.court ? `Court on paper: ${paper.court}` : "",
    paper.relief.length ? `Printed commands:\n${paper.relief.map((r) => `- ${r}`).join("\n")}` : "",
  ].filter(Boolean);
  const importantFacts =
    factLines.join("\n") || "No usable facts on file yet — a one-letter answer is not a narrative.";

  const defaultNext = courtPaper
    ? [
        leftoverDemo
          ? "1) Replace the leftover example story on the Situation tab with what this paper is actually about — or leave it blank and rely on the papers."
          : "1) In Settings, set the state to the one printed on the caption, then confirm jurisdiction before re-running.",
        "2) Get a current docket from the clerk of the court named on the caption — not only this PDF.",
        "3) Keep the signed order and any later motion or letter as separate documents.",
        "4) A judgment is not a deed, not a writ, and not proof a later motion was granted or denied.",
        "5) Speak with a licensed attorney in the court that issued the order before you rely on it or ignore it.",
        "6) Re-run this report after Settings match the caption.",
      ].join(" ")
    : "1) Photograph every paper. 2) Calendar only dates you can see. 3) Open the official self-help link for the state named on the paper. 4) Ask the clerk which form they currently accept. 5) Have a lawyer review before you file. 6) Run this report again after jurisdiction is confirmed.";

  const defaultOptions = courtPaper
    ? "Confirm with the issuing clerk what is currently entered. Do not treat this PDF as the live docket. Do not apply a different state's self-help pack to this caption. A licensed attorney in the issuing court should review before you file, record, enforce, or ignore it."
    : "Organize papers. Confirm jurisdiction with the clerk named on any document. Do not miss a printed date. Speak with legal aid or a lawyer before filing or paying if you are unsure.";

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    situation,
    found: auditField(
      input.model.found?.trim() ||
        `Possible issues spotted: ${input.issues.map((i) => i.label).join("; ") || "none yet"}. These are possibilities to research, not findings that they apply.`,
      input.retrievedCorpus,
      flagged,
    ),
    jurisdiction: halt.allowLaw
      ? `${input.jurisdictionLabel}. Event place on file: ${input.eventPlace}. Do not assume your current city is the governing law.`
      : halt.reason,
    importantFacts,
    whatLawAppearsToSay: lawText,
    howLawMayApply: applyText,
    factsHelping: auditField(
      input.model.factsHelping?.trim() || "Not enough verified facts to list supporting points.",
      input.retrievedCorpus,
      flagged,
    ),
    factsHurting: auditField(
      input.model.factsHurting?.trim() || "Not enough verified facts to list opposing points.",
      input.retrievedCorpus,
      flagged,
    ),
    otherSide: auditField(
      input.model.otherSide?.trim() ||
        "The other side could argue that your facts are incomplete, that a local rule or a paper you have not uploaded controls, or that you missed a response date. This desk will not assume you are automatically correct.",
      input.retrievedCorpus,
      flagged,
    ),
    stillUnknown: auditField(
      input.model.stillUnknown?.trim() ||
        (courtPaper
          ? "Missing: whether this order is still in force, any later vacation or amendment, recording/title status, and verified controlling text. Get a current docket."
          : "Missing: confirmed court, exact printed dates, full party names, and verified controlling text of any statute or ordinance."),
      input.retrievedCorpus,
      flagged,
    ),
    deadlines: deadlineText,
    options: auditField(input.model.options?.trim() || defaultOptions, input.retrievedCorpus, flagged),
    nextSteps: auditField(input.model.nextSteps?.trim() || defaultNext, input.retrievedCorpus, flagged),
    attorney,
    sources: input.authorities,
    issues: input.issues,
    issueAnalyses: analyses,
    conflicts: input.conflicts,
    urgency: urgency.level,
    urgencyWhy: urgency.why,
    escalate: urgency.escalate,
    escalateReasons: urgency.escalateReasons,
    gates,
    fullyReviewed: isFullyReviewed(gates),
    flaggedCitations: flagged,
    lawWithheld: !emitLaw,
    auditLog: input.auditLog ?? [],
  };
}
