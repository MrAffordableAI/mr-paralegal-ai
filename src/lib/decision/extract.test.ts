import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractEvidenceFacts } from "./extract.ts";

describe("extractEvidenceFacts", () => {
  it("pulls printed money and dates with an excerpt, and does not invent a statute", () => {
    const facts = extractEvidenceFacts(
      "City of Lewiston Parking Citation No. L12345. Amount due $35.00. Date 09/12/2026. Pay by 10/01/2026.",
      "ticket",
    );
    assert.ok(facts.some((f) => f.kind === "money" && f.value.includes("35")));
    assert.ok(facts.some((f) => f.kind === "date"));
    assert.ok(facts.some((f) => f.kind === "case-number" && /L12345/.test(f.value)));
    assert.ok(facts.every((f) => f.excerpt.length > 0 && f.confidence === "printed"));
  });

  it("pulls a Washington superior-court cause number", () => {
    const facts = extractEvidenceFacts("No. 19-2-07696-3 ORDER OF DECLARATORY JUDGMENT");
    assert.ok(facts.some((f) => f.kind === "case-number" && f.value === "19-2-07696-3"));
  });
});
