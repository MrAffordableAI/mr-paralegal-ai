import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyUrgency } from "./urgency.ts";

describe("classifyUrgency", () => {
  it("escalates a summons", () => {
    const r = classifyUrgency({
      text: "I was served with a summons and complaint yesterday.",
      hasPrintedDate: true,
      served: true,
    });
    assert.equal(r.level, "URGENT_ATTORNEY_REVIEW");
    assert.equal(r.escalate, true);
  });

  it("marks a parking ticket as attention, not an emergency", () => {
    const r = classifyUrgency({
      text: "Parking ticket on the windshield in Lewiston. No court date filled in.",
      hasPrintedDate: false,
      served: false,
    });
    assert.equal(r.level, "ATTENTION_NEEDED");
    assert.equal(r.escalate, false);
  });

  it("escalates a default judgment with a permanent injunction", () => {
    const r = classifyUrgency({
      text: "ORDER OF DECLARATORY JUDGMENT after default. Permanent injunction. Transfer the real property.",
      hasPrintedDate: true,
      served: false,
    });
    assert.equal(r.level, "URGENT_ATTORNEY_REVIEW");
    assert.equal(r.escalate, true);
  });

  it("treats arrest language as emergency", () => {
    const r = classifyUrgency({
      text: "My brother was arrested this morning and is in jail.",
      hasPrintedDate: false,
      served: false,
    });
    assert.equal(r.level, "EMERGENCY");
    assert.equal(r.escalate, true);
  });
});
