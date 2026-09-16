import { uid } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/store";

const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.72;
const MAX_STORE_BYTES = 1_200_000;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isSupportedFile(file: File) {
  return (
    IMAGE_TYPES.has(file.type) ||
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    /\.(jpe?g|png|webp|gif|pdf|txt)$/i.test(file.name)
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

export async function canvasToJpeg(canvas: HTMLCanvasElement, quality = JPEG_QUALITY) {
  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageFile(file: File): Promise<string> {
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = JPEG_QUALITY;
    let url = await canvasToJpeg(canvas, quality);
    while (url.length > MAX_STORE_BYTES && quality > 0.4) {
      quality -= 0.1;
      url = await canvasToJpeg(canvas, quality);
    }
    return url;
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function renderPdfPages(file: File): Promise<{
  previewUrl: string;
  pagePreviews: string[];
  pageCount: number;
  extractedText: string;
}> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  GlobalWorkerOptions.workerSrc = worker.default;

  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const pageCount = pdf.numPages;

  const pagePreviews: string[] = [];
  const imagePages = Math.min(pdf.numPages, 3);
  for (let i = 1; i <= imagePages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: i === 1 ? 1.4 : 1.1 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not render PDF.");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    let quality = i === 1 ? JPEG_QUALITY : 0.58;
    let url = await canvasToJpeg(canvas, quality);
    const cap = i === 1 ? MAX_STORE_BYTES : 700_000;
    while (url.length > cap && quality > 0.38) {
      quality -= 0.08;
      url = await canvasToJpeg(canvas, quality);
    }
    pagePreviews.push(url);
  }

  const texts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 8);
  for (let i = 1; i <= maxPages; i++) {
    const p = await pdf.getPage(i);
    const content = await p.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    if (line) texts.push(`Page ${i}: ${line}`);
  }

  return {
    previewUrl: pagePreviews[0] ?? "",
    pagePreviews,
    pageCount,
    extractedText: texts.join("\n"),
  };
}

export async function fileToEvidence(file: File): Promise<EvidenceItem> {
  const addedAt = new Date().toISOString();
  const base = {
    id: uid("ev"),
    name: file.name || "untitled",
    mime: file.type || "application/octet-stream",
    size: file.size,
    addedAt,
  };

  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const rendered = await renderPdfPages(file);
    return { ...base, kind: "pdf", mime: "application/pdf", ...rendered };
  }

  if (file.type === "text/plain" || /\.txt$/i.test(file.name)) {
    const extractedText = (await file.text()).slice(0, 20_000);
    return {
      ...base,
      kind: "text",
      previewUrl: "",
      extractedText,
    };
  }

  const previewUrl = await compressImageFile(file);
  return { ...base, kind: "image", mime: "image/jpeg", previewUrl };
}

export function dataUrlPayload(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}
