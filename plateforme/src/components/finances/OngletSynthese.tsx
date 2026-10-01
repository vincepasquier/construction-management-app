import { AlertTriangle, ArrowRight } from "lucide-react";
import { cascade, grouper, principalesVariations, reserve } from "../../lib/budget";
import { formatCHF, formatCompact, formatPct } from "../../lib/format";
import { Carte, cx, Indicateur, Tableau } from "../ui";
import { Cascade, Ecart, joursDepuis, Montant } from "./communs";
import type { Budget } from "./useBudget";

type Onglet = "synthese" | "positions" | "mutations" | "previsions" | "engagements" | "factures" | "clotures";

export function OngletSynthese({ b, allerA }: { b: Budget; allerA: (o: Onglet) => void }) {
  const t = b.totaux;
  const r = reserve(b.positions);
  const derniere = b.d.clotures.at(-1);
  const parLot = grouper(b.positions, (p) => p.lotId ?? "");
  const parEtape = grouper(b.positions, (p) => p.ligne.etape ?? "");
  const nomLot = (id: string) => { const l = b.lots.find((x) => x.id === id); return l ? `${l.code} – ${l.nom}` : "Hors lot"; };

  const depassements = b.positions.filter((p) => p.ecart < -0.5).sort((a, c) => a.ecart - c.ecart);
  const nonRevus = b.d.ajustements.filter((a) => a.statut === "Active" && joursDepuis(a.dateRevue ?? a.date) > 60);
  const soumises = b.d.mutations.filter((m) => m.statut === "Soumise");
  const fhc = b.d.facturesHorsCommande.filter((f) => !f.repartition.length);
  const horsBudget = b.positions.filter((p) => p.virtuelle && Math.abs(p.atterrissage) > 0.5);
  const alertes: { texte: string; onglet: Onglet; grave?: boolean }[] = [
    ...(soumises.length ? [{ texte: `${soumises.length} mutation(s) en attente de validation`, onglet: "mutations" as const }] : []),
    ...(fhc.length ? [{ texte: `${fhc.length} facture(s) hors commande à affecter (${formatCHF(fhc.reduce((s, f) => s + f.montantHT, 0))})`, onglet: "factures" as const }] : []),
    ...(horsBudget.length ? [{ texte: `${formatCHF(horsBudget.reduce((s, p) => s + p.atterrissage, 0))} engagés ou prévus sans position budgétaire`, onglet: "positions" as const, grave: true }] : []),
    ...(nonRevus.length ? [{ texte: `${nonRevus.length} prévision(s) non revue(s) depuis plus de 60 jours`, onglet: "previsions" as const }] : []),
    ...(r.nombre && r.revise > 0 && r.restant / r.revise < 0.25 ? [{ texte: `Réserve presque consommée : ${formatCHF(r.restant)} restants`, onglet: "positions" as const, grave: true }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Indicateur libelle="Budget révisé" valeur={formatCompact(t.revise)} detail={`Initial ${formatCompact(t.initial)}${Math.abs(t.mutations) > 0.5 ? ` · mutations ${formatCompact(t.mutations)}` : ""}`} />
        <Indicateur libelle="Engagé" valeur={formatCompact(t.engage)} detail={`${formatPct(t.revise ? (t.engage / t.revise) * 100 : 0, 0)} du révisé`} />
        <Indicateur libelle="Atterrissage probable" valeur={formatCompact(t.atterrissage)} detail={`Défavorable ${formatCompact(t.atterrissageDefavorable)}`} tendance={t.atterrissageDefavorable > t.revise ? "alerte" : undefined} />
        <Indicateur libelle="Écart" valeur={`${t.ecart >= 0 ? "+" : ""}${formatCompact(t.ecart)}`} detail={formatPct(t.revise ? (t.ecart / t.revise) * 100 : 0)} tendance={t.ecart < 0 ? "mauvais" : "bon"} />
        <Indicateur libelle="Réserve restante" valeur={r.nombre ? formatCompact(r.restant) : "—"} detail={r.nombre ? `sur ${formatCompact(r.revise)} révisés` : "aucune position de réserve"} tendance={r.nombre && r.restant < 0 ? "mauvais" : undefined} />
        <Indicateur libelle="Facturé" valeur={formatCompact(t.facture)} detail={`Payé ${formatCompact(t.paye)}`} />
      </div>

      {alertes.length > 0 && (
        <Carte>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {alertes.map((a, i) => (
              <li key={i}>
                <button onClick={() => allerA(a.onglet)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <AlertTriangle size={15} className={a.grave ? "text-rose-500" : "text-amber-500"} />
                  <span className="flex-1">{a.texte}</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <Carte titre="Récapitulatif par lot" sousTitre="CHF HT">
        <Tableau className="[&_td]:!px-3 [&_th]:!px-3">
          <thead><tr><th>Lot</th><th className="!text-right">Révisé</th><th className="!text-right">Engagé</th><th className="!text-right">Attendu</th><th className="!text-right">Reste à engager</th><th className="!text-right">Ajustements</th><th className="!text-right">Atterrissage</th><th className="!text-right">Écart</th><th className="!text-right">Facturé</th></tr></thead>
          <tbody>
            {parLot.map((g) => (
              <tr key={g.cle}>
                <td className="font-medium">{nomLot(g.cle)}</td>
                <Montant v={g.totaux.revise} /><Montant v={g.totaux.engage} /><Montant v={g.totaux.attendu} /><Montant v={g.totaux.rae} />
                <Montant v={g.totaux.ajustements} signe /><Montant v={g.totaux.atterrissage} gras /><Ecart v={g.totaux.ecart} /><Montant v={g.totaux.facture} />
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold dark:border-slate-700 [&_td]:px-4 [&_td]:py-3">
            <tr><td>Total</td><Montant v={t.revise} /><Montant v={t.engage} /><Montant v={t.attendu} /><Montant v={t.rae} /><Montant v={t.ajustements} signe /><Montant v={t.atterrissage} gras /><Ecart v={t.ecart} gras /><Montant v={t.facture} /></tr>
          </tfoot>
        </Tableau>
      </Carte>

      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre={derniere ? `Variation de l'atterrissage depuis la clôture ${moisLisible(derniere.mois)}` : "Variation de l'atterrissage"}
          sousTitre={derniere ? "Hausse en rouge, baisse en vert" : undefined}>
          {derniere ? (
            <div className="p-4">
              <Cascade etapes={cascade(derniere.totaux, t, { avant: moisLisible(derniere.mois), apres: "Aujourd'hui" })} />
              <VariationsPrincipales b={b} />
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Aucune clôture : <button className="text-brand-600 hover:underline" onClick={() => allerA("clotures")}>clôturez le mois</button> pour suivre l'évolution de l'atterrissage.
            </p>
          )}
        </Carte>

        <Carte titre="Positions en dépassement" sousTitre="Atterrissage supérieur au budget révisé" action={depassements.length > 0 && <button className="text-xs text-brand-600 hover:underline" onClick={() => allerA("positions")}>Tout le suivi</button>}>
          {depassements.length ? (
            <Tableau>
              <tbody>
                {depassements.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td><p className="font-medium">{p.ligne.libelle}{p.ligne.etape ? <span className="text-slate-400"> · Ét. {p.ligne.etape}</span> : null}</p><p className="text-xs text-slate-500">{b.lots.find((l) => l.id === p.lotId)?.code} {p.ligne.groupe}</p></td>
                    <Montant v={p.revise} attenue /><Ecart v={p.ecart} />
                  </tr>
                ))}
              </tbody>
            </Tableau>
          ) : <p className="px-5 py-10 text-center text-sm text-slate-500">Aucune position en dépassement.</p>}
        </Carte>
      </div>

      {parEtape.length > 1 && (
        <Carte titre="Récapitulatif par étape">
          <Tableau>
            <thead><tr><th>Étape</th><th className="!text-right">Révisé</th><th className="!text-right">Engagé</th><th className="!text-right">Atterrissage</th><th className="!text-right">Écart</th><th className="!text-right">Facturé</th></tr></thead>
            <tbody>
              {parEtape.map((g) => (
                <tr key={g.cle}><td className="font-medium">{g.cle ? `Étape ${g.cle}` : "Sans étape"}</td><Montant v={g.totaux.revise} /><Montant v={g.totaux.engage} /><Montant v={g.totaux.atterrissage} /><Ecart v={g.totaux.ecart} /><Montant v={g.totaux.facture} /></tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      )}
    </div>
  );
}

export function VariationsPrincipales({ b, avant }: { b: Budget; avant?: Record<string, { atterrissage: number }> }) {
  const ref = avant ?? b.d.clotures.at(-1)?.positions;
  if (!ref) return null;
  const v = principalesVariations(ref as never, b.positions, 6);
  if (!v.length) return <p className="mt-2 text-center text-xs text-slate-500">Aucune variation par position.</p>;
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {v.map(({ p, delta }) => (
        <li key={p.id} className="flex items-baseline justify-between gap-3">
          <span className="truncate text-slate-700 dark:text-slate-300" title={b.libelle(p.id)}>{b.libelle(p.id)}</span>
          <span className={cx("num shrink-0", delta > 0 ? "text-rose-600" : "text-emerald-600")}>{delta > 0 ? "+" : ""}{formatCHF(delta)}</span>
        </li>
      ))}
    </ul>
  );
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const moisLisible = (m: string) => `${MOIS[Number(m.slice(5, 7)) - 1] ?? ""} ${m.slice(0, 4)}`;
