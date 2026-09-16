import { getState } from "../states.ts";
import type { Authority } from "./types.ts";

const SCRIPT_RE = new RegExp("<script[\\s\\S]*?<" + "/script>", "gi");
const STYLE_RE = new RegExp("<style[\\s\\S]*?<" + "/style>", "gi");
const NOSCRIPT_RE = new RegExp("<noscript[\\s\\S]*?<" + "/noscript>", "gi");
const TAG_RE = /<[^>]+>/g;

export function htmlToText(html: string) {
  const noCode = html.replace(SCRIPT_RE, " ").replace(STYLE_RE, " ").replace(NOSCRIPT_RE, " ");
  return noCode
    .replace(TAG_RE, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/"/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function plannedSources(
  stateCode: string,
  localityNote: string,
): Omit<Authority, "retrievedDate" | "relevantExcerpt" | "verificationStatus">[] {
  const st = getState(stateCode);
  return [
    {
      authorityType: "self-help",
      title: `${st.name} court self-help`,
      jurisdiction: st.name,
      citation: "",
      officialSourceUrl: st.selfHelp,
      role: "index_page",
    },
    {
      authorityType: "statute",
      title: `${st.name} statutes / code`,
      jurisdiction: st.name,
      citation: "",
      officialSourceUrl: st.statutes,
      role: "index_page",
    },
    {
      authorityType: "court",
      title: `${st.name} courts`,
      jurisdiction: st.name,
      citation: "",
      officialSourceUrl: st.courts,
      role: "index_page",
    },
    {
      authorityType: "legal-aid",
      title: `${st.name} legal aid`,
      jurisdiction: st.name,
      citation: "",
      officialSourceUrl: st.legalAid,
      role: "index_page",
    },
    {
      authorityType: "agency",
      title: `${st.name} labor / wage agency`,
      jurisdiction: localityNote ? `${st.name} — ${localityNote}` : st.name,
      citation: "",
      officialSourceUrl: st.labor,
      role: "index_page",
    },
  ];
}

async function fetchExcerpt(url: string): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > 120_000 ? buf.slice(0, 120_000) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
    const text = htmlToText(html).slice(0, 4000);
    if (text.length < 80) return { ok: false, reason: "page had too little readable text" };
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, reason: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function retrieveAuthorities(stateCode: string, localityNote: string): Promise<Authority[]> {
  const now = new Date().toISOString();
  const planned = plannedSources(stateCode, localityNote).slice(0, 4);
  const results = await Promise.all(planned.map((src) => fetchExcerpt(src.officialSourceUrl)));
  return planned.map((src, i) => {
    const got = results[i]!;
    return {
      ...src,
      retrievedDate: now,
      relevantExcerpt: got.ok
        ? got.text
        : `Not retrieved (${got.reason}). Open the official URL and confirm locally.`,
      verificationStatus: got.ok ? "retrieved" : "not_retrieved",
      role: "index_page" as const,
    };
  });
}

export function indexSourcesWithoutFetch(stateCode: string, localityNote: string): Authority[] {
  const now = new Date().toISOString();
  return plannedSources(stateCode, localityNote).slice(0, 4).map((src) => ({
    ...src,
    retrievedDate: now,
    relevantExcerpt: "Not fetched — jurisdiction-specific research is halted until the governing court is confirmed.",
    verificationStatus: "not_retrieved",
    role: "index_page",
  }));
}

/** Only issue-specific sections may support a legal proposition. Index pages do not. */
export function corpusOf(authorities: Authority[]) {
  return authorities
    .filter((a) => a.verificationStatus === "retrieved" && a.role === "issue_section")
    .map((a) => `${a.title}\n${a.officialSourceUrl}\n${a.relevantExcerpt}`)
    .join("\n\n");
}
