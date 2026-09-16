import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateGates, isFullyReviewed } from "./gates.ts";

const base = {
  stateCode: "ID",
  eventPlace: "",
  jurisdictionConfirmed: false,
  allowLaw: false,
  jurisdictionDetail: "not confirmed",
  facts: "",
  summary: "",
  eventDate: "",
  authorities: [],
  conflicts: [],
  deadlines: [],
  escalationChecked: false,
  temporalValidated: false,
};

describe("evaluateGates", () => {
  it("blocks jurisdiction-specific conclusions until confirmed", () => {
    const gates = evaluateGates(base);
    const j = gates.find((g) => g.id === "JURISDICTION_CONFIRMED")!;
    assert.equal(j.status, "fail");
    assert.equal(isFullyReviewed(gates), false);
  });

  it("never marks fully reviewed just because the narrative is long", () => {
    const gates = evaluateGates({
      ...base,
      summary: "x".repeat(80),
      facts: "y".repeat(80),
      eventPlace: "Lewiston, Idaho",
      jurisdictionConfirmed: true,
      allowLaw: true,
      jurisdictionDetail: "ok",
      escalationChecked: true,
      eventDate: "2026-09-12",
    });
    assert.equal(isFullyReviewed(gates), false);
    assert.equal(gates.find((g) => g.id === "LEGAL_AUTHORITY_VERIFIED")!.status, "fail");
    assert.equal(gates.find((g) => g.id === "DEADLINE_VERIFIED")!.status, "fail");
    assert.equal(gates.find((g) => g.id === "TEMPORAL_VALIDITY_CHECKED")!.status, "fail");
  });

  it("does not treat a homepage fetch as verified controlling law", () => {
    const gates = evaluateGates({
      ...base,
      allowLaw: true,
      jurisdictionConfirmed: true,
      eventPlace: "Lewiston, Idaho",
      authorities: [
        {
          authorityType: "self-help",
          title: "Idaho court self-help",
          jurisdiction: "Idaho",
          citation: "",
          officialSourceUrl: "https://courtselfhelp.idaho.gov/",
          retrievedDate: "2026-09-15",
          relevantExcerpt: "x".repeat(200),
          verificationStatus: "retrieved",
          role: "index_page",
        },
      ],
    });
    assert.equal(gates.find((g) => g.id === "LEGAL_AUTHORITY_VERIFIED")!.status, "fail");
  });

  it("does not treat an unverified or user-typed deadline as verified", () => {
    const gates = evaluateGates({
      ...base,
      deadlines: [
        {
          deadlineType: "answer",
          date: "2026-10-01",
          jurisdiction: "ID",
          authority: "model guess",
          calculationMethod: "invented",
          confidence: "unverified",
          verificationStatus: "unverified",
        },
        {
          deadlineType: "pay",
          date: "2026-10-01",
          jurisdiction: "ID",
          authority: "Dates tab",
          calculationMethod: "user typed",
          confidence: "user-stated",
          verificationStatus: "user-recorded",
        },
      ],
    });
    assert.equal(gates.find((g) => g.id === "DEADLINE_VERIFIED")!.status, "fail");
  });
});
