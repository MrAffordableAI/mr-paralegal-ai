export const URGENCY_LEVELS = [
  "ROUTINE",
  "ATTENTION_NEEDED",
  "TIME_SENSITIVE",
  "URGENT_ATTORNEY_REVIEW",
  "EMERGENCY",
] as const;

export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const GATE_IDS = [
  "JURISDICTION_CONFIRMED",
  "LEGAL_AUTHORITY_VERIFIED",
  "MATERIAL_FACTS_SUFFICIENT",
  "SOURCE_CONFLICTS_RESOLVED",
  "DEADLINE_VERIFIED",
  "TEMPORAL_VALIDITY_CHECKED",
  "ATTORNEY_ESCALATION_CHECKED",
] as const;

export type GateId = (typeof GATE_IDS)[number];

export type GateStatus = "pass" | "fail" | "unchecked";

export type Gate = {
  id: GateId;
  status: GateStatus;
  detail: string;
};

export type FollowUp = {
  id: string;
  question: string;
  why: string;
  answer: string;
};

export type IssueSpot = {
  id: string;
  label: string;
  whyPossible: string;
  status: "possible";
};

export type Authority = {
  authorityType: "statute" | "court" | "agency" | "self-help" | "legal-aid" | "other";
  title: string;
  jurisdiction: string;
  citation: string;
  officialSourceUrl: string;
  retrievedDate: string;
  relevantExcerpt: string;
  verificationStatus: "retrieved" | "not_retrieved" | "unverified";
  /** Homepage/index pages are never a controlling section. */
  role: "index_page" | "issue_section";
};

export type Conflict = {
  id: string;
  topic: string;
  sourceA: string;
  sourceB: string;
  whyItMatters: string;
};

export type DeadlineCandidate = {
  deadlineType: string;
  date: string;
  jurisdiction: string;
  authority: string;
  calculationMethod: string;
  confidence: "user-stated" | "printed-on-paper" | "unverified";
  verificationStatus: "unverified" | "user-recorded" | "quoted-from-paper";
};

export type IssueAnalysis = {
  issue: string;
  rule: string;
  authority: string;
  factsFor: string;
  factsAgainst: string;
  missingFacts: string;
  userArgument: string;
  opposingArgument: string;
  uncertainty: string;
  practicalSignificance: string;
};

export type DecisionReport = {
  version: number;
  generatedAt: string;
  situation: string;
  found: string;
  jurisdiction: string;
  importantFacts: string;
  whatLawAppearsToSay: string;
  howLawMayApply: string;
  factsHelping: string;
  factsHurting: string;
  otherSide: string;
  stillUnknown: string;
  deadlines: string;
  options: string;
  nextSteps: string;
  attorney: string;
  sources: Authority[];
  issues: IssueSpot[];
  issueAnalyses: IssueAnalysis[];
  conflicts: Conflict[];
  urgency: UrgencyLevel;
  urgencyWhy: string;
  escalate: boolean;
  escalateReasons: string[];
  gates: Gate[];
  fullyReviewed: boolean;
  flaggedCitations: string[];
  lawWithheld: boolean;
  auditLog: { at: string; step: string; detail: string }[];
};
