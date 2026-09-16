import { idahoChecklistExtras } from "@/lib/idaho";

export const MATTER_TYPES = [
  { id: "general", label: "General / other" },
  { id: "traffic", label: "Parking / traffic ticket" },
  { id: "civil", label: "Civil court order / judgment" },
  { id: "small-claims", label: "Small claims" },
  { id: "landlord-tenant", label: "Landlord–tenant" },
  { id: "family", label: "Family / custody" },
  { id: "employment", label: "Employment / wage" },
  { id: "consumer", label: "Consumer / debt" },
  { id: "estate", label: "Wills / probate (prep)" },
  { id: "business", label: "Small business" },
] as const;

export type MatterTypeId = (typeof MATTER_TYPES)[number]["id"];

export const CHECKLISTS: Record<string, { title: string; items: string[] }> = {
  traffic: {
    title: "Ticket / citation preparation",
    items: [
      "Photograph the front and back of the ticket, including barcodes and fine print.",
      "Write down the appearance or payment date the same day you receive it.",
      "Note location, posted signs, meter or permit rules, and weather or lighting.",
      "Keep photos of the vehicle, signs, and the parking space if you still can.",
      "Ask the clerk about contest, payment, or defensive-driving options.",
      "Do not miss the response deadline printed on the citation.",
      "If an accident or injury is involved, speak with a lawyer before recorded statements.",
    ],
  },
  "small-claims": {
    title: "Small-claims preparation",
    items: [
      "Confirm the correct court and dollar limit for your county.",
      "Write a one-page timeline: date, what happened, amount, who was there.",
      "Collect contracts, invoices, texts, photos, and proof of payment.",
      "Identify the defendant’s legal name and a good service address.",
      "Ask the clerk which form to use and how service of process works locally.",
      "Have a licensed attorney review if the amount or issues are complex.",
    ],
  },
  civil: {
    title: "Civil judgment / order preparation",
    items: [
      "Keep the full signed order, every page, including file stamps and the judge’s signature line.",
      "Get a current docket printout from the clerk of the court named on the caption — not only the PDF you have.",
      "List each lettered or numbered command (who must do what, to whom, by when if printed).",
      "A judgment is not automatically a recorded deed, a writ, or proof a later motion failed or succeeded. Ask the clerk what is currently entered.",
      "If land, a business, or an injunction is involved, speak with a licensed attorney in the court that issued the order before you rely on it or ignore it.",
    ],
  },
  "landlord-tenant": {
    title: "Landlord–tenant preparation",
    items: [
      "Locate the signed lease, addenda, and all notices given or received.",
      "List habitability issues with dates, photos, and repair requests.",
      "Record rent payments: date, amount, method, remaining balance.",
      "Do not ignore a court summons. Note the hearing date immediately.",
      "Check local rules on notice periods and lockouts — they vary widely.",
    ],
  },
  family: {
    title: "Family-law preparation",
    items: [
      "Write a parenting calendar of the last 6–12 months as it actually happened.",
      "List children, birthdates, schools, and current household addresses.",
      "Collect existing orders, petitions, and proof of service.",
      "Note any protection orders or safety concerns separately and urgently.",
      "Family cases are high-stakes. Get local counsel or legal aid involved early.",
    ],
  },
  employment: {
    title: "Wage / employment preparation",
    items: [
      "Save offer letters, handbooks, time records, and pay stubs.",
      "Write a chronology of hours worked vs. hours paid.",
      "Note deadlines for agency charges; they can be short.",
      "Have an employment lawyer review before you sign a release or severance.",
    ],
  },
  consumer: {
    title: "Debt / consumer preparation",
    items: [
      "Collect the contract, account statements, and collection letters.",
      "Do not ignore a lawsuit. Calendar the answer deadline from the summons.",
      "Build a payment history and dispute amounts you do not recognize.",
      "A consumer attorney or legal aid clinic should review before you file an answer.",
    ],
  },
  estate: {
    title: "Estate planning preparation (not a will)",
    items: [
      "List people and assets. This is intake only — not a valid will.",
      "Gather deeds, account titles, beneficiary designations, and existing wills.",
      "Do not rely on an AI draft as a will, trust, or power of attorney.",
      "Meet a licensed estate lawyer to execute legally effective documents.",
    ],
  },
  business: {
    title: "Small-business preparation",
    items: [
      "Identify owners, state of formation, and registered agent.",
      "Collect formation documents, licenses, and key contracts.",
      "Do not treat AI contract language as negotiated or enforceable as-is.",
    ],
  },
  general: {
    title: "General matter intake",
    items: [
      "Write the story in dated order. Stick to what you saw, heard, or have on paper.",
      "Name every person and organization involved.",
      "List what you want: money, a correction, an order, a dismissed ticket.",
      "Upload photos of every paper you received.",
      "Calendar every date on any notice, ticket, or court paper.",
    ],
  },
};

export function matterChecklist(matterType: string, stateCode: string, localityId: string) {
  const base = CHECKLISTS[matterType] ?? CHECKLISTS.general;
  if (stateCode !== "ID") return base;
  const extras = idahoChecklistExtras(matterType, localityId);
  return {
    title: `${base.title} · Idaho`,
    items: [...base.items, ...extras],
  };
}

export const DRAFT_TYPES = [
  { id: "demand-letter", label: "Demand letter" },
  { id: "intake-memo", label: "Intake memo" },
  { id: "timeline", label: "Annotated timeline" },
  { id: "hearing-outline", label: "Hearing outline" },
  { id: "discovery-list", label: "Document / evidence list" },
  { id: "client-questions", label: "Questions for a lawyer" },
  { id: "contest-letter", label: "Ticket contest letter" },
] as const;

export const DISCLAIMER =
  "Mr. Paralegal is an AI-powered legal information and decision-support desk. It is not a lawyer, not a law firm, and not a substitute for a licensed attorney. It does not create an attorney-client relationship, does not give legal advice, and does not guarantee outcomes. Authorities that cannot be retrieved and verified are marked unverified. Always have a licensed attorney in the governing jurisdiction review anything before you file, sign, pay, or rely on it.";
