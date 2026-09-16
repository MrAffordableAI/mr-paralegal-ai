import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleReport } from "./assemble.ts";

const ticket = {
  summary: "I found a parking ticket on my windshield in Lewiston, Idaho and I want to contest it.",
  facts: "2026-09-12 parked on Main Street. Ticket on windshield. No accident.",
  goals: "Contest the ticket",
  parties: "City of Lewiston",
  eventDate: "2026-09-12",
  eventPlace: "Lewiston, Nez Perce County, Idaho",
  jurisdictionLabel: "Idaho — Nez Perce County — Lewiston",
  stateCode: "ID",
  jurisdictionConfirmed: true,
  evidenceNotes: "Citation amount $35.00 due date UNREADABLE",
  issues: [
    {
      id: "traffic",
      label: "Parking / traffic citation",
      whyPossible: "ticket language",
      status: "possible" as const,
    },
  ],
  authorities: [
    {
      authorityType: "self-help" as const,
      title: "Idaho court self-help",
      jurisdiction: "Idaho",
      citation: "",
      officialSourceUrl: "https://courtselfhelp.idaho.gov/",
      retrievedDate: "2026-09-15",
      relevantExcerpt: "Court Assistance Office forms and instructions for Idaho courts.",
      verificationStatus: "retrieved" as const,
      role: "index_page" as const,
    },
  ],
  conflicts: [],
  deadlines: [],
  retrievedCorpus: "",
};

describe("assembleReport benchmark: Lewiston parking ticket", () => {
  const report = assembleReport({
    ...ticket,
    model: {
      whatLawAppearsToSay: "Idaho Code 99-9999 makes all parking tickets void. 42 U.S.C. 1983 also applies automatically.",
      otherSide: "The city can argue the ticket was validly issued.",
    },
  });

  it("does not declare the matter fully reviewed", () => {
    assert.equal(report.fullyReviewed, false);
  });

  it("withholds invented law when only an index page was retrieved", () => {
    assert.equal(report.lawWithheld, true);
    assert.equal(report.whatLawAppearsToSay.includes("void"), false);
    assert.equal(report.issueAnalyses.length, 0);
    assert.equal(report.gates.find((g) => g.id === "LEGAL_AUTHORITY_VERIFIED")!.status, "fail");
  });

  it("keeps two-sided analysis", () => {
    assert.match(report.otherSide.toLowerCase(), /city|valid|ticket/);
  });

  it("refuses to invent a deadline", () => {
    assert.match(report.deadlines, /requires verification/i);
  });
});

describe("assembleReport jurisdiction halt", () => {
  it("drops model statutes when the user has not confirmed jurisdiction", () => {
    const report = assembleReport({
      ...ticket,
      jurisdictionConfirmed: false,
      eventPlace: "",
      model: {
        whatLawAppearsToSay: "Idaho Code 1-2301 always applies.",
      },
    });
    assert.equal(report.lawWithheld, true);
    assert.match(report.whatLawAppearsToSay, /withheld/i);
    assert.equal(report.whatLawAppearsToSay.includes("1-2301 always applies"), false);
    assert.equal(report.gates.find((g) => g.id === "JURISDICTION_CONFIRMED")!.status, "fail");
  });

  it("halts when the event is in a different state than settings", () => {
    const report = assembleReport({
      ...ticket,
      stateCode: "ID",
      eventPlace: "Pullman, Washington",
      jurisdictionConfirmed: true,
      model: { whatLawAppearsToSay: "Idaho parking tickets are void." },
    });
    assert.equal(report.lawWithheld, true);
    assert.match(report.jurisdiction, /Washington/i);
  });
});

describe("assembleReport court order vs leftover demo story", () => {
  it("describes the judgment, not a dog-bite example, and does not show a one-letter fact", () => {
    const report = assembleReport({
      ...ticket,
      summary: "Neighbor opened my closed fence and got bit by my dog in my yard",
      facts: "N",
      eventPlace: "Washington",
      stateCode: "ID",
      jurisdictionConfirmed: false,
      evidenceNotes: `FILE Cloud 9 signed default Judgement.pdf
IN THE SUPERIOR COURT OF WASHINGTON FOR PIERCE COUNTY
EUGENE DEMESA v. ROBERT COURVILLE
No. 19-2-07696-3
ORDER OF DECLARATORY JUDGMENT
it is hereby ORDERED, ADJUDGED AND DECREED that:
A. Plaintiff, EUGENE DEMESA, is the sole and exclusive 100% owner of Cloud 9 Smoke & Ale, LLC.
B. Defendant is directed to transfer the real property located at 23051 SR 195 Pullman WA 99362.
Citation / case number: 19-2-07696-3`,
      issues: [
        {
          id: "civil-judgment",
          label: "Civil court order / default or declaratory judgment",
          whyPossible: "judgment",
          status: "possible",
        },
      ],
      model: {},
    });
    assert.match(report.situation, /19-2-07696-3/);
    assert.equal(/got bit by my dog/i.test(report.situation), false);
    assert.equal(report.importantFacts.trim() === "N", false);
    assert.match(report.nextSteps, /docket|clerk/i);
    assert.match(report.attorney, /paper/i);
  });
});
