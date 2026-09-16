import {
  Calendar,
  ClipboardList,
  FileSearch,
  FolderOpen,
  Gavel,
  ListChecks,
  MapPin,
  MessageSquare,
  Plus,
  Scale,
  Settings as SettingsIcon,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { DecisionPanel } from "@/components/decision-panel";
import { EvidencePanel } from "@/components/evidence-panel";
import { StateDesk } from "@/components/state-desk";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { askParalegal } from "@/lib/ai";
import { DISCLAIMER, DRAFT_TYPES, MATTER_TYPES, matterChecklist } from "@/lib/catalog";
import { NO_LAW_TASK } from "@/lib/prompts";
import { downloadPdf, downloadWord } from "@/lib/export-docs";
import { IDAHO_LOCALITIES } from "@/lib/idaho";
import { jurisdictionBrief, jurisdictionLabel } from "@/lib/jurisdiction";
import { US_STATES } from "@/lib/states";
import {
  typeLabel,
  useActiveMatter,
  useParalegal,
  type ChatMsg,
  type Matter,
} from "@/lib/store";
import { uid } from "@/lib/utils";

const NAV = [
  { id: "desk", label: "Desk", icon: Scale },
  { id: "decide", label: "Decide", icon: ListChecks },
  { id: "matters", label: "Matters", icon: FolderOpen },
  { id: "evidence", label: "Papers", icon: FileSearch },
  { id: "intake", label: "Intake", icon: ClipboardList },
  { id: "drafts", label: "Drafts", icon: Gavel },
  { id: "research", label: "Research", icon: MessageSquare },
  { id: "state", label: "State", icon: MapPin },
  { id: "dates", label: "Dates", icon: Calendar },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type View = (typeof NAV)[number]["id"];

function aiWhere() {
  const settings = useParalegal.getState().settings;
  return {
    jurisdiction: jurisdictionLabel(settings),
    jurisdictionBrief: jurisdictionBrief(settings),
  };
}

export function ParalegalApp() {
  const [view, setView] = useState<View>("desk");
  const settings = useParalegal((s) => s.settings);
  const matters = useParalegal((s) => s.matters);
  const activeId = useParalegal((s) => s.activeMatterId);
  const matter = useActiveMatter();
  const accept = useParalegal((s) => s.acceptDisclaimer);
  const createMatter = useParalegal((s) => s.createMatter);
  const setActive = useParalegal((s) => s.setActive);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {!settings.acceptedDisclaimer && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ink/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-lg">
            <h2 className="font-display text-2xl">Before you begin</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{DISCLAIMER}</p>
            <p className="mt-3 text-sm text-muted">
              Use this desk to organize facts, photograph papers, and prepare questions. Then talk
              to a licensed attorney in your jurisdiction.
            </p>
            <Button className="mt-5" onClick={accept}>
              I understand — continue
            </Button>
          </div>
        </div>
      )}

      <header className="border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-ink text-accent-fg">
              <Scale className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg leading-tight">Mr. Paralegal</p>
              <p className="text-xs text-muted">Decision support — not a lawyer</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              createMatter();
              setView("intake");
            }}
          >
            <Plus className="size-4" />
            New matter
          </Button>
        </div>
      </header>

      <p className="mx-auto max-w-6xl px-4 py-3 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <nav className="space-y-1 rounded-xl border border-line bg-elevated p-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm ${
                  view === item.id ? "bg-surface text-ink" : "text-muted hover:bg-surface"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 rounded-xl border border-line bg-elevated p-3">
            <p className="text-xs font-medium text-subtle">Matters</p>
            <ul className="mt-2 space-y-1">
              {matters.length === 0 && <li className="text-xs text-muted">None yet</li>}
              {matters.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                      m.id === activeId ? "bg-surface" : "hover:bg-surface"
                    }`}
                    onClick={() => {
                      setActive(m.id);
                      setView("intake");
                    }}
                  >
                    <span className="block truncate font-medium">{m.title}</span>
                    <span className="block text-xs text-subtle">{typeLabel(m.matterType)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="rounded-xl border border-line bg-elevated p-4 sm:p-6">
          {view === "desk" && (
            <Desk
              matter={matter}
              onGo={setView}
              onCreate={() => {
                createMatter();
                setView("intake");
              }}
            />
          )}
          {view === "matters" && (
            <MatterList
              matters={matters}
              activeId={activeId}
              onSelect={(id) => {
                setActive(id);
                setView("intake");
              }}
              onCreate={() => {
                createMatter();
                setView("intake");
              }}
            />
          )}
          {view === "evidence" && <EvidencePanel />}
          {view === "decide" && <DecisionPanel />}
          {view === "intake" && <Intake onNeedMatter={() => createMatter()} />}
          {view === "drafts" && <Drafts />}
          {view === "research" && <Research />}
          {view === "state" && <StateDesk />}
          {view === "dates" && <Dates />}
          {view === "settings" && <SettingsPanel />}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around overflow-x-auto border-t border-line bg-ink px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-accent-fg lg:hidden">
        {NAV.filter((n) => !["desk", "matters", "dates", "research"].includes(n.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[10px] ${
              view === item.id ? "text-accent-fg" : "text-accent-fg/60"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Desk({
  matter,
  onGo,
  onCreate,
}: {
  matter: Matter | null;
  onGo: (v: View) => void;
  onCreate: () => void;
}) {
  const settings = useParalegal((s) => s.settings);
  return (
    <div>
      <h2 className="font-display text-2xl">Desk</h2>
      <p className="mt-2 text-sm text-muted">
        Working jurisdiction:{" "}
        <strong className="text-ink">{jurisdictionLabel(settings)}</strong>
      </p>
      <p className="text-sm text-muted">
        Active matter: <strong className="text-ink">{matter ? matter.title : "none"}</strong>
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onGo("decide")}>Run a decision report</Button>
        <Button variant="secondary" onClick={() => onGo("evidence")}>
          Photograph a ticket
        </Button>
        <Button variant="secondary" onClick={onCreate}>
          Open a new matter
        </Button>
        <Button variant="secondary" onClick={() => onGo("state")}>
          Open state resources
        </Button>
        <Button variant="secondary" onClick={() => onGo("dates")}>
          Track dates
        </Button>
        <Button variant="secondary" onClick={() => onGo("research")}>
          Ask Mr. Paralegal
        </Button>
      </div>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>Set your state. Confirm it is where the event or papers arose — not automatically where you are standing.</li>
        <li>Run a decision report: facts first, official sources second, both sides, then options. Unverified law is labeled.</li>
        <li>Photograph papers and calendar only dates you can actually see.</li>
        <li>Export drafts as Word or PDF. Have a licensed attorney review before you file, pay, or rely on anything.</li>
      </ol>
    </div>
  );
}

function MatterList({
  matters,
  activeId,
  onSelect,
  onCreate,
}: {
  matters: Matter[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const remove = useParalegal((s) => s.removeMatter);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Matters</h2>
        <Button onClick={onCreate}>New</Button>
      </div>
      <ul className="mt-4 space-y-2">
        {matters.length === 0 && <li className="text-sm text-muted">Start a matter, then attach papers.</li>}
        {matters.map((m) => (
          <li
            key={m.id}
            className={`flex items-center justify-between rounded-lg border border-line px-3 py-3 ${
              m.id === activeId ? "bg-surface" : ""
            }`}
          >
            <button type="button" className="min-w-0 text-left" onClick={() => onSelect(m.id)}>
              <span className="block truncate font-medium">{m.title}</span>
              <span className="block text-xs text-subtle">
                {typeLabel(m.matterType)} · {m.evidence.length} paper{m.evidence.length === 1 ? "" : "s"}
              </span>
            </button>
            <Button variant="ghost" size="sm" onClick={() => remove(m.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Intake({ onNeedMatter }: { onNeedMatter: () => void }) {
  const matter = useActiveMatter();
  const updateMatter = useParalegal((s) => s.updateMatter);
  const settings = useParalegal((s) => s.settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!matter) {
    return (
      <div>
        <h2 className="font-display text-2xl">Intake</h2>
        <p className="mt-2 text-sm text-muted">Create a matter first.</p>
        <Button className="mt-4" onClick={onNeedMatter}>
          New matter
        </Button>
      </div>
    );
  }

  const current = matter;
  const list = matterChecklist(current.matterType, settings.stateCode, settings.localityId);

  async function organize() {
    setBusy(true);
    setError("");
    try {
      const result = await askParalegal({
        data: {
          messages: [],
          task: `${NO_LAW_TASK} Turn this intake into a clean memo: parties, timeline, evidence, missing facts, questions for a lawyer. Point to official self-help links from the jurisdiction pack.`,
          input: `Facts:\n${current.facts}\nGoals:\n${current.goals}\nParties:\n${current.parties}`,
          ...aiWhere(),
          matterTitle: current.title,
          matterType: current.matterType,
          facts: current.facts,
          goals: current.goals,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      updateMatter(current.id, {
        messages: [
          ...current.messages,
          { role: "user", content: "Organize this intake.", at: Date.now() },
          { role: "assistant", content: result.text, at: Date.now() },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not organize.");
    } finally {
      setBusy(false);
    }
  }

  function toggleCheck(item: string) {
    const next = current.checked.includes(item)
      ? current.checked.filter((x) => x !== item)
      : [...current.checked, item];
    updateMatter(current.id, { checked: next });
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Intake</h2>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="title">Matter title</Label>
          <Input id="title" value={matter.title} onChange={(e) => updateMatter(matter.id, { title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
            value={matter.matterType}
            onChange={(e) => updateMatter(matter.id, { matterType: e.target.value as Matter["matterType"] })}
          >
            {MATTER_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="parties">Parties</Label>
          <Input
            id="parties"
            value={matter.parties}
            placeholder="Your name / issuing city or company"
            onChange={(e) => updateMatter(matter.id, { parties: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="goals">What do you want?</Label>
          <Textarea
            id="goals"
            value={matter.goals}
            placeholder="Dismiss the ticket, return a deposit, unpaid wages…"
            onChange={(e) => updateMatter(matter.id, { goals: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="facts">Facts in dated order</Label>
          <Textarea
            id="facts"
            value={matter.facts}
            placeholder="2026-09-12: parked on Main. Found a ticket on the windshield…"
            onChange={(e) => updateMatter(matter.id, { facts: e.target.value })}
          />
        </div>
        <Button disabled={busy} onClick={() => void organize()}>
          {busy ? "Working…" : "Organize into an intake memo"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <h3 className="mt-6 font-display text-xl">{list.title}</h3>
      <ul className="mt-2 space-y-2">
        {list.items.map((item) => (
          <li key={item} className="flex gap-2 border-b border-line py-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4"
              checked={current.checked.includes(item)}
              onChange={() => toggleCheck(item)}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Drafts() {
  const matter = useActiveMatter();
  const updateMatter = useParalegal((s) => s.updateMatter);
  const settings = useParalegal((s) => s.settings);
  const [draftType, setDraftType] = useState("contest-letter");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const where = jurisdictionLabel(settings);
  const title = DRAFT_TYPES.find((d) => d.id === draftType)?.label ?? "Draft";

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await askParalegal({
        data: {
          messages: [],
          task: `${NO_LAW_TASK} Produce a clearly labeled DRAFT document. Use [BRACKETS] for unknown facts. Header: draft for attorney review, not legal advice. Point to official self-help from the jurisdiction pack when a form exists. Do not insert statute numbers that are not printed on the user's papers.`,
          input: `Draft type: ${draftType}\n${input}`,
          ...aiWhere(),
          matterTitle: matter?.title,
          matterType: matter?.matterType,
          facts: matter?.facts,
          goals: matter?.goals,
          evidenceNotes: matter?.evidence.map((e) => e.review).filter(Boolean).join("\n\n"),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOutput(result.text);
      if (matter) {
        updateMatter(matter.id, {
          documents: [
            {
              id: uid("doc"),
              title,
              createdAt: new Date().toISOString(),
              body: result.text,
            },
            ...matter.documents,
          ],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Drafts</h2>
      <p className="mt-1 text-sm text-muted">
        Every generated document is a draft for attorney review. Export Word or PDF, fill [BRACKETS],
        then have a lawyer look at it.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="dtype">Draft type</Label>
          <select
            id="dtype"
            className="flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
            value={draftType}
            onChange={(e) => setDraftType(e.target.value)}
          >
            {DRAFT_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="din">Instructions</Label>
          <Textarea
            id="din"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tone, amount, deadline you want to propose…"
          />
        </div>
        <Button disabled={busy} onClick={() => void generate()}>
          {busy ? "Drafting…" : "Generate draft"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        <pre className="min-h-40 whitespace-pre-wrap rounded-lg border border-dashed border-line bg-surface p-4 font-sans text-sm">
          {output || "No draft yet."}
        </pre>
        {output && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadWord(title, output, where)}>
              Download Word
            </Button>
            <Button variant="secondary" onClick={() => downloadPdf(title, output, where)}>
              Download PDF
            </Button>
          </div>
        )}
      </div>
      {matter && matter.documents.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-xl">Saved on this matter</h3>
          <ul className="mt-2 space-y-3">
            {matter.documents.map((doc) => (
              <li key={doc.id} className="rounded-lg border border-line p-3">
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-subtle">{new Date(doc.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => downloadWord(doc.title, doc.body, where)}>
                    Word
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => downloadPdf(doc.title, doc.body, where)}>
                    PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Research() {
  const matter = useActiveMatter();
  const updateMatter = useParalegal((s) => s.updateMatter);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orphan, setOrphan] = useState<ChatMsg[]>([]);
  const messages = matter?.messages ?? orphan;

  async function send() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setBusy(true);
    setError("");
    try {
      const result = await askParalegal({
        data: {
          messages,
          task: `${NO_LAW_TASK} Answer as an organizer: missing facts and next administrative steps. Use the official resource pack. Legal analysis belongs on the Decide report.`,
          input: text,
          ...aiWhere(),
          matterTitle: matter?.title,
          matterType: matter?.matterType,
          facts: matter?.facts,
          goals: matter?.goals,
          evidenceNotes: matter?.evidence.map((e) => e.review || e.name).join("\n"),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next = [
        ...messages,
        { role: "user" as const, content: text, at: Date.now() },
        { role: "assistant" as const, content: result.text, at: Date.now() },
      ];
      if (matter) updateMatter(matter.id, { messages: next });
      else setOrphan(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl">Research desk</h2>
      <p className="mt-1 text-sm text-muted">
        Organize missing facts and official places to look. This desk will not tell you what the law is —
        use Decide for an evidence-first report.
      </p>
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-auto">
        {messages.length === 0 && (
          <div className="rounded-lg bg-surface p-3 text-sm text-muted">
            Start with the paper you uploaded and the outcome you want. I will organize issues — not invent
            case law.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user" ? "ml-[15%] bg-accent text-accent-fg" : "mr-[8%] bg-surface"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <Label htmlFor="ask" className="mt-4">
        Ask Mr. Paralegal
      </Label>
      <Textarea
        id="ask"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder="Example: I have a parking ticket from Lewiston. What should I photograph besides the ticket itself?"
      />
      <Button className="mt-3" disabled={busy} onClick={() => void send()}>
        {busy ? "Thinking…" : "Send"}
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function Dates() {
  const matter = useActiveMatter();
  const updateMatter = useParalegal((s) => s.updateMatter);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  if (!matter) return <p className="text-sm text-muted">Select a matter to track dates.</p>;
  return (
    <div>
      <h2 className="font-display text-2xl">Dates & deadlines</h2>
      <p className="mt-1 text-sm text-muted">
        These are your records only. Confirm every court deadline with the papers and the clerk.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Answer due / hearing / ticket contest"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button
          onClick={() => {
            if (!label || !date) return;
            updateMatter(matter.id, {
              deadlines: [{ id: uid("due"), label, date }, ...matter.deadlines],
            });
            setLabel("");
            setDate("");
          }}
        >
          Add
        </Button>
      </div>
      <ul className="mt-4">
        {matter.deadlines.map((d) => (
          <li key={d.id} className="flex items-center justify-between border-b border-line py-2 text-sm">
            <span>
              <strong>{d.label}</strong>
              <span className="ml-2 text-muted tabular-nums">{d.date}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateMatter(matter.id, {
                  deadlines: matter.deadlines.filter((x) => x.id !== d.id),
                })
              }
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel() {
  const settings = useParalegal((s) => s.settings);
  const patch = useParalegal((s) => s.patchSettings);
  return (
    <div>
      <h2 className="font-display text-2xl">Settings</h2>
      <div className="mt-4 max-w-md space-y-3">
        <div>
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            className="flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
            value={settings.stateCode}
            onChange={(e) =>
              patch({
                stateCode: e.target.value,
                localityId: e.target.value === "ID" ? settings.localityId || "nez-perce-lewiston" : "",
              })
            }
          >
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {settings.stateCode === "ID" && (
          <div>
            <Label htmlFor="loc">Idaho county / city</Label>
            <select
              id="loc"
              className="flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
              value={settings.localityId}
              onChange={(e) => patch({ localityId: e.target.value })}
            >
              {IDAHO_LOCALITIES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {settings.stateCode !== "ID" && (
          <div>
            <Label htmlFor="county">County or city (optional)</Label>
            <Input
              id="county"
              value={settings.localityText}
              onChange={(e) => patch({ localityText: e.target.value })}
            />
          </div>
        )}
        <div>
          <Label htmlFor="role">I am</Label>
          <select
            id="role"
            className="flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
            value={settings.role}
            onChange={(e) => patch({ role: e.target.value })}
          >
            <option value="self-represented">Self-represented</option>
            <option value="helping-family">Helping family</option>
            <option value="student">Student / intern</option>
            <option value="paralegal">Paralegal (supervised)</option>
          </select>
        </div>
        <p className="text-sm text-muted">
          Papers stay in this browser. Reviews go to the assistant only when you tap Read this paper.
          No API keys are stored on your phone — the assistant runs on the server.
        </p>
      </div>

      <div className="mt-8 max-w-md rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <Smartphone className="size-4" />
          <h3 className="font-display text-xl">Add to your phone</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This desk is a home-screen app. On iPhone: Share → Add to Home Screen. On Android: the
          browser menu → Install app. You can also open the illustrated install walkthrough.
        </p>
        <Button className="mt-3" variant="secondary" asChild>
          <a href="?install=1">Open install walkthrough</a>
        </Button>
      </div>
    </div>
  );
}
