import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MATTER_TYPES, type MatterTypeId } from "@/lib/catalog";
import type { DecisionReport, FollowUp } from "@/lib/decision/types";
import type { EvidenceFact } from "@/lib/decision/extract";
import { stateByName } from "@/lib/states";
import { uid } from "@/lib/utils";

export type EvidenceItem = {
  id: string;
  name: string;
  mime: string;
  kind: "image" | "pdf" | "text";
  size: number;
  addedAt: string;
  previewUrl: string;
  pagePreviews?: string[];
  pageCount?: number;
  extractedText?: string;
  review?: string;
  paperKind?: string;
};

export type Deadline = { id: string; label: string; date: string };
export type DraftDoc = { id: string; title: string; createdAt: string; body: string };
export type ChatMsg = { role: "user" | "assistant"; content: string; at: number };

export type Matter = {
  id: string;
  title: string;
  matterType: MatterTypeId;
  parties: string;
  facts: string;
  goals: string;
  questions: string;
  notes: string;
  deadlines: Deadline[];
  documents: DraftDoc[];
  messages: ChatMsg[];
  evidence: EvidenceItem[];
  checked: string[];
  userSummary: string;
  eventDate: string;
  eventPlace: string;
  jurisdictionConfirmed: boolean;
  followUps: FollowUp[];
  decision: DecisionReport | null;
  evidenceFacts: EvidenceFact[];
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  stateCode: string;
  localityId: string;
  localityText: string;
  role: string;
  acceptedDisclaimer: boolean;
};

type State = {
  settings: Settings;
  matters: Matter[];
  activeMatterId: string | null;
  acceptDisclaimer: () => void;
  patchSettings: (partial: Partial<Settings>) => void;
  createMatter: (partial?: Partial<Matter>) => Matter;
  setActive: (id: string | null) => void;
  updateMatter: (id: string, partial: Partial<Matter>) => void;
  removeMatter: (id: string) => void;
  addEvidence: (id: string, items: EvidenceItem[]) => void;
  patchEvidence: (matterId: string, evidenceId: string, partial: Partial<EvidenceItem>) => void;
  removeEvidence: (matterId: string, evidenceId: string) => void;
};

const DISCLAIMER_KEY = "mr-paralegal-disclaimer";

function disclaimerAccepted() {
  try {
    return typeof window !== "undefined" && localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
}

function stamp(): string {
  return new Date().toISOString();
}

const defaultSettings: Settings = {
  stateCode: "ID",
  localityId: "nez-perce-lewiston",
  localityText: "",
  role: "self-represented",
  acceptedDisclaimer: false,
};

export function newMatter(partial: Partial<Matter> = {}): Matter {
  const now = stamp();
  return {
    id: uid("matter"),
    title: "Untitled matter",
    matterType: "general",
    parties: "",
    facts: "",
    goals: "",
    questions: "",
    notes: "",
    deadlines: [],
    documents: [],
    messages: [],
    evidence: [],
    checked: [],
    userSummary: "",
    eventDate: "",
    eventPlace: "",
    jurisdictionConfirmed: false,
    followUps: [],
    decision: null,
    evidenceFacts: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export const useParalegal = create<State>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      matters: [],
      activeMatterId: null,
      acceptDisclaimer: () => {
        try {
          localStorage.setItem(DISCLAIMER_KEY, "1");
        } catch {
          /* ignore quota */
        }
        set((s) => ({ settings: { ...s.settings, acceptedDisclaimer: true } }));
      },
      patchSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      createMatter: (partial) => {
        const matter = newMatter(partial);
        set((s) => ({
          matters: [matter, ...s.matters],
          activeMatterId: matter.id,
        }));
        return matter;
      },
      setActive: (id) => set({ activeMatterId: id }),
      updateMatter: (id, partial) =>
        set((s) => ({
          matters: s.matters.map((m) =>
            m.id === id ? { ...m, ...partial, updatedAt: stamp() } : m,
          ),
        })),
      removeMatter: (id) =>
        set((s) => ({
          matters: s.matters.filter((m) => m.id !== id),
          activeMatterId: s.activeMatterId === id ? s.matters.find((m) => m.id !== id)?.id ?? null : s.activeMatterId,
        })),
      addEvidence: (id, items) =>
        set((s) => ({
          matters: s.matters.map((m) =>
            m.id === id
              ? { ...m, evidence: [...items, ...m.evidence], updatedAt: stamp() }
              : m,
          ),
        })),
      patchEvidence: (matterId, evidenceId, partial) =>
        set((s) => ({
          matters: s.matters.map((m) =>
            m.id === matterId
              ? {
                  ...m,
                  evidence: m.evidence.map((e) =>
                    e.id === evidenceId ? { ...e, ...partial } : e,
                  ),
                  updatedAt: stamp(),
                }
              : m,
          ),
        })),
      removeEvidence: (matterId, evidenceId) =>
        set((s) => ({
          matters: s.matters.map((m) =>
            m.id === matterId
              ? {
                  ...m,
                  evidence: m.evidence.filter((e) => e.id !== evidenceId),
                  updatedAt: stamp(),
                }
              : m,
          ),
        })),
    }),
    {
      name: "mr-paralegal-v2",
      partialize: (s) => ({
        settings: {
          stateCode: s.settings.stateCode,
          localityId: s.settings.localityId,
          localityText: s.settings.localityText,
          role: s.settings.role,
        },
        matters: s.matters,
        activeMatterId: s.activeMatterId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State> & {
          settings?: Partial<Settings> & { jurisdiction?: string };
        };
        const oldName = p.settings?.jurisdiction;
        const mapped = oldName && !p.settings?.stateCode ? stateByName(oldName) : undefined;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...p.settings,
            stateCode: p.settings?.stateCode || mapped?.code || current.settings.stateCode,
            localityId: p.settings?.localityId || current.settings.localityId,
            localityText: p.settings?.localityText || "",
            acceptedDisclaimer: disclaimerAccepted() || Boolean(p.settings?.acceptedDisclaimer),
          },
          matters: (p.matters ?? current.matters).map((m) => ({
            ...newMatter(),
            ...m,
            checked: m.checked ?? [],
            evidence: m.evidence ?? [],
            userSummary: m.userSummary ?? "",
            eventDate: m.eventDate ?? "",
            eventPlace: m.eventPlace ?? "",
            jurisdictionConfirmed: Boolean(m.jurisdictionConfirmed),
            followUps: m.followUps ?? [],
            decision: m.decision ?? null,
            evidenceFacts: m.evidenceFacts ?? [],
          })),
        };
      },
    },
  ),
);

export function useActiveMatter() {
  return useParalegal((s) => s.matters.find((m) => m.id === s.activeMatterId) ?? null);
}

export function typeLabel(id: string) {
  return MATTER_TYPES.find((t) => t.id === id)?.label ?? id;
}
