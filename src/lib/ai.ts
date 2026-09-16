import { createServerFn } from "@tanstack/react-start";
import { wrapUntrusted } from "@/lib/decision/citations";
import { DOCUMENT_REVIEW_PROMPT, SYSTEM_PROMPT } from "@/lib/prompts";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ImagePart = { mime: string; data: string; name: string };

type ReviewInput = {
  images: ImagePart[];
  extractedText?: string;
  question?: string;
  jurisdiction?: string;
  jurisdictionBrief?: string;
  matterTitle?: string;
  matterType?: string;
  facts?: string;
  goals?: string;
  paperKind?: string;
  paperNotes?: string;
  paperStateBrief?: string;
  jurisdictionMismatch?: boolean;
};

type ChatInput = {
  messages: { role: "user" | "assistant"; content: string }[];
  task: string;
  input: string;
  jurisdiction?: string;
  jurisdictionBrief?: string;
  matterTitle?: string;
  matterType?: string;
  facts?: string;
  goals?: string;
  evidenceNotes?: string;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } };

async function grok(messages: unknown, maxTokens: number, json = false) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false as const, error: "AI is not available in this environment." };
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: maxTokens,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false as const,
      error: `Review failed (${res.status}). ${text.slice(0, 180)}`,
    };
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false as const, error: "The model returned an empty reply." };
  return { ok: true as const, text };
}

export async function grokJson(prompt: string, maxTokens = 1600) {
  const messages = [
    {
      role: "system",
      content:
        "Return only valid JSON. You are not a lawyer. Never invent statutes, cases, quotations, fees, or deadlines. If a legal rule is not in the retrieved official text, say so and mark it unverified.",
    },
    { role: "user", content: prompt },
  ];
  const first = await grok(messages, maxTokens, true);
  if (first.ok) return first;
  return grok(messages, maxTokens, false);
}

export const reviewDocuments = createServerFn({ method: "POST" })
  .validator((input: ReviewInput) => input)
  .handler(async ({ data }) => {
    const images = (data.images ?? []).slice(0, 3).filter((img) => {
      const mime = img.mime === "image/png" ? "image/png" : "image/jpeg";
      return (mime === "image/jpeg" || mime === "image/png") && img.data.length < 2_000_000;
    });

    const parts: ContentPart[] = [];
    for (const img of images) {
      const mime = img.mime === "image/png" ? "image/png" : "image/jpeg";
      parts.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${img.data}`,
          detail: "high",
        },
      });
    }

    const briefing = [
      DOCUMENT_REVIEW_PROMPT,
      data.paperKind ? `Deterministic document class: ${data.paperKind}` : "",
      data.jurisdictionMismatch
        ? "JURISDICTION MISMATCH: the paper names a different state/court than the user's Settings. Describe the paper using the court printed on it. Do not apply the Settings-state pack as if it governed this caption."
        : "",
      data.jurisdiction ? `User Settings jurisdiction: ${data.jurisdiction}` : "",
      data.jurisdictionBrief ? `Settings resource pack:\n${data.jurisdictionBrief}` : "",
      data.paperStateBrief ? `Resource pack for the state printed on the paper:\n${data.paperStateBrief}` : "",
      data.matterTitle ? `Matter: ${data.matterTitle} (${data.matterType ?? "general"})` : "",
      data.paperNotes ? `Structured fields already pulled from the text (verify against the image):\n${data.paperNotes}` : "",
      data.facts ? wrapUntrusted("FACTS ON FILE", data.facts.slice(0, 2500)) : "",
      data.goals ? wrapUntrusted("USER GOAL", data.goals.slice(0, 800)) : "",
      data.extractedText ? wrapUntrusted("EXTRACTED FILE TEXT", data.extractedText.slice(0, 12000)) : "",
      data.question
        ? wrapUntrusted("USER QUESTION", data.question.slice(0, 1500))
        : "Read every page provided. Quote decretal paragraphs on a judgment. Do not use a parking-ticket template on a court order.",
      "This is not legal advice.",
    ]
      .filter(Boolean)
      .join("\n\n");

    parts.push({ type: "text", text: briefing });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parts },
    ];

    return grok(messages, 2200);
  });

export const askParalegal = createServerFn({ method: "POST" })
  .validator((input: ChatInput) => input)
  .handler(async ({ data }) => {
    const context = [
      data.jurisdiction ? `Jurisdiction: ${data.jurisdiction}` : "",
      data.jurisdictionBrief ? `Official resource pack:\n${data.jurisdictionBrief}` : "",
      data.matterTitle ? `Matter: ${data.matterTitle} (${data.matterType ?? "general"})` : "",
      data.facts ? wrapUntrusted("FACTS", data.facts.slice(0, 2500)) : "",
      data.goals ? wrapUntrusted("GOALS", data.goals.slice(0, 800)) : "",
      data.evidenceNotes ? wrapUntrusted("EVIDENCE NOTES", data.evidenceNotes.slice(0, 2500)) : "",
      `Task: ${data.task}`,
      wrapUntrusted("USER REQUEST", data.input.slice(0, 4000)),
    ]
      .filter(Boolean)
      .join("\n\n");

    const history: ChatMessage[] = (data.messages ?? []).slice(-8).map((m) => ({
      role: m.role,
      content: m.content.slice(0, 4000),
    }));

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: context },
    ];

    return grok(messages, 1400);
  });
