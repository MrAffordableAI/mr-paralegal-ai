import { FileUp, LoaderCircle, ScanSearch, Trash2, Camera } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { reviewDocuments } from "@/lib/ai";
import { extractEvidenceFacts } from "@/lib/decision/extract";
import {
  matterUnrelatedToPaper,
  paperSituation,
  paperStateLabel,
  readPaper,
  structuredPaperNotes,
  type PaperRead,
} from "@/lib/decision/paper";
import { fileToEvidence, isSupportedFile, dataUrlPayload } from "@/lib/files";
import { briefForState, jurisdictionBrief, jurisdictionLabel } from "@/lib/jurisdiction";
import { useActiveMatter, useParalegal } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

function imagesFor(item: { previewUrl: string; pagePreviews?: string[]; name: string }) {
  const urls = item.pagePreviews?.length ? item.pagePreviews : item.previewUrl ? [item.previewUrl] : [];
  const images = [];
  for (const url of urls.slice(0, 3)) {
    const payload = dataUrlPayload(url);
    if (payload) images.push({ mime: payload.mime, data: payload.data, name: item.name });
  }
  return images;
}

export function EvidencePanel() {
  const matter = useActiveMatter();
  const addEvidence = useParalegal((s) => s.addEvidence);
  const patchEvidence = useParalegal((s) => s.patchEvidence);
  const removeEvidence = useParalegal((s) => s.removeEvidence);
  const createMatter = useParalegal((s) => s.createMatter);
  const patchSettings = useParalegal((s) => s.patchSettings);
  const settings = useParalegal((s) => s.settings);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [drag, setDrag] = useState(false);

  const paperReads = useMemo(() => {
    return (matter?.evidence ?? []).map((item) => readPaper(item.extractedText ?? "", item.name));
  }, [matter?.evidence]);

  const mismatch = paperReads.find((r) => r.printedStateCode && r.printedStateCode !== settings.stateCode);

  async function ingest(files: FileList | File[]) {
    const list = Array.from(files).filter(isSupportedFile);
    if (!list.length) {
      setError("Use a photo (JPEG/PNG), a PDF, or a text file.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const items = [];
      for (const file of list.slice(0, 6)) {
        items.push(await fileToEvidence(file));
      }
      const combined = items.map((i) => i.extractedText ?? "").join("\n");
      const parsed = readPaper(combined, items[0]?.name ?? "");
      const story = `${matter?.userSummary ?? ""} ${matter?.facts ?? ""} ${matter?.title ?? ""}`;
      const startFresh = !matter || matterUnrelatedToPaper(story, matter.matterType, parsed);
      const target = startFresh
        ? createMatter({
            title: parsed.suggestedTitle,
            matterType: parsed.suggestedMatterType,
            eventPlace: parsed.printedStateCode ? paperStateLabel(parsed.printedStateCode) ?? "" : "",
            userSummary: paperSituation(parsed),
            facts: paperSituation(parsed),
            parties: parsed.suggestedTitle,
          })
        : matter;
      const stamped = items.map((item) => ({
        ...item,
        paperKind: readPaper(item.extractedText ?? "", item.name).kind,
      }));
      addEvidence(target.id, stamped);
      const facts = stamped.flatMap((item) => extractEvidenceFacts(item.extractedText ?? "", item.id));
      const existing = useParalegal.getState().matters.find((m) => m.id === target.id);
      const patch: {
        evidenceFacts?: typeof facts;
        matterType?: typeof parsed.suggestedMatterType;
        title?: string;
        userSummary?: string;
        facts?: string;
        eventPlace?: string;
        parties?: string;
      } = {};
      if (facts.length) patch.evidenceFacts = [...facts, ...(existing?.evidenceFacts ?? [])].slice(0, 40);
      if (parsed.suggestedMatterType !== "traffic" && (existing?.matterType === "traffic" || existing?.matterType === "general")) {
        patch.matterType = parsed.suggestedMatterType;
      }
      if (existing && (existing.title === "Ticket / papers" || existing.title === "Untitled matter" || existing.title === "New situation")) {
        patch.title = parsed.suggestedTitle;
      }
      if (existing && !existing.userSummary.trim() && paperSituation(parsed)) {
        patch.userSummary = paperSituation(parsed);
        patch.facts = paperSituation(parsed);
      }
      if (existing && !existing.eventPlace.trim() && parsed.printedStateCode) {
        patch.eventPlace = paperStateLabel(parsed.printedStateCode) ?? "";
      }
      if (existing && !existing.parties.trim() && parsed.suggestedTitle) {
        patch.parties = parsed.suggestedTitle;
      }
      if (Object.keys(patch).length) {
        useParalegal.getState().updateMatter(target.id, patch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  function reviewPayload(extractedText: string, images: { mime: string; data: string; name: string }[], parsed: PaperRead) {
    const mismatchNow = Boolean(parsed.printedStateCode && parsed.printedStateCode !== settings.stateCode);
    return {
      images,
      extractedText,
      question: question || undefined,
      jurisdiction: jurisdictionLabel(settings),
      jurisdictionBrief: jurisdictionBrief(settings),
      paperKind: parsed.kind,
      paperNotes: structuredPaperNotes(parsed),
      paperStateBrief: parsed.printedStateCode ? briefForState(parsed.printedStateCode) : undefined,
      jurisdictionMismatch: mismatchNow,
      matterTitle: matter?.title,
      matterType: matter?.matterType,
      facts: matter?.facts,
      goals: matter?.goals,
    };
  }

  async function reviewOne(id: string) {
    if (!matter) return;
    const item = matter.evidence.find((e) => e.id === id);
    if (!item) return;
    setError("");
    setBusy(true);
    try {
      const parsed = readPaper(item.extractedText ?? "", item.name);
      const result = await reviewDocuments({
        data: reviewPayload(item.extractedText ?? "", imagesFor(item), parsed),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      patchEvidence(matter.id, id, { review: result.text, paperKind: parsed.kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewAll() {
    if (!matter || matter.evidence.length === 0) return;
    setError("");
    setBusy(true);
    try {
      const images = [];
      const texts: string[] = [];
      for (const item of matter.evidence.slice(0, 3)) {
        images.push(...imagesFor(item));
        if (item.extractedText) texts.push(`${item.name}:\n${item.extractedText}`);
      }
      const parsed = readPaper(texts.join("\n"), matter.evidence[0]?.name ?? "");
      const result = await reviewDocuments({
        data: reviewPayload(texts.join("\n\n"), images.slice(0, 3), parsed),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const first = matter.evidence[0];
      if (first) patchEvidence(matter.id, first.id, { review: result.text, paperKind: parsed.kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl">Papers</h2>
        <p className="mt-1 text-sm text-muted">
          Photograph or upload a judgment, order, letter, summons, or ticket. The desk reads what is
          printed — it does not decide the case.
        </p>
      </div>

      {mismatch && (
        <div className="rounded-lg border border-line bg-surface px-3 py-3 text-sm">
          <p>
            This paper names <strong>{paperStateLabel(mismatch.printedStateCode)}</strong>
            {mismatch.court ? ` (${mismatch.court})` : ""}, but Settings is still{" "}
            {jurisdictionLabel(settings)}. Idaho resources do not govern a Washington caption (or the reverse).
          </p>
          <Button
            className="mt-2"
            variant="secondary"
            size="sm"
            onClick={() =>
              patchSettings({
                stateCode: mismatch.printedStateCode!,
                localityId: mismatch.printedStateCode === "ID" ? "other" : "",
                localityText: mismatch.court ?? paperStateLabel(mismatch.printedStateCode) ?? "",
              })
            }
          >
            Switch Settings to {paperStateLabel(mismatch.printedStateCode)}
          </Button>
        </div>
      )}

      <div
        className={`rounded-xl border border-dashed p-5 transition-colors ${
          drag ? "border-accent bg-surface" : "border-line bg-elevated"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void ingest(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileUp className="mt-0.5 size-5 text-accent" />
            <div>
              <p className="font-medium">Drop files here</p>
              <p className="text-sm text-muted">JPEG, PNG, WebP, PDF, or TXT. Every page of an order matters.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" type="button" onClick={() => cameraRef.current?.click()}>
              <Camera className="size-4" />
              Take photo
            </Button>
            <Button type="button" onClick={() => inputRef.current?.click()}>
              Upload
            </Button>
          </div>
        </div>
        <input
          ref={inputRef}
          id="paper-upload"
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
          multiple
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          id="paper-camera"
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="review-q">
          Optional question for the review
        </label>
        <Textarea
          id="review-q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: List every command in this signed order, and say what this paper is not."
        />
      </div>

      {matter && matter.evidence.length > 1 && (
        <Button disabled={busy} onClick={() => void reviewAll()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
          Review all attached papers
        </Button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {busy && <p className="text-sm text-muted">Reading the paper. This can take a few seconds.</p>}

      {!matter?.evidence.length && (
        <p className="text-sm text-muted">Nothing attached yet. Upload every page of the signed order or letter.</p>
      )}

      <ul className="space-y-4">
        {(matter?.evidence ?? []).map((item) => (
          <li key={item.id} className="rounded-xl border border-line bg-elevated p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-40 w-full rounded-md object-cover sm:w-36 sm:h-36 bg-surface"
                />
              ) : (
                <div className="flex h-24 w-full items-center justify-center rounded-md bg-surface text-sm text-muted sm:w-36">
                  Text file
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-subtle">
                      {item.paperKind ? `${item.paperKind} · ` : ""}
                      {item.kind.toUpperCase()}
                      {item.pageCount ? ` · ${item.pageCount} p.` : ""} ·{" "}
                      {new Date(item.addedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-muted hover:text-danger p-2"
                    onClick={() => matter && removeEvidence(matter.id, item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => void reviewOne(item.id)}>
                    {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                    Read this paper
                  </Button>
                </div>
                {item.extractedText && !item.review && (
                  <p className="mt-3 text-xs text-muted line-clamp-3">{item.extractedText}</p>
                )}
                {item.review && (
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
                    {item.review}
                  </pre>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
