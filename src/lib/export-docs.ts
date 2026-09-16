function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stampName(title: string, ext: string) {
  const safe = title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "draft";
  return `${safe}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

const BANNER =
  "DRAFT FOR ATTORNEY REVIEW — NOT LEGAL ADVICE. Mr. Paralegal is not a lawyer. Confirm every date, fee, and form with the clerk or a licensed attorney in your state.";

export function draftPlainText(title: string, body: string, jurisdiction: string) {
  return `${BANNER}\n\n${title}\nJurisdiction: ${jurisdiction}\nExported: ${new Date().toLocaleString()}\n\n${body}\n`;
}

export function downloadWord(title: string, body: string, jurisdiction: string) {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family: Calibri, sans-serif; max-width: 720px;">
<p><strong>${escapeHtml(BANNER)}</strong></p>
<h1>${escapeHtml(title)}</h1>
<p>Jurisdiction: ${escapeHtml(jurisdiction)}<br/>Exported: ${escapeHtml(new Date().toLocaleString())}</p>
<pre style="white-space: pre-wrap; font-family: Calibri, sans-serif; font-size: 12pt;">${escapeHtml(body)}</pre>
</body></html>`;
  downloadBlob(stampName(title, "doc"), new Blob(["\ufeff", html], { type: "application/msword" }));
}

export function downloadPdf(title: string, body: string, jurisdiction: string) {
  downloadBlob(stampName(title, "pdf"), textToPdf(draftPlainText(title, body, jurisdiction)));
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

function pdfEscape(s: string) {
  const ascii = s.replace(/[^\x20-\x7E]/g, (ch) => {
    const map: Record<string, string> = {
      "—": "-",
      "–": "-",
      "’": "'",
      "‘": "'",
      "“": '"',
      "”": '"',
      "•": "*",
      "★": "*",
    };
    return map[ch] ?? " ";
  });
  return ascii.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line: string, width: number) {
  const out: string[] = [];
  const words = line.split(/\s+/);
  let cur = "";
  for (const w of words) {
    if (!w) continue;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > width) {
      if (cur) out.push(cur);
      if (w.length > width) {
        for (let i = 0; i < w.length; i += width) out.push(w.slice(i, i + width));
        cur = "";
      } else cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  if (!line.trim()) out.push("");
  return out.length ? out : [""];
}

function textToPdf(text: string): Blob {
  const lines: string[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) lines.push(...wrapLine(raw, 90));
  const perPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  objects[0] = "";
  const pageCount = pages.length;
  const pageObj = (i: number) => 3 + i * 2;
  const contentObj = (i: number) => 4 + i * 2;
  const last = contentObj(pageCount - 1);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(" ")}] >>`;

  for (let i = 0; i < pageCount; i++) {
    const streamLines = pages[i]!.map((line, row) => {
      const y = 770 - row * 15;
      return `BT /F1 11 Tf 48 ${y} Td (${pdfEscape(line)}) Tj ET`;
    }).join("\n");
    objects[pageObj(i)] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObj(i)} 0 R >>`;
    objects[contentObj(i)] = `<< /Length ${streamLines.length} >>\nstream\n${streamLines}\nendstream`;
  }

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let n = 1; n <= last; n++) {
    offsets[n] = chunks.reduce((sum, s) => sum + s.length, 0);
    chunks.push(`${n} 0 obj\n${objects[n]}\nendobj\n`);
  }
  const xrefAt = chunks.reduce((sum, s) => sum + s.length, 0);
  let xref = `xref\n0 ${last + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= last; n++) {
    xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(xref);
  chunks.push(`trailer\n<< /Size ${last + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}
