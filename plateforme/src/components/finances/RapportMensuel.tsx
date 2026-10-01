import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { cascade, equilibreMutation, grouper, reserve } from "../../lib/budget";
import { aujourdhui, formatCHF, formatDate, formatPct } from "../../lib/format";
import { Bouton } from "../ui";
import { Cascade } from "./communs";
import { moisLisible } from "./OngletSynthese";
import type { Budget } from "./useBudget";

/** Rapport financier mensuel prêt à imprimer (ou enregistrer en PDF depuis le navigateur) */
export function RapportMensuel({ b, onFermer }: { b: Budget; onFermer: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFermer]);
  const p = b.d.projet!;
  const t = b.totaux;
  const r = reserve(b.positions);
  const ref = b.d.clotures.at(-1);
  const debutMois = aujourdhui().slice(0, 7);
  const mutationsRecentes = b.d.mutations.filter((m) => m.statut === "Validée" && (!ref || (m.dateValidation ?? m.date) >= ref.date || m.date.slice(0, 7) === debutMois));
  const parLot = grouper(b.positions, (x) => x.lotId ?? "");
  const depassements = b.positions.filter((x) => x.ecart < -0.5).sort((a, c) => a.ecart - c.ecart).slice(0, 10);
  const ajustements = b.d.ajustements.filter((a) => a.statut === "Active").sort((a, c) => c.montant - a.montant).slice(0, 10);
  const nomLot = (id: string) => { const l = b.lots.find((x) => x.id === id); return l ? `${l.code} – ${l.nom}` : "Hors lot"; };
  const td = "border-b border-slate-200 px-2 py-1.5";
  const n = "text-right tabular-nums whitespace-nowrap";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 dark:bg-slate-950">
      <div className="pas-impression sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <span className="mr-auto text-sm text-slate-500">Imprimez ou choisissez « Enregistrer au format PDF » dans la fenêtre d'impression.</span>
        <Bouton libre variante="primaire" icone={<Printer size={15} />} onClick={() => window.print()}>Imprimer / PDF</Bouton>
        <Bouton libre icone={<X size={15} />} onClick={onFermer}>Fermer</Bouton>
      </div>
      <div className="zone-impression mx-auto my-6 max-w-[210mm] bg-white p-10 text-[12px] leading-relaxed text-slate-900 shadow-sm print:my-0 print:shadow-none">
        <header className="mb-6 border-b-2 border-slate-900 pb-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">Rapport financier – {moisLisible(debutMois)}</p>
          <h1 className="text-xl font-semibold">{p.code} {p.nom}</h1>
          <p className="text-slate-500">{p.maitreOuvrage} · état au {formatDate(aujourdhui())} · montants HT en CHF</p>
        </header>

        <section className="mb-6 grid grid-cols-3 gap-3">
          {[
            ["Budget révisé", formatCHF(t.revise), `initial ${formatCHF(t.initial)}`],
            ["Atterrissage probable", formatCHF(t.atterrissage), `défavorable ${formatCHF(t.atterrissageDefavorable)}`],
            ["Écart", `${t.ecart >= 0 ? "+" : ""}${formatCHF(t.ecart)}`, formatPct(t.revise ? (t.ecart / t.revise) * 100 : 0)],
            ["Engagé", formatCHF(t.engage), formatPct(t.revise ? (t.engage / t.revise) * 100 : 0, 0) + " du révisé"],
            ["Facturé", formatCHF(t.facture), `payé ${formatCHF(t.paye)}`],
            ["Réserve restante", r.nombre ? formatCHF(r.restant) : "—", r.nombre ? `sur ${formatCHF(r.revise)}` : ""],
          ].map(([a, v, d]) => (
            <div key={a} className="rounded border border-slate-200 p-2.5"><p className="text-[10px] uppercase tracking-wide text-slate-500">{a}</p><p className="text-base font-semibold tabular-nums">{v}</p><p className="text-[10px] text-slate-500">{d}</p></div>
          ))}
        </section>

        {ref?.commentaire && (
          <section className="mb-6">
            <h2 className="mb-1 text-sm font-semibold">Commentaire de la direction de projet</h2>
            <p className="whitespace-pre-line">{ref.commentaire}</p>
          </section>
        )}

        <section className="mb-6 break-inside-avoid">
          <h2 className="mb-2 text-sm font-semibold">Récapitulatif par lot</h2>
          <table className="w-full border-collapse">
            <thead><tr className="text-[10px] uppercase text-slate-500"><th className={`${td} text-left`}>Lot</th><th className={`${td} ${n}`}>Révisé</th><th className={`${td} ${n}`}>Engagé</th><th className={`${td} ${n}`}>Atterrissage</th><th className={`${td} ${n}`}>Écart</th><th className={`${td} ${n}`}>Facturé</th></tr></thead>
            <tbody>
              {parLot.map((g) => (
                <tr key={g.cle}><td className={td}>{nomLot(g.cle)}</td><td className={`${td} ${n}`}>{formatCHF(g.totaux.revise)}</td><td className={`${td} ${n}`}>{formatCHF(g.totaux.engage)}</td><td className={`${td} ${n}`}>{formatCHF(g.totaux.atterrissage)}</td><td className={`${td} ${n} ${g.totaux.ecart < 0 ? "text-rose-700" : ""}`}>{formatCHF(g.totaux.ecart)}</td><td className={`${td} ${n}`}>{formatCHF(g.totaux.facture)}</td></tr>
              ))}
              <tr className="font-semibold"><td className={td}>Total</td><td className={`${td} ${n}`}>{formatCHF(t.revise)}</td><td className={`${td} ${n}`}>{formatCHF(t.engage)}</td><td className={`${td} ${n}`}>{formatCHF(t.atterrissage)}</td><td className={`${td} ${n}`}>{formatCHF(t.ecart)}</td><td className={`${td} ${n}`}>{formatCHF(t.facture)}</td></tr>
            </tbody>
          </table>
        </section>

        {ref && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="mb-1 text-sm font-semibold">Évolution de l'atterrissage depuis la clôture de {moisLisible(ref.mois)}</h2>
            <Cascade etapes={cascade(ref.totaux, t, { avant: moisLisible(ref.mois), apres: "Aujourd'hui" })} hauteur={220} />
          </section>
        )}

        {mutationsRecentes.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="mb-2 text-sm font-semibold">Mutations validées sur la période</h2>
            <table className="w-full border-collapse">
              <tbody>
                {mutationsRecentes.map((m) => (
                  <tr key={m.id}><td className={`${td} w-12`}>{m.numero}</td><td className={td}>{m.motif}<p className="text-[10px] text-slate-500">{m.lignes.map((l) => `${l.montant > 0 ? "+" : "−"} ${b.libelle(l.budgetId)}`).join(" ; ")}</p></td><td className={`${td} ${n}`}>{formatCHF(equilibreMutation(m).debits)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {depassements.length > 0 && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="mb-2 text-sm font-semibold">Positions en dépassement</h2>
            <table className="w-full border-collapse">
              <tbody>{depassements.map((x) => <tr key={x.id}><td className={td}>{b.libelle(x.id)}</td><td className={`${td} ${n}`}>{formatCHF(x.revise)}</td><td className={`${td} ${n} text-rose-700`}>{formatCHF(x.ecart)}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        {ajustements.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="mb-2 text-sm font-semibold">Principales prévisions intégrées à l'atterrissage</h2>
            <table className="w-full border-collapse">
              <tbody>{ajustements.map((a) => <tr key={a.id}><td className={`${td} whitespace-nowrap text-slate-500`}>{a.type}</td><td className={td}>{a.libelle}</td><td className={`${td} ${n}`}>{a.probabilite} %</td><td className={`${td} ${n}`}>{a.type === "Opportunité" ? "−" : ""}{formatCHF(a.montant)}</td></tr>)}</tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
