import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPaperKind, readPaper } from "./paper.ts";

const JUDGMENT = `
IN THE SUPERIOR COURT OF WASHINGTON FOR PIERCE COUNTY
EUGENE AND CAROLINE DEMESA AND THE MARITAL COMMUNITY COMPRISED THEREOF,
Plaintiffs,
v.
ROBERT COURVILLE AND THE MARITAL COMMUNITY COMPRISED THEREOF,
Defendants.
No. 19-2-07696-3
ORDER OF DECLARATORY JUDGMENT
THIS MATTER having come before the undersigned and the court being duly advised
in the premises and having entered an Order of Default, it is hereby ORDERED, ADJUDGED AND DECREED that:
A. Plaintiff, EUGENE DEMESA, is the sole and exclusive 100% owner of Cloud 9 Smoke & Ale, LLC.
B. Defendant, ROBERT COURVILLE, is hereby directed to transfer the real property located at 23051 SR 195 Pullman WA 99362 in its entirety to Cloud 9 Smoke & Ale, LLC forthwith.
C. Defendant ROBERT COURVILLE is hereby directed to provide an accounting of all business income.
D. Defendant is prohibited by way of permanent injunction to take any further action detrimental to Plaintiff.
E. Defendant is prohibited, by way of Permanent Injunction, from blocking access to Plaintiff from entering on the real property.
Done in open court this 20th day of June 2019
Judge/ Court Commissioner KEVIN RUNDLE
`;

describe("classifyPaperKind", () => {
  it("reads a signed default / declaratory judgment as a court order, not a ticket", () => {
    assert.equal(classifyPaperKind(JUDGMENT, "Cloud 9 signed default Judgement.pdf"), "court-order");
  });

  it("still classifies a parking ticket as a ticket", () => {
    assert.equal(
      classifyPaperKind("Parking ticket on the windshield. Pay by 10/01/2026. Infraction 123.", "ticket.jpg"),
      "ticket",
    );
  });
});

describe("readPaper", () => {
  const read = readPaper(JUDGMENT, "Cloud 9 signed default Judgement.pdf");

  it("pulls Washington, Pierce County, and the cause number", () => {
    assert.equal(read.printedStateCode, "WA");
    assert.match(read.court ?? "", /superior court of washington/i);
    assert.equal(read.causeNumber, "19-2-07696-3");
    assert.equal(read.suggestedMatterType, "civil");
  });

  it("lists lettered decretal paragraphs instead of ticket fields", () => {
    assert.ok(read.relief.some((r) => /100% owner/i.test(r)));
    assert.ok(read.relief.some((r) => /23051 SR 195/i.test(r)));
    assert.ok(read.relief.some((r) => /permanent injunction/i.test(r)));
  });
});
