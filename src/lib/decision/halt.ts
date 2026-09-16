import { US_STATES } from "../states.ts";

export type HaltInput = {
  jurisdictionConfirmed: boolean;
  stateCode: string;
  eventPlace: string;
};

export type HaltResult = {
  allowLaw: boolean;
  reason: string;
  mentionedCodes: string[];
  conflictCode: string | null;
};

const BY_LENGTH = [...US_STATES].sort((a, b) => b.name.length - a.name.length);

function codeBoundary(code: string) {
  return new RegExp(`(^|[,(\\s])${code}([,)\\s]|$)`, "i");
}

/** States named in the event-place string. Longer names first so “West Virginia” wins over “Virginia”. */
export function statesMentioned(place: string): string[] {
  let rest = place.trim();
  if (!rest) return [];
  const found: string[] = [];

  const dcRe = /\b(d\.?c\.?|district of columbia|washington,\s*d\.?c\.?)\b/gi;
  if (dcRe.test(rest)) {
    found.push("DC");
    rest = rest.replace(dcRe, " ");
  }

  for (const st of BY_LENGTH) {
    if (st.code === "DC") continue;
    const nameRe = new RegExp(`\\b${st.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (nameRe.test(rest)) {
      found.push(st.code);
      rest = rest.replace(nameRe, " ");
      continue;
    }
    if (codeBoundary(st.code).test(rest)) {
      found.push(st.code);
      rest = rest.replace(codeBoundary(st.code), " ");
    }
  }
  return found;
}

/**
 * Jurisdiction-specific legal conclusions are allowed only when the user
 * confirmed the working jurisdiction, named a place, that place includes the
 * selected state, and does not name a different state.
 */
export function jurisdictionHalt(input: HaltInput): HaltResult {
  if (!input.jurisdictionConfirmed || !input.stateCode) {
    return {
      allowLaw: false,
      reason:
        "Jurisdiction is not confirmed. State-specific legal conclusions are withheld. Confirm the state and the place of the event or the court named on the papers.",
      mentionedCodes: [],
      conflictCode: null,
    };
  }
  const place = input.eventPlace.trim();
  if (!place) {
    return {
      allowLaw: false,
      reason:
        "No event or court location is on file. Do not assume the selected settings state is the governing law.",
      mentionedCodes: [],
      conflictCode: null,
    };
  }
  const mentioned = statesMentioned(place);
  const conflict = mentioned.find((c) => c !== input.stateCode) ?? null;
  if (conflict) {
    const other = US_STATES.find((s) => s.code === conflict)?.name ?? conflict;
    return {
      allowLaw: false,
      reason: `The event location names ${other}, which does not match the selected jurisdiction. Confirm the governing court before any state-specific legal conclusion.`,
      mentionedCodes: mentioned,
      conflictCode: conflict,
    };
  }
  if (!mentioned.includes(input.stateCode)) {
    return {
      allowLaw: false,
      reason:
        "The event location does not name the selected state. Add the state (or the court named on the paper) before jurisdiction-specific conclusions.",
      mentionedCodes: mentioned,
      conflictCode: null,
    };
  }
  return {
    allowLaw: true,
    reason: "Working jurisdiction is confirmed and matches the event location. Still verify the court named on any paper.",
    mentionedCodes: mentioned,
    conflictCode: null,
  };
}
