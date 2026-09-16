import { idahoBrief, IDAHO_LOCALITIES } from "@/lib/idaho";
import { getState } from "@/lib/states";
import type { Settings } from "@/lib/store";

export function localityLabel(settings: Settings) {
  if (settings.stateCode !== "ID") return settings.localityText.trim();
  const loc = IDAHO_LOCALITIES.find((l) => l.id === settings.localityId);
  if (settings.localityId === "other") return settings.localityText.trim() || "Idaho (county not specified)";
  return loc?.label ?? "Idaho";
}

export function jurisdictionLabel(settings: Settings) {
  const st = getState(settings.stateCode);
  const local = localityLabel(settings);
  return local ? `${st.name} — ${local}` : st.name;
}

export function briefForState(code: string, locality = "") {
  const st = getState(code);
  return [
    `United States — ${st.name} (${st.code})`,
    locality ? `Locality: ${locality}` : "",
    `Court system: ${st.courts}`,
    `Self-help / forms: ${st.selfHelp}`,
    `Statutes: ${st.statutes}`,
    `Legal aid: ${st.legalAid}`,
    `Labor / wage agency: ${st.labor}`,
    `Small claims note: ${st.smallClaims}`,
    "Always tell the user to confirm fees, deadlines, and forms with the clerk or a licensed attorney. Do not invent phone numbers, docket numbers, or citations beyond this pack.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function jurisdictionBrief(settings: Settings) {
  const local = localityLabel(settings);
  const lines = [briefForState(settings.stateCode, local)];
  if (settings.stateCode === "ID") lines.push(idahoBrief(settings.localityId));
  return lines.filter(Boolean).join("\n");
}
