import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCitations, extractCitations } from "./citations.ts";

describe("auditCitations", () => {
  it("flags a statute the model invented", () => {
    const generated = "Idaho Code 99-9999 requires you to pay within 3 days.";
    const { flagged, text } = auditCitations(generated, "Idaho court self-help small claims forms");
    assert.ok(flagged.some((c) => /99-9999/.test(c)));
    assert.match(text, /UNVERIFIED/);
  });

  it("keeps a citation that actually appears in retrieved text", () => {
    const corpus = "Small claims department. Idaho Code 1-2301. Limit fifteen thousand dollars.";
    const generated = "See Idaho Code 1-2301 for the small claims department.";
    const { flagged, text } = auditCitations(generated, corpus);
    assert.equal(flagged.length, 0);
    assert.equal(text.includes("UNVERIFIED"), false);
  });

  it("flags a citation when the retrieved corpus is empty (index pages do not count)", () => {
    const { flagged } = auditCitations("See Idaho Code 1-2301.", "");
    assert.ok(flagged.length >= 1);
  });
});
