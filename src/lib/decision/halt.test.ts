import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jurisdictionHalt, statesMentioned } from "./halt.ts";

describe("statesMentioned", () => {
  it("reads Idaho from a Lewiston place string", () => {
    assert.deepEqual(statesMentioned("Lewiston, Nez Perce County, Idaho"), ["ID"]);
  });

  it("does not treat West Virginia as Virginia", () => {
    const codes = statesMentioned("Charleston, West Virginia");
    assert.ok(codes.includes("WV"));
    assert.equal(codes.includes("VA"), false);
  });

  it("reads Washington state without calling it D.C.", () => {
    const codes = statesMentioned("Pullman, Washington");
    assert.deepEqual(codes, ["WA"]);
  });
});

describe("jurisdictionHalt", () => {
  it("blocks law when the checkbox is off", () => {
    const r = jurisdictionHalt({
      jurisdictionConfirmed: false,
      stateCode: "ID",
      eventPlace: "Lewiston, Idaho",
    });
    assert.equal(r.allowLaw, false);
  });

  it("blocks when the place names a different state than settings", () => {
    const r = jurisdictionHalt({
      jurisdictionConfirmed: true,
      stateCode: "ID",
      eventPlace: "Pullman, Washington",
    });
    assert.equal(r.allowLaw, false);
    assert.equal(r.conflictCode, "WA");
  });

  it("allows only when confirmed and the place names the selected state", () => {
    const r = jurisdictionHalt({
      jurisdictionConfirmed: true,
      stateCode: "ID",
      eventPlace: "Lewiston, Nez Perce County, Idaho",
    });
    assert.equal(r.allowLaw, true);
  });

  it("blocks an empty place even if the box is checked", () => {
    const r = jurisdictionHalt({
      jurisdictionConfirmed: true,
      stateCode: "ID",
      eventPlace: "",
    });
    assert.equal(r.allowLaw, false);
  });
});
