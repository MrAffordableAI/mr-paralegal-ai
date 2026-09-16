import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { spotIssues, spotIssuesFrom } from "./issues.ts";

describe("spotIssues", () => {
  it("spots multiple issues without treating them as findings", () => {
    const text = "My neighbor opened my closed fence without permission and my dog bit him.";
    const issues = spotIssues(text);
    const ids = issues.map((i) => i.id);
    assert.ok(ids.includes("animal"));
    assert.ok(ids.includes("trespass"));
    assert.ok(issues.every((i) => i.status === "possible"));
  });

  it("spots a default / declaratory judgment as civil court, not a ticket", () => {
    const issues = spotIssues(
      "ORDER OF DECLARATORY JUDGMENT. Default entered. Permanent injunction. Transfer the real property in Pullman WA.",
    );
    const ids = issues.map((i) => i.id);
    assert.ok(ids.includes("civil-judgment"));
    assert.ok(ids.includes("real-property"));
    assert.equal(ids.includes("traffic"), false);
  });

  it("does not treat the word citation in a review as a parking ticket", () => {
    const issues = spotIssues(
      "Citation / case number: Cause No. 19-2-07696-3. ORDER OF DECLARATORY JUDGMENT. Permanent injunction.",
    );
    const ids = issues.map((i) => i.id);
    assert.equal(ids.includes("traffic"), false);
    assert.ok(ids.includes("civil-judgment"));
  });
});

describe("spotIssuesFrom", () => {
  it("ignores leftover dog-bite demo text when a court order is on file", () => {
    const issues = spotIssuesFrom({
      userText: "Neighbor opened my closed fence and got bit by my dog in my yard",
      paperText: `FILE Cloud 9 signed default Judgement.pdf
IN THE SUPERIOR COURT OF WASHINGTON FOR PIERCE COUNTY
No. 19-2-07696-3
ORDER OF DECLARATORY JUDGMENT
it is hereby ORDERED, ADJUDGED AND DECREED
A. Plaintiff is the sole and exclusive 100% owner of Cloud 9 Smoke & Ale, LLC.
B. Defendant is directed to transfer the real property located at 23051 SR 195 Pullman WA.
Citation / case number: 19-2-07696-3`,
    });
    const ids = issues.map((i) => i.id);
    assert.ok(ids.includes("civil-judgment"));
    assert.ok(ids.includes("real-property"));
    assert.equal(ids.includes("traffic"), false);
    assert.equal(ids.includes("animal"), false);
    assert.equal(ids.includes("housing"), false);
  });
});
