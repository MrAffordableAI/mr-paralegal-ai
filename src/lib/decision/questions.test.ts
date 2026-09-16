import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { materialQuestions } from "./questions.ts";

const empty = {
  summary: "",
  facts: "",
  eventDate: "",
  eventPlace: "",
  parties: "",
  goals: "",
  hasPapers: false,
  answers: {},
};

describe("materialQuestions", () => {
  it("asks where/when/served when the story is empty", () => {
    const ids = materialQuestions(empty).map((q) => q.id);
    assert.ok(ids.includes("where"));
    assert.ok(ids.includes("when"));
    assert.ok(ids.includes("served"));
  });

  it("does not re-ask facts already in intake", () => {
    const ids = materialQuestions({
      ...empty,
      eventDate: "2026-09-12",
      eventPlace: "Lewiston, Nez Perce County, Idaho",
      parties: "City of Lewiston parking unit",
      goals: "contest the parking ticket",
    }).map((q) => q.id);
    assert.equal(ids.includes("when"), false);
    assert.equal(ids.includes("where"), false);
    assert.equal(ids.includes("want"), false);
    assert.equal(ids.includes("parties"), false);
  });
});
