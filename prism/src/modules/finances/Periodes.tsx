// Périodes financières du projet : arrêt mensuel de la synthèse et historique des variations.
// Sert aux projets tenus en synthèse comme aux projets de construction (à côté de leurs clôtures).
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { notifier } from "@/app/etatUI";
import { Alerte, Bouton, Carte, Champ, Liste, Panneau, Tableau, useLectureSeule, Vide, Zone } from "@/app/ui";
import { Montant } from "@/app/ui/metier";
import { aujourdhui, formatDate, formatPct, moisDe, moisEnClair } from "@/domaine/lib/format";
import { historique, moisPrecedent } from "@/domaine/socle/periodes";
import { ErreurDepot } from "@/donnees/depot";
import { useActions, useDepot, useDonnees, useProjet } from "@/donnees/hooks";
import { arreterPeriode, etatPeriode } from "@/donnees/periodes";

export function Periodes() {
  const depot = useDepot();
  const { projet, periodesFinancieres } = useProjet();
  const { personnes } = useDonnees();
  const { modifier } = useActions();
  const lecture = useLectureSeule();
  const [ouvert, setOuvert] = useState(false);
  if (!projet) return null;
  const lignes = historique(periodesFinancieres).reverse();
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "—";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Chaque mois, la situation financière est arrêtée : la photo sert de point de comparaison et ne se modifie plus.</p>
        <Bouton variante="primaire" icone={<CalendarCheck size={15} />} onClick={() => setOuvert(true)}>Arrêter une période</Bouton>
      </div>
      {lignes.length === 0 ? (
        <Carte><Vide icone={<CalendarCheck size={22} />} titre="Aucune période arrêtée" texte="Arrêtez la situation en fin de mois pour suivre l'évolution de l'atterrissage et l'expliquer." /></Carte>
      ) : (
        <Carte>
          <Tableau>
            <thead><tr><th>Période</th><th>Arrêtée le</th><th className="text-right">Budget approuvé</th><th className="text-right">Engagé</th><th className="text-right">Réalisé</th><th className="text-right">Atterrissage</th><th className="text-right">Variation</th><th>Commentaire</th></tr></thead>
            <tbody>
              {lignes.map(({ periode: p, variation: v }) => (
                <tr key={p.id}>
                  <td className="font-medium capitalize">{moisEnClair(p.mois)}</td>
                  <td className="text-slate-500">{formatDate(p.date)}<br /><span className="text-xs">{nom(p.auteurId)}</span></td>
                  <td className="text-right"><Montant v={p.valeurs.budgetApprouve} /></td>
                  <td className="text-right"><Montant v={p.valeurs.engage} /></td>
                  <td className="text-right"><Montant v={p.valeurs.realise} /></td>
                  <td className="text-right font-medium"><Montant v={p.valeurs.atterrissage} /></td>
                  <td className="text-right">{Math.abs(v.atterrissage) < 0.5 ? <span className="text-slate-400">—</span> : <span className={v.atterrissage > 0 ? "text-rose-600 num" : "text-emerald-600 num"}>{v.atterrissage > 0 ? "+" : ""}{Math.round(v.atterrissage).toLocaleString("fr-CH")}<br /><span className="text-xs">{formatPct(v.pct)}</span></span>}</td>
                  <td className="max-w-xs text-sm">
                    {lecture ? p.commentaire ?? "" : (
                      <textarea defaultValue={p.commentaire ?? ""} rows={2} aria-label={`Commentaire de ${moisEnClair(p.mois)}`} placeholder="Commentaire…"
                        className="w-full resize-y rounded-md bg-transparent px-1.5 py-1 text-sm outline-none ring-slate-200 hover:ring-1 focus:ring-2 focus:ring-brand-500 dark:ring-slate-700"
                        onBlur={(e) => { if (e.target.value.trim() !== (p.commentaire ?? "")) modifier("periodesFinancieres", p.id, { commentaire: e.target.value.trim() || undefined }); }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      )}
      {ouvert && <ArretPeriode onFermer={() => setOuvert(false)} projetId={projet.id} existants={periodesFinancieres.map((p) => p.mois)} depot={depot} />}
    </>
  );
}

function ArretPeriode({ projetId, existants, depot, onFermer }: { projetId: string; existants: string[]; depot: ReturnType<typeof useDepot>; onFermer: () => void }) {
  const courant = moisDe(aujourdhui());
  const [mois, setMois] = useState(existants.includes(moisPrecedent(courant)) ? courant : moisPrecedent(courant));
  const [commentaire, setCommentaire] = useState("");
  const e = etatPeriode(depot, projetId, mois);
  const choix = [courant, moisPrecedent(courant), moisPrecedent(moisPrecedent(courant))];
  const manque = e.commentaireExige && !commentaire.trim();

  const arreter = () => {
    try {
      arreterPeriode(depot, projetId, mois, commentaire);
      notifier(`Période ${moisEnClair(mois)} arrêtée.`, "succes");
      onFermer();
    } catch (err) {
      notifier(err instanceof ErreurDepot ? err.message : "La période n'a pas pu être arrêtée.", "erreur");
    }
  };

  return (
    <Panneau ouverte onFermer={onFermer} titre="Arrêter une période"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={manque} onClick={arreter}>{e.existante ? "Refaire la photo" : "Arrêter la période"}</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Période">
          <Liste value={mois} onChange={(ev) => setMois(ev.target.value)}>
            {choix.map((m) => <option key={m} value={m}>{moisEnClair(m)}{existants.includes(m) ? " (déjà arrêtée)" : ""}</option>)}
          </Liste>
        </Champ>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
          <div><dt className="text-xs text-slate-500">Atterrissage à ce jour</dt><dd className="mt-0.5 font-semibold"><Montant v={e.valeurs.atterrissage} /> CHF</dd></div>
          <div><dt className="text-xs text-slate-500">{e.precedente ? `Période précédente (${moisEnClair(e.precedente.mois)})` : "Période précédente"}</dt><dd className="mt-0.5 font-semibold">{e.precedente ? <><Montant v={e.precedente.valeurs.atterrissage} /> CHF</> : "aucune"}</dd></div>
          <div><dt className="text-xs text-slate-500">Variation de l'atterrissage</dt><dd className="mt-0.5 font-semibold">{e.precedente ? <><Montant v={e.variation.atterrissage} /> CHF · {formatPct(e.variation.pct)}</> : "—"}</dd></div>
          <div><dt className="text-xs text-slate-500">Réalisé sur la période</dt><dd className="mt-0.5 font-semibold">{e.precedente ? <><Montant v={e.variation.realise} /> CHF</> : "—"}</dd></div>
        </dl>
        {e.commentaireExige && <Alerte>L'atterrissage a varié de plus de {e.seuilPct} % depuis la période précédente : expliquez la variation pour arrêter la période.</Alerte>}
        {e.existante && <Alerte type="info">Cette période est déjà arrêtée. La refaire remplace la photo ; l'opération est inscrite au journal.</Alerte>}
        <Champ libelle="Commentaire" obligatoire={e.commentaireExige} aide="Ce qui explique l'évolution depuis la période précédente : décisions, avenants, risques survenus…">
          <Zone rows={4} value={commentaire} onChange={(ev) => setCommentaire(ev.target.value)} />
        </Champ>
      </div>
    </Panneau>
  );
}
