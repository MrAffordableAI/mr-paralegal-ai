import { ShieldAlert, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { isDemoSituation, paperSituation, readPaper, usableNarrative } from "@/lib/decision/paper";
import { materialQuestions } from "@/lib/decision/questions";
import { runDecision } from "@/lib/decision/run";
import type { DecisionReport, FollowUp } from "@/lib/decision/types";
import { downloadPdf, downloadWord } from "@/lib/export-docs";
import { jurisdictionBrief, jurisdictionLabel } from "@/lib/jurisdiction";
import { useActiveMatter, useParalegal } from "@/lib/store";

function reportText(r: DecisionReport) {
  return [
    "DRAFT FOR ATTORNEY REVIEW — NOT LEGAL ADVICE. Not a lawyer. Not a substitute for one.",
    `Urgency: ${r.urgency}`,
    `Fully reviewed: ${r.fullyReviewed ? "no — gates still open" : "no"}`,
    "",
    "YOUR SITUATION",
    r.situation,
    "",
    "WHAT WE FOUND",
    r.found,
    "",
    "JURISDICTION",
    r.jurisdiction,
    "",
    "IMPORTANT FACTS",
    r.importantFacts,
    "",
    "WHAT THE LAW APPEARS TO SAY",
    r.whatLawAppearsToSay,
    "",
    "HOW THE LAW MAY APPLY",
    r.howLawMayApply,
    "",
    "FACTS HELPING YOUR POSITION",
    r.factsHelping,
    "",
    "FACTS THAT MAY HURT YOUR POSITION",
    r.factsHurting,
    "",
    "WHAT THE OTHER SIDE COULD ARGUE",
    r.otherSide,
    "",
    "WHAT IS STILL UNKNOWN",
    r.stillUnknown,
    "",
    "IMPORTANT DEADLINES",
    r.deadlines,
    "",
    "YOUR OPTIONS",
    r.options,
    "",
    "PRACTICAL NEXT STEPS",
    r.nextSteps,
    "",
    "WHEN TO CONSIDER AN ATTORNEY",
    r.attorney,
    "",
    "SOURCES",
    ...r.sources.map((s) => `${s.title} [${s.verificationStatus}] ${s.officialSourceUrl}`),
    r.conflicts.length ? "\nCONFLICT DETECTED\n" + r.conflicts.map((c) => `${c.topic}: ${c.sourceA} vs ${c.sourceB}`).join("\n") : "",
  ]
    .filter((x) => x !== undefined)
    .join("\n");
}

export function DecisionPanel() {
  const matter = useActiveMatter();
  const settings = useParalegal((s) => s.settings);
  const updateMatter = useParalegal((s) => s.updateMatter);
  const createMatter = useParalegal((s) => s.createMatter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"intake" | "questions" | "report">("intake");

  const current = matter;
  const questions = useMemo(() => {
    if (!current) return [];
    const answers: Record<string, string> = {};
    for (const f of current.followUps) answers[f.id] = f.answer;
    return materialQuestions({
      summary: current.userSummary || current.facts,
      facts: current.facts,
      eventDate: current.eventDate,
      eventPlace: current.eventPlace,
      parties: current.parties,
      goals: current.goals,
      hasPapers: current.evidence.length > 0,
      answers,
    });
  }, [current]);

  if (!current) {
    return (
      <div>
        <h2 className="font-display text-2xl">Decision report</h2>
        <p className="mt-2 text-sm text-muted">
          Describe a situation, confirm where it arose, then run an evidence-first report. This is not a
          lawyer and will not invent the law.
        </p>
        <Button className="mt-4" onClick={() => createMatter({ title: "New situation" })}>
          Start a matter
        </Button>
      </div>
    );
  }

  const m = current;

  const patch = (partial: Parameters<typeof updateMatter>[1]) => {
    updateMatter(m.id, partial);
  };

  const saveAnswers = (list: FollowUp[]) => {
    const next = list.map((q) => {
      const existing = m.followUps.find((f) => f.id === q.id);
      return existing ?? q;
    });
    patch({ followUps: next });
  };

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await runDecision({
        data: {
          summary: m.userSummary || m.facts,
          facts: m.facts,
          goals: m.goals,
          parties: m.parties,
          eventDate: m.eventDate,
          eventPlace: m.eventPlace,
          stateCode: settings.stateCode,
          localityNote: jurisdictionLabel(settings),
          jurisdictionConfirmed: m.jurisdictionConfirmed,
          jurisdictionLabel: jurisdictionLabel(settings),
          jurisdictionBrief: jurisdictionBrief(settings),
          evidenceNotes: m.evidence
            .map((e) => `FILE ${e.name} kind=${e.paperKind || ""}\n${e.extractedText || ""}\n${e.review || ""}`)
            .join("\n\n"),
          followUps: m.followUps.map((f) => `${f.question} ${f.answer}`).join("\n"),
          recordedDeadlines: m.deadlines.map((d) => ({ label: d.label, date: d.date })),
        },
      });
      if (!result.ok) {
        setError("The report could not be assembled.");
        return;
      }
      patch({ decision: result.report });
      setStep("report");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed.");
    } finally {
      setBusy(false);
    }
  };

  const report = m.decision;

  return (
    <div>
      <h2 className="font-display text-2xl">Decision report</h2>
      <p className="mt-1 text-sm text-muted">
        Evidence first, law second, analysis third, conclusion last. Unverified law is labeled. This is
        decision support, not legal advice.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={step === "intake" ? "default" : "secondary"} size="sm" onClick={() => setStep("intake")}>
          1. Situation
        </Button>
        <Button variant={step === "questions" ? "default" : "secondary"} size="sm" onClick={() => setStep("questions")}>
          2. Material questions
        </Button>
        <Button variant={step === "report" ? "default" : "secondary"} size="sm" onClick={() => setStep("report")}>
          3. Report
        </Button>
      </div>

      {step === "intake" && (
        <div className="mt-4 space-y-3">
          {m.evidence.length > 0 &&
            (() => {
              const paper = readPaper(
                m.evidence.map((e) => `FILE ${e.name}\n${e.extractedText || ""}`).join("\n"),
                m.evidence[0]?.name ?? "",
              );
              const sit = paperSituation(paper);
              if (!sit) return null;
              const leftover = isDemoSituation(`${m.userSummary} ${m.facts}`);
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-3 text-sm">
                  <p>
                    Papers on file look like a court document
                    {paper.causeNumber ? ` (Cause ${paper.causeNumber})` : ""}. The report will follow the papers
                    {leftover ? " — the typed example story will be ignored." : "."}
                  </p>
                  {leftover && (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        patch({
                          userSummary: sit,
                          facts: sit,
                          parties: m.parties.trim() || paper.suggestedTitle,
                          eventPlace: m.eventPlace.trim() || paper.court || "",
                          matterType: paper.suggestedMatterType,
                          title:
                            m.title === "Ticket / papers" || m.title === "Untitled matter" || m.title === "New situation"
                              ? paper.suggestedTitle
                              : m.title,
                        })
                      }
                    >
                      Replace story with what the papers say
                    </Button>
                  )}
                </div>
              );
            })()}
          <div>
            <Label htmlFor="sum">What happened?</Label>
            <Textarea
              id="sum"
              value={current.userSummary}
              placeholder="Plain facts from you. Do not paste the example. If you uploaded a court order, you can leave this short."
              onChange={(e) =>
                patch({
                  userSummary: e.target.value,
                  facts: usableNarrative(current.facts) ? current.facts : e.target.value,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="place">Where did it happen / which court is on the paper?</Label>
            <Input
              id="place"
              value={current.eventPlace}
              placeholder="City, county, state — not automatically your current location"
              onChange={(e) => patch({ eventPlace: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="when">Event date (from you or the paper)</Label>
            <Input id="when" type="date" value={current.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={current.jurisdictionConfirmed}
              onChange={(e) => patch({ jurisdictionConfirmed: e.target.checked })}
            />
            <span>
              I confirm the working jurisdiction is <strong>{jurisdictionLabel(settings)}</strong> and I understand
              that may be wrong if the paper names a different court. Change it under State / Settings first.
            </span>
          </label>
          <Button
            onClick={() => {
              saveAnswers(questions);
              setStep("questions");
            }}
          >
            Continue to material questions
          </Button>
        </div>
      )}

      {step === "questions" && (
        <div className="mt-4 space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-muted">No extra material questions — you already covered the usual ones.</p>
          )}
          {questions.map((q) => {
            const existing = current.followUps.find((f) => f.id === q.id);
            const value = existing?.answer ?? "";
            return (
              <div key={q.id}>
                <Label htmlFor={q.id}>{q.question}</Label>
                <p className="mb-1 text-xs text-subtle">{q.why}</p>
                <Textarea
                  id={q.id}
                  value={value}
                  onChange={(e) => {
                    const others = current.followUps.filter((f) => f.id !== q.id);
                    patch({ followUps: [...others, { ...q, answer: e.target.value }] });
                  }}
                />
              </div>
            );
          })}
          <Button disabled={busy} onClick={() => void run()}>
            {busy ? "Retrieving official pages and assembling…" : "Run evidence-first report"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === "report" && !report && (
        <div className="mt-4">
          <p className="text-sm text-muted">No report yet.</p>
          <Button className="mt-3" disabled={busy} onClick={() => void run()}>
            {busy ? "Working…" : "Run report"}
          </Button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      {step === "report" && report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: DecisionReport }) {
  const where = useParalegal((s) => jurisdictionLabel(s.settings));
  return (
    <div className="mt-5 space-y-5">
      {report.lawWithheld && (
        <p className="flex items-start gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          Legal conclusions are withheld. Official homepages are not controlling law. Confirm jurisdiction and read the official links — then have a lawyer apply them.
        </p>
      )}
      {report.fullyReviewed ? null : (
        <p className="flex items-start gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          This matter is not fully reviewed. A fluent write-up is not the same as verified law.
        </p>
      )}
      {report.escalate && (
        <p className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          Attorney review is recommended: {report.urgency.replaceAll("_", " ")}. {report.urgencyWhy}
        </p>
      )}

      <section>
        <h3 className="font-display text-xl">Safety gates</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {report.gates.map((g) => (
            <li key={g.id} className="flex gap-2 border-b border-line py-2">
              <span className={g.status === "pass" ? "text-ok" : "text-danger"}>{g.status === "pass" ? "Pass" : "Open"}</span>
              <span>
                <strong className="font-medium">{g.id.replaceAll("_", " ")}</strong>
                <span className="block text-muted">{g.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Section title="Your situation" body={report.situation} />
      <Section title="What we found" body={report.found} />
      <div>
        <h3 className="font-display text-xl">Possible issues</h3>
        <p className="mt-1 text-xs text-subtle">Possibilities to research — not a finding that they apply.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {report.issues.map((i) => (
            <li key={i.id}>
              <strong>{i.label}.</strong> {i.whyPossible}
            </li>
          ))}
        </ul>
      </div>
      <Section title="Jurisdiction" body={report.jurisdiction} />
      <Section title="Important facts" body={report.importantFacts} />
      <Section title="What the law appears to say" body={report.whatLawAppearsToSay} />
      <Section title="How the law may apply" body={report.howLawMayApply} />
      <Section title="Facts helping your position" body={report.factsHelping} />
      <Section title="Facts that may hurt your position" body={report.factsHurting} />
      <Section title="What the other side could argue" body={report.otherSide} />
      <Section title="What is still unknown" body={report.stillUnknown} />
      <Section title="Important deadlines" body={report.deadlines} />
      <Section title="Your options" body={report.options} />
      <Section title="Practical next steps" body={report.nextSteps} />
      <Section title="When to consider an attorney" body={report.attorney} />

      {report.conflicts.length > 0 && (
        <div>
          <h3 className="font-display text-xl">Conflict detected</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {report.conflicts.map((c) => (
              <li key={c.id} className="rounded-lg border border-line p-3">
                <p>
                  <strong>{c.topic}</strong>
                </p>
                <p>Source A says: {c.sourceA}</p>
                <p>Source B says: {c.sourceB}</p>
                <p className="text-muted">{c.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.issueAnalyses.length > 0 && (
        <div>
          <h3 className="font-display text-xl">Issue / rule / application</h3>
          <div className="mt-2 space-y-3">
            {report.issueAnalyses.map((a, i) => (
              <article key={i} className="rounded-lg border border-line p-3 text-sm leading-relaxed">
                <p>
                  <strong>Issue.</strong> {a.issue}
                </p>
                <p>
                  <strong>Rule.</strong> {a.rule}
                </p>
                <p>
                  <strong>Authority.</strong> {a.authority}
                </p>
                <p>
                  <strong>Facts for.</strong> {a.factsFor}
                </p>
                <p>
                  <strong>Facts against.</strong> {a.factsAgainst}
                </p>
                <p>
                  <strong>Missing.</strong> {a.missingFacts}
                </p>
                <p>
                  <strong>Your possible argument.</strong> {a.userArgument}
                </p>
                <p>
                  <strong>Opposing argument.</strong> {a.opposingArgument}
                </p>
                <p>
                  <strong>Uncertainty.</strong> {a.uncertainty}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-display text-xl">Sources</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {report.sources.map((s) => (
            <li key={s.officialSourceUrl} className="rounded-lg border border-line p-3">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-subtle">
                {s.verificationStatus} · {s.retrievedDate.slice(0, 10)}
              </p>
              <a className="text-sm underline" href={s.officialSourceUrl} target="_blank" rel="noreferrer">
                {s.officialSourceUrl}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => downloadWord("Decision report", reportText(report), where)}>
          Download Word
        </Button>
        <Button variant="secondary" onClick={() => downloadPdf("Decision report", reportText(report), where)}>
          Download PDF
        </Button>
      </div>

      {report.auditLog.length > 0 && (
        <section>
          <h3 className="font-display text-xl">Run log</h3>
          <p className="mt-1 text-xs text-subtle">Why this report said what it said — not a legal opinion.</p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {report.auditLog.map((s, i) => (
              <li key={i}>
                <strong className="font-medium">{s.step}.</strong> {s.detail}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{body || "—"}</p>
    </section>
  );
}
