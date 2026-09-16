export type IdahoLocality = {
  id: string;
  label: string;
  county: string;
  city?: string;
  featured?: boolean;
};

export const IDAHO_LOCALITIES: IdahoLocality[] = [
  { id: "nez-perce-lewiston", label: "Nez Perce County — Lewiston", county: "Nez Perce", city: "Lewiston", featured: true },
  { id: "latah-moscow", label: "Latah County — Moscow", county: "Latah", city: "Moscow" },
  { id: "ada-boise", label: "Ada County — Boise", county: "Ada", city: "Boise" },
  { id: "canyon-nampa", label: "Canyon County — Caldwell / Nampa", county: "Canyon", city: "Nampa" },
  { id: "kootenai-cda", label: "Kootenai County — Coeur d'Alene", county: "Kootenai", city: "Coeur d'Alene" },
  { id: "bonneville-if", label: "Bonneville County — Idaho Falls", county: "Bonneville", city: "Idaho Falls" },
  { id: "twin-falls", label: "Twin Falls County", county: "Twin Falls", city: "Twin Falls" },
  { id: "bannock-pocatello", label: "Bannock County — Pocatello", county: "Bannock", city: "Pocatello" },
  { id: "other", label: "Other Idaho county", county: "" },
];

export const IDAHO_STATE_LINKS = [
  { label: "Idaho Court Assistance / self-help forms", href: "https://courtselfhelp.idaho.gov/" },
  { label: "Idaho Supreme Court", href: "https://isc.idaho.gov/" },
  { label: "County courthouse directory", href: "https://isc.idaho.gov/Courthouse" },
  { label: "Idaho statutes", href: "https://legislature.idaho.gov/statutesrules/idstat/" },
  { label: "Idaho Legal Aid Services", href: "https://www.idaholegalaid.org/" },
  { label: "Small-claims forms (CAO)", href: "https://courtselfhelp.idaho.gov/Forms/claims" },
  { label: "iCourt File & Serve", href: "https://icourt.idaho.gov/" },
];

export const NEZ_PERCE = {
  courthouse: "Nez Perce County Courthouse, 1230 Main Street, Lewiston, ID 83501",
  mailing: "P.O. Box 896, Lewiston, ID 83501",
  districtCourtPhone: "208-799-3040",
  clerkPhone: "208-799-3020",
  caoPhone: "208-799-3191",
  caoHours: "Court Assistance Office: Mon–Fri 9:00–12:30 and 1:30–4:00 (confirm; 2nd Wednesday mornings may close for a forms workshop)",
  caoPage: "https://www.co.nezperce.id.us/Elected-Officials/Clerk-Auditor/District-Court/Court-Assistance-Office",
  caoLocalForms: "https://courtselfhelp.idaho.gov/Local/NezPerce",
  smallClaimsPage: "https://www.co.nezperce.id.us/Elected-Officials/Clerk-Auditor/District-Court/Civil-Court/Small-Claims",
  civilPage: "https://www.co.nezperce.id.us/Elected-Officials/Clerk-Auditor/District-Court/Civil-Court",
  city: "https://www.cityoflewiston.org/",
  county: "https://www.co.nezperce.id.us/",
};

export function idahoChecklistExtras(matterType: string, localityId: string): string[] {
  const nez = localityId === "nez-perce-lewiston";
  const local = nez
    ? [
        "Nez Perce County Courthouse is at 1230 Main Street, 2nd floor, Lewiston — confirm hours before you go.",
        "Court Assistance Office phone 208-799-3191. Clerk/small-claims window has been listed at 208-799-3020; district court 208-799-3040 — confirm before you rely on a number.",
        "County self-help page: courtselfhelp.idaho.gov/Local/NezPerce",
      ]
    : [
        "Use the Idaho county courthouse directory to get the right clerk phone and address.",
        "Idaho Court Assistance Office forms live at courtselfhelp.idaho.gov — county CAO staff can point to the packet, not give legal advice.",
      ];

  const byType: Record<string, string[]> = {
    traffic: [
      "Photograph both sides of the citation, including barcodes and the appearance/payment date.",
      "Note whether the paper is a city, county, or Idaho State Police citation — the contest desk can differ.",
      "Ask the clerk whether your option is payment, a hearing in the magistrate division, or another local program. Do not miss the date printed on the ticket.",
      ...local,
    ],
    "small-claims": [
      "Idaho small-claims departments sit in the magistrate division. Statewide money/property cap has been published at $15,000 (Idaho Code 1-2301) — confirm the current statute.",
      "File in the county where the defendant lives or where the dispute arose.",
      "Start with CAO small-claims packets: courtselfhelp.idaho.gov/Forms/claims (plaintiff instructions, summons, service, defendant answer).",
      "Idaho small-claims hearings are designed so parties appear without attorneys — still have a lawyer review a complicated claim before you file.",
      "Nez Perce County has listed a small-claims filing fee on its civil page; treat every dollar amount as something to confirm with the clerk the day you file.",
      ...local,
    ],
    "landlord-tenant": [
      "Idaho eviction (unlawful detainer) uses statewide CAO packets plus local filing rules. Do not ignore a summons.",
      "Bring the lease, notices, rent ledger, photos, and repair requests to the CAO only as copies you keep.",
      nez ? "Nez Perce civil/unlawful detainer information: county civil court page. Confirm any listed filing fee." : "Ask the clerk which unlawful-detainer forms they currently accept.",
      ...local,
    ],
    family: [
      "Idaho family forms (divorce, custody, support) are on courtselfhelp.idaho.gov. Workshops may be offered locally.",
      nez ? "Nez Perce CAO has listed a pro-se forms workshop on the 2nd Wednesday — call 208-799-3191 before you go." : "Ask your county CAO about family-form workshops.",
      ...local,
    ],
    employment: [
      "Idaho wage claims may start with the Idaho Department of Labor and/or a court claim — ask legal aid which door fits your facts.",
      "Keep time records and pay stubs. Agency charge deadlines can be short.",
    ],
    consumer: [
      "If you were served, calendar the answer deadline from the summons. Idaho civil answers are time-limited (often described as 21 days from service — confirm on YOUR papers).",
      ...local,
    ],
    estate: [
      "Idaho wills and powers of attorney have execution formalities. An AI draft is not a valid will.",
      "Use Idaho Legal Aid and a licensed estate lawyer for documents you will sign.",
    ],
    business: [
      "Idaho Secretary of State handles entity filings. Confirm registered-agent and licensing rules for your city as well as the state.",
    ],
    general: local,
  };

  return byType[matterType] ?? local;
}

export function idahoBrief(localityId: string): string {
  const loc = IDAHO_LOCALITIES.find((l) => l.id === localityId);
  const lines = [
    "Idaho pack (verify everything locally):",
    "Self-help forms: https://courtselfhelp.idaho.gov/",
    "Small-claims forms: https://courtselfhelp.idaho.gov/Forms/claims",
    "Legal aid: https://www.idaholegalaid.org/",
    "Statutes: https://legislature.idaho.gov/statutesrules/idstat/",
    loc ? `Selected locality: ${loc.label}` : "",
  ];
  if (localityId === "nez-perce-lewiston") {
    lines.push(
      `Courthouse: ${NEZ_PERCE.courthouse}`,
      `CAO: ${NEZ_PERCE.caoHours}; ${NEZ_PERCE.caoPage}`,
      `Small claims county page: ${NEZ_PERCE.smallClaimsPage}`,
      `City of Lewiston: ${NEZ_PERCE.city}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}
