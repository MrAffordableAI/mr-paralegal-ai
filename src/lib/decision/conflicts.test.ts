import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectConflicts } from "./conflicts.ts";

describe("detectConflicts", () => {
  it("surfaces a dollar clash and does not pick a winner", () => {
    const conflicts = detectConflicts([
      { id: "user", label: "Your notes", text: "They billed me $400.00 on 2026-09-01" },
      { id: "paper", label: "Invoice photo", text: "Amount due $720.00 dated 2026-09-01" },
    ]);
    assert.ok(conflicts.some((c) => c.topic === "money"));
    assert.match(conflicts[0]!.sourceA, /400/);
    assert.match(conflicts[0]!.sourceB, /720/);
  });

  it("is quiet when only one source has numbers", () => {
    const conflicts = detectConflicts([
      { id: "user", label: "Your notes", text: "They billed me $400.00" },
      { id: "paper", label: "Photo", text: "illegible" },
    ]);
    assert.equal(conflicts.length, 0);
  });
});
