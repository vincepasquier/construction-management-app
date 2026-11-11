// Capacité des directions : potentiel disponible saisi par direction et par année, comparé à la
// charge demandée par l'ensemble des projets.
import { useState } from "react";
import { Link } from "react-router-dom";
import { cheminProjet } from "@/app/registre";
import { lireNombre } from "@/app/table/TableDonnees";
import { Alerte, Carte, Case, cx, Liste, Progression, Saisie, Tableau, useLectureSeule } from "@/app/ui";
import { projetsAccessibles } from "@/domaine/socle/droits";
import { anneesCouvertes, bilanCapacite } from "@/domaine/socle/planification";
import { useActions, useDonnees, useUtilisateur } from "@/donnees/hooks";

export function Capacite() {
  const { directions, estimationsCharge, capacites, projets } = useDonnees();
  const { ajouter, modifier } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const courante = new Date().getFullYear();
  const [annee, setAnnee] = useState(courante + (estimationsCharge.some((e) => e.annee === courante) ? 0 : estimationsCharge.some((e) => e.annee === courante + 1) ? 1 : 0));
  const [parCompetence, setParCompetence] = useState(false);
  const visibles = new Set(projetsAccessibles(utilisateur, projets).map((p) => p.id));
  const actifs = new Set(projets.filter((p) => !p.archive && p.statut !== "Abandonné").map((p) => p.id));
  const estimations = estimationsCharge.filter((e) => actifs.has(e.projetId));
  // Les directions sans demande ni capacité apparaissent aussi, pour pouvoir saisir leur potentiel
  const bilan = bilanCapacite(estimations, capacites, annee, parCompetence);
  const lignes = [...bilan, ...(parCompetence ? [] : directions.filter((d) => !bilan.some((l) => l.directionId === d.id)).map((d) => ({ directionId: d.id, competence: undefined, demande: 0, capacite: 0, solde: 0, taux: undefined, projets: [] })))];
  const direction = (id: string) => directions.find((d) => d.id === id);
  const sansDirection = bilan.filter((l) => !l.directionId).reduce((s, l) => s + l.demande, 0);

  const saisir = (directionId: string, competence: string | undefined, valeur: number) => {
    const existante = capacites.find((c) => c.directionId === directionId && c.annee === annee && (c.competence ?? "") === (competence ?? ""));
    if (existante) modifier("capacites", existante.id, { joursHommes: valeur });
    else ajouter("capacites", { id: `cap-${directionId}-${annee}-${competence ?? "toutes"}`, directionId, competence, annee, joursHommes: valeur });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-32"><Liste libre aria-label="Année" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>{anneesCouvertes(estimations, capacites, courante).map((a) => <option key={a}>{a}</option>)}</Liste></div>
        <Case libre libelle="Détailler par compétence" checked={parCompetence} onChange={(e) => setParCompetence(e.target.checked)} />
        <p className="text-sm text-slate-500">Demande : somme des jours-hommes estimés dans les projets en cours. Capacité : potentiel théorique saisi ici.</p>
      </div>
      {sansDirection > 0 && <Alerte>{sansDirection} jours-hommes sont estimés sans direction sollicitée : ils n'entrent dans aucun bilan. Complétez la charge des projets concernés.</Alerte>}
      <Carte>
        <Tableau>
          <thead><tr><th>Direction</th>{parCompetence && <th>Compétence</th>}<th className="text-right">Capacité (J/H)</th><th className="text-right">Demande (J/H)</th><th className="text-right">Solde</th><th className="w-48">Taux de charge</th><th>Projets demandeurs</th></tr></thead>
          <tbody>
            {lignes.filter((l) => l.directionId).map((l) => {
              const d = direction(l.directionId);
              return (
                <tr key={`${l.directionId}|${l.competence ?? ""}`}>
                  <td className="font-medium">{d ? `${d.code} · ${d.nom}` : "Direction supprimée"}</td>
                  {parCompetence && <td>{l.competence ?? <span className="text-slate-400">non précisée</span>}</td>}
                  <td className="text-right"><div className="ml-auto w-28"><Saisie aria-label={`Capacité ${d?.code ?? ""} ${l.competence ?? ""}`} inputMode="decimal" className="text-right num" disabled={lecture} key={`${annee}-${l.capacite}`} defaultValue={l.capacite || ""} placeholder="à saisir" onBlur={(e) => { const v = lireNombre(e.target.value); if (v !== l.capacite) saisir(l.directionId, l.competence, v); }} /></div></td>
                  <td className="text-right num">{l.demande || "—"}</td>
                  <td className={cx("text-right num font-medium", l.capacite ? (l.solde < 0 ? "text-rose-600" : "text-emerald-600") : "text-slate-400")}>{l.capacite ? `${l.solde > 0 ? "+" : ""}${l.solde}` : "—"}</td>
                  <td>{l.taux === undefined ? <span className="text-xs text-slate-400">{l.demande ? "capacité non saisie" : "—"}</span> : <div className="flex items-center gap-2"><Progression valeur={Math.min(100, l.taux)} couleur={l.taux > 100 ? "#e11d48" : l.taux > 85 ? "#f59e0b" : undefined} className="flex-1" /><span className={cx("w-12 text-right text-xs num", l.taux > 100 && "font-semibold text-rose-600")}>{Math.round(l.taux)} %</span></div>}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {l.projets.filter((p) => visibles.has(p.projetId)).slice(0, 4).map((p, i) => { const x = projets.find((y) => y.id === p.projetId); return <span key={p.projetId}>{i > 0 && " · "}<Link className="text-brand-600 hover:underline" to={cheminProjet(p.projetId, "planning")}>{x?.code}</Link> <span className="num">{p.joursHommes}</span></span>; })}
                    {l.projets.length > 4 && ` · +${l.projets.length - 4}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tableau>
      </Carte>
    </div>
  );
}
