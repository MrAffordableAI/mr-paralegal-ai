import type { Authority, Conflict, DeadlineCandidate, Gate, GateId } from "./types.ts";

export type GateInput = {
  stateCode: string;
  eventPlace: string;
  jurisdictionConfirmed: boolean;
  allowLaw: boolean;
  jurisdictionDetail: string;
  facts: string;
  summary: string;
  eventDate: string;
  authorities: Authority[];
  conflicts: Conflict[];
  deadlines: DeadlineCandidate[];
  escalationChecked: boolean;
  temporalValidated: boolean;
};

const ORDER: GateId[] = [
  "JURISDICTION_CONFIRMED",
  "LEGAL_AUTHORITY_VERIFIED",
  "MATERIAL_FACTS_SUFFICIENT",
  "SOURCE_CONFLICTS_RESOLVED",
  "DEADLINE_VERIFIED",
  "TEMPORAL_VALIDITY_CHECKED",
  "ATTORNEY_ESCALATION_CHECKED",
];

export function hasVerifiedSection(authorities: Authority[]) {
  return authorities.some(
    (a) =>
      a.role === "issue_section" &&
      a.verificationStatus === "retrieved" &&
      a.relevantExcerpt.trim().length > 80,
  );
}

export function evaluateGates(input: GateInput): Gate[] {
  const factsOk =
    (input.summary.trim().length >= 40 || input.facts.trim().length >= 40) &&
    Boolean(input.eventPlace.trim() || input.stateCode);
  const verifiedSection = hasVerifiedSection(input.authorities);
  const openConflicts = input.conflicts.length > 0;
  const clerkVerifiedDeadline = input.deadlines.some((d) => d.verificationStatus === "quoted-from-paper" && d.confidence === "printed-on-paper");

  const map: Record<GateId, Gate> = {
    JURISDICTION_CONFIRMED: {
      id: "JURISDICTION_CONFIRMED",
      status: input.allowLaw ? "pass" : "fail",
      detail: input.jurisdictionDetail,
    },
    LEGAL_AUTHORITY_VERIFIED: {
      id: "LEGAL_AUTHORITY_VERIFIED",
      status: verifiedSection ? "pass" : "fail",
      detail: verifiedSection
        ? "A retrieved excerpt is tagged as an issue-specific section. Confirm it is still in force for the event date."
        : "Official homepages or index pages are not a controlling section. Nothing below is settled law.",
    },
    MATERIAL_FACTS_SUFFICIENT: {
      id: "MATERIAL_FACTS_SUFFICIENT",
      status: factsOk ? "pass" : "fail",
      detail: factsOk
        ? "There is a usable narrative. Material gaps may still exist."
        : "The description is too thin for a fact-to-rule comparison.",
    },
    SOURCE_CONFLICTS_RESOLVED: {
      id: "SOURCE_CONFLICTS_RESOLVED",
      status: openConflicts ? "fail" : "pass",
      detail: openConflicts
        ? "CONFLICT DETECTED — sources disagree. The conflict is shown, not resolved."
        : "No automated money/date clash was detected between the texts compared.",
    },
    DEADLINE_VERIFIED: {
      id: "DEADLINE_VERIFIED",
      status: clerkVerifiedDeadline ? "pass" : "fail",
      detail: clerkVerifiedDeadline
        ? "A date quoted from a paper is on file. That is not the same as clerk confirmation of the deadline."
        : "No deadline was verified against a controlling rule. Dates you typed or that appear on a paper still require verification. This desk will not invent or calculate one.",
    },
    TEMPORAL_VALIDITY_CHECKED: {
      id: "TEMPORAL_VALIDITY_CHECKED",
      status: input.temporalValidated ? "pass" : "fail",
      detail: input.temporalValidated
        ? "Effective-date information was found in a retrieved section."
        : "An event date on file is not a check that current website text was the law that day. Temporal validity is not established.",
    },
    ATTORNEY_ESCALATION_CHECKED: {
      id: "ATTORNEY_ESCALATION_CHECKED",
      status: input.escalationChecked ? "pass" : "unchecked",
      detail: input.escalationChecked
        ? "Escalation rules were run. A recommendation is not a finding that you do or do not need counsel."
        : "Escalation has not been run yet.",
    },
  };

  return ORDER.map((id) => map[id]);
}

export function isFullyReviewed(gates: Gate[]) {
  return gates.length > 0 && gates.every((g) => g.status === "pass");
}
