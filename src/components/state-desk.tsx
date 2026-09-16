import { ExternalLink, MapPin, Scale } from "lucide-react";
import { IDAHO_LOCALITIES, IDAHO_STATE_LINKS, NEZ_PERCE } from "@/lib/idaho";
import { jurisdictionLabel } from "@/lib/jurisdiction";
import { getState, NATIONAL_LINKS, US_STATES } from "@/lib/states";
import { useParalegal } from "@/lib/store";

function OutLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-elevated px-3 py-2 text-sm text-ink hover:bg-surface"
    >
      <ExternalLink className="size-4 shrink-0" />
      <span className="text-left">{children}</span>
    </a>
  );
}

export function StateDesk() {
  const settings = useParalegal((s) => s.settings);
  const patch = useParalegal((s) => s.patchSettings);
  const st = getState(settings.stateCode);
  const idaho = settings.stateCode === "ID";
  const nez = idaho && settings.localityId === "nez-perce-lewiston";

  return (
    <div>
      <h2 className="font-display text-2xl">50-state desk</h2>
      <p className="mt-1 text-sm text-muted">
        Pick your state. Links go to official self-help, statutes, and legal aid — not to this app
        giving advice. Confirm every fee and deadline with the clerk.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          State
          <select
            className="mt-1 flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
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
        </label>
        {idaho ? (
          <label className="block text-sm font-medium">
            Idaho county / city
            <select
              className="mt-1 flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
              value={settings.localityId}
              onChange={(e) => patch({ localityId: e.target.value })}
            >
              {IDAHO_LOCALITIES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.featured ? `★ ${l.label}` : l.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm font-medium">
            County or city (optional)
            <input
              className="mt-1 flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
              value={settings.localityText}
              placeholder="County or city on your papers"
              onChange={(e) => patch({ localityText: e.target.value })}
            />
          </label>
        )}
      </div>
      {idaho && settings.localityId === "other" && (
        <input
          className="mt-3 flex min-h-11 w-full rounded-md border border-line bg-elevated px-3 text-sm"
          value={settings.localityText}
          placeholder="Type your Idaho county"
          onChange={(e) => patch({ localityText: e.target.value })}
        />
      )}

      <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm">
        <MapPin className="size-4" />
        Working in {jurisdictionLabel(settings)}
      </p>

      <h3 className="mt-6 font-display text-xl">{st.name} official places</h3>
      <p className="mt-1 text-sm text-muted">{st.smallClaims}</p>
      <div className="mt-3 grid gap-2">
        <OutLink href={st.selfHelp}>Court self-help / forms</OutLink>
        <OutLink href={st.courts}>State court website</OutLink>
        <OutLink href={st.statutes}>Statutes / code</OutLink>
        <OutLink href={st.legalAid}>Legal aid</OutLink>
        <OutLink href={st.labor}>Labor / wage agency</OutLink>
      </div>

      {idaho && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-display text-xl">Idaho first</h3>
          <p className="mt-1 text-sm text-muted">
            Statewide Court Assistance Office packets, then your county clerk. Lewiston / Nez Perce is
            filled in because that is a full local pack — switch counties if you are elsewhere.
          </p>
          <div className="mt-3 grid gap-2">
            {IDAHO_STATE_LINKS.map((l) => (
              <OutLink key={l.href} href={l.href}>
                {l.label}
              </OutLink>
            ))}
          </div>
        </div>
      )}

      {nez && (
        <div className="mt-6 rounded-xl border border-line bg-elevated p-4">
          <div className="flex items-center gap-2">
            <Scale className="size-4" />
            <h3 className="font-display text-xl">Nez Perce County / Lewiston</h3>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>{NEZ_PERCE.courthouse}</li>
            <li>Mail: {NEZ_PERCE.mailing}</li>
            <li>{NEZ_PERCE.caoHours}</li>
            <li>
              Published phones (confirm before you call): CAO {NEZ_PERCE.caoPhone}; clerk / small claims{" "}
              {NEZ_PERCE.clerkPhone}; district court {NEZ_PERCE.districtCourtPhone}
            </li>
            <li>
              Small-claims hearings are in the magistrate division. Statewide cap has been published at
              $15,000 (Idaho Code 1-2301) — confirm current law and the filing fee with the clerk.
            </li>
          </ul>
          <div className="mt-3 grid gap-2">
            <OutLink href={NEZ_PERCE.caoPage}>County Court Assistance Office</OutLink>
            <OutLink href={NEZ_PERCE.caoLocalForms}>Nez Perce CAO local page</OutLink>
            <OutLink href={NEZ_PERCE.smallClaimsPage}>County small-claims page</OutLink>
            <OutLink href={NEZ_PERCE.civilPage}>County civil court / fees note</OutLink>
            <OutLink href={NEZ_PERCE.city}>City of Lewiston</OutLink>
            <OutLink href={NEZ_PERCE.county}>Nez Perce County</OutLink>
          </div>
        </div>
      )}

      <h3 className="mt-6 font-display text-xl">Nationwide</h3>
      <div className="mt-3 grid gap-2">
        {NATIONAL_LINKS.map((l) => (
          <OutLink key={l.href} href={l.href}>
            {l.label}
          </OutLink>
        ))}
      </div>
    </div>
  );
}
