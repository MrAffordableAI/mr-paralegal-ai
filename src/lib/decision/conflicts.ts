import type { Conflict } from "./types.ts";

export type TextSource = { id: string; label: string; text: string };

const MONEY = /\$[\d,]+(?:\.\d{2})?/g;
const ISOISH = /\b(?:20\d{2}|19\d{2})[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b/g;
const US_DATE = /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:20\d{2}|19\d{2})\b/g;

function uniq(matches: string[]) {
  return [...new Set(matches.map((m) => m.replace(/,/g, "")))];
}

function pick(re: RegExp, text: string) {
  return uniq(text.match(re) ?? []);
}

/** Surface material number/date clashes. Never silently pick a winner. */
export function detectConflicts(sources: TextSource[]): Conflict[] {
  const usable = sources.filter((s) => s.text.trim());
  if (usable.length < 2) return [];
  const out: Conflict[] = [];

  function compare(kind: string, extract: (t: string) => string[], why: string) {
    for (let i = 0; i < usable.length; i++) {
      for (let j = i + 1; j < usable.length; j++) {
        const a = extract(usable[i]!.text);
        const b = extract(usable[j]!.text);
        if (!a.length || !b.length) continue;
        const onlyA = a.filter((x) => !b.includes(x));
        const onlyB = b.filter((x) => !a.includes(x));
        if (onlyA.length && onlyB.length) {
          out.push({
            id: `${kind}-${usable[i]!.id}-${usable[j]!.id}`,
            topic: kind,
            sourceA: `${usable[i]!.label}: ${onlyA.join(", ")}`,
            sourceB: `${usable[j]!.label}: ${onlyB.join(", ")}`,
            whyItMatters: why,
          });
        }
      }
    }
  }

  compare(
    "money",
    (t) => pick(MONEY, t),
    "Different dollar amounts can change damages, a small-claims limit, or what you owe. Do not guess which figure is right.",
  );
  compare(
    "date",
    (t) => [...pick(ISOISH, t), ...pick(US_DATE, t)],
    "Conflicting dates can change which law applies and whether a deadline has passed.",
  );

  return out;
}
