import { isDemoSituation, readPaper } from "./paper.ts";
import type { IssueSpot } from "./types.ts";

type Rule = { id: string; label: string; re: RegExp; why: string };

const RULES: Rule[] = [
  {
    id: "civil-judgment",
    label: "Civil court order / default or declaratory judgment",
    re: /\b(order of (?:default |declaratory )?judgment|default judgment|declaratory judgment|ordered, adjudged|permanent injunction|cause no\.?\s*\d{2}-\d-|motion to vacate)\b/i,
    why: "A superior-court judgment or injunction is high-stakes. Whether it is still in force, was vacated, recorded, or enforced is a clerk-and-lawyer question — not something this desk can decide.",
  },
  {
    id: "real-property",
    label: "Real property / title transfer language",
    re: /\b(real property|transfer the real property|legal description|blocking access to .{0,40}property)\b/i,
    why: "Language about land is not the same as a recorded deed. Recording, title, and later orders must be checked with the county and counsel.",
  },
  {
    id: "traffic",
    label: "Parking / traffic citation",
    re: /\b(parking ticket|traffic (?:ticket|citation)|windshield|infraction|speeding ticket|pay the fine)\b/i,
    why: "The description mentions a ticket or infraction. Whether it is contestable depends on the issuing agency and the paper itself.",
  },
  {
    id: "small-claims",
    label: "Small-claims / money dispute",
    re: /\b(owe[sd]? me|small claims|security deposit|unpaid invoice)\b/i,
    why: "A money amount or refund may belong in a small-claims or civil docket — confirm the local cap and court.",
  },
  {
    id: "housing",
    label: "Landlord–tenant / housing",
    re: /\b(landlord|landlady|\btenants?\b|evict(?:ion|ed)?|lease agreement|unpaid rent|habitability|lockout)\b/i,
    why: "Housing disputes are highly local. A notice is not the same as a court order.",
  },
  {
    id: "animal",
    label: "Animal / dog liability",
    re: /\b(dog bite|dog bit|bit by (?:a |my |the )?dog|animal control|leash law)\b/i,
    why: "Animal cases can mix local ordinances, state statutes, and comparative fault. None of those apply until researched.",
  },
  {
    id: "trespass",
    label: "Entry / property (possible trespass)",
    re: /\b(opened my (?:closed )?fence|trespass|property line|without permission)\b/i,
    why: "Unauthorized entry can matter for fault and for animal or property claims. It is only a possible issue until facts and local law are checked.",
  },
  {
    id: "negligence",
    label: "Possible negligence / comparative fault",
    re: /\b(hurt|injur|accident|careless|negligen)\b/i,
    why: "If someone was hurt, negligence and comparative/contributory fault may be in play. That is issue-spotting, not a finding.",
  },
  {
    id: "employment",
    label: "Wage / employment",
    re: /\b(wage|paycheck|overtime|fired|terminated|hours worked)\b/i,
    why: "Wage claims may go to a labor agency, a court, or both. Deadlines can be short.",
  },
  {
    id: "consumer",
    label: "Debt / consumer",
    re: /\b(collection agency|charge-off|garnish|sued for (?:a )?debt)\b/i,
    why: "Collection and consumer cases often turn on whether a lawsuit was filed and when an answer is due.",
  },
  {
    id: "family",
    label: "Family / children",
    re: /\b(custody|divorce|child support|parenting|restraining order|protection order)\b/i,
    why: "Family matters are high-stakes and almost always need local counsel or legal aid.",
  },
  {
    id: "criminal",
    label: "Possible criminal exposure",
    re: /\b(arrest|charged|misdemeanor|felony|in jail|warrant)\b/i,
    why: "Criminal exposure requires a defense lawyer. This desk will not advise on criminal strategy.",
  },
  {
    id: "insurance",
    label: "Insurance coverage question",
    re: /\b(insurance|claim denied|adjuster|policy)\b/i,
    why: "Coverage is a contract question. The policy language controls, not a general summary.",
  },
];

function applyRules(blob: string): IssueSpot[] {
  return RULES.filter((r) => r.re.test(blob)).map((r) => ({
    id: r.id,
    label: r.label,
    whyPossible: r.why,
    status: "possible" as const,
  }));
}

export function spotIssues(text: string): IssueSpot[] {
  return spotIssuesFrom({ userText: text, paperText: "" });
}

/** Prefer the papers. Ignore leftover demo intake when a court order is on file. */
export function spotIssuesFrom(input: { userText: string; paperText: string }): IssueSpot[] {
  const paper = readPaper(`${input.paperText}`, "");
  const courtPaper = paper.kind === "court-order" || paper.kind === "court-letter" || paper.kind === "summons";
  const user =
    courtPaper && (isDemoSituation(input.userText) || !input.userText.trim())
      ? ""
      : courtPaper && !/\b(judgment|judgement|injunction|plaintiff|cause|court)\b/i.test(input.userText)
        && /dog|fence|parking ticket/i.test(input.userText)
        ? ""
        : input.userText;
  const blob = `${user}\n${input.paperText}`.trim();
  if (!blob) return [];
  let hits = applyRules(blob);
  if (courtPaper) {
    hits = hits.filter((h) => h.id !== "traffic" || /\b(parking ticket|windshield|infraction|speeding ticket)\b/i.test(blob));
  }
  if (hits.length) return hits;
  return [
    {
      id: courtPaper ? "civil-judgment" : "general",
      label: courtPaper ? "Civil court paper" : "General civil / other",
      whyPossible: courtPaper
        ? "A court caption is on file. Confirm with the clerk what is currently entered before treating it as in force."
        : "No specialized pattern was obvious from the words used. More facts are needed before labeling claims.",
      status: "possible",
    },
  ];
}
