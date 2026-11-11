// Phases de gouvernance du projet : où il en est, les décisions de passage et leurs conditions.
import { ArrowRight, Check, Flag } from "lucide-react";
import { useState } from "react";
import { LienProjet } from "@/app/chemins";
import { Alerte, Badge, Bouton, Carte, Champ, cx, Liste, Panneau, Saisie, useLectureSeule, Zone, type CouleurBadge } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { mandatEnVigueur } from "@/domaine/socle/mandat";
import { phaseSuivante } from "@/domaine/socle/rapports";
import type { ConditionSuivie, DecisionPhase } from "@/domaine/socle/types";
import { conditionsOuvertes } from "@/donnees/gouvernance";
import { useActions, useDoc, useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { SaisieConditions, SuiviConditions } from "../gouvernance/Conditions";

const DECISIONS: DecisionPhase["decision"][] = ["Accordé", "Accordé avec réserves", "Reporté", "Refusé"];
const COULEUR: Record<DecisionPhase["decision"], CouleurBadge> = { "Accordé": "vert", "Accordé avec réserves": "orange", "Reporté": "gris", "Refusé": "rouge" };
const ORGANES = ["Comité de pilotage", "ComInv", "Direction générale", "Conseil d'administration", "Sponsor"];

export function Phases() {
  const { projet, decisionsPhase, rapports, mandats } = useProjet();
  const { personnes } = useDonnees();
  const { ajouter, modifier, grouper } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const type = useDoc("typesProjet", projet?.typeProjetId);
  const [demande, setDemande] = useState<DecisionPhase | null>(null);
  if (!projet) return null;

  const phases = type?.phases ?? [];
  const courante = projet.phaseGroupe ?? phases[0];
  const rang = phases.indexOf(courante);
  const suivante = phaseSuivante(phases, courante);
  const historique = [...decisionsPhase].sort((a, b) => b.date.localeCompare(a.date));
  const ouvertes = conditionsOuvertes([], decisionsPhase, aujourdhui());
  const rapportDe = (phase: string) => rapports.find((r) => r.type === "Phase" && r.phase === phase && r.statut === "Validé");
  const mandatSigne = mandatEnVigueur(mandats)?.statut === "Signé";

  const ouvrir = () => suivante && setDemande({ id: nouvelId("dph"), projetId: projet.id, dePhase: courante, versPhase: suivante, date: aujourdhui(), decision: "Accordé", organe: ORGANES[0], conditions: [], auteurId: utilisateur?.id, rapportId: rapportDe(courante)?.id });
  const enregistrer = () => {
    if (!demande) return;
    const d = { ...demande, conditions: demande.conditions.filter((c) => c.texte.trim()) };
    grouper(`Passage de phase : ${d.dePhase} → ${d.versPhase} (${d.decision.toLowerCase()})`, () => {
      ajouter("decisionsPhase", d);
      if (d.decision === "Accordé" || d.decision === "Accordé avec réserves") modifier("projets", projet.id, { phaseGroupe: d.versPhase });
    });
    setDemande(null);
  };

  return (
    <div className="space-y-6">
      <Carte titre="Phases du projet" sousTitre={type ? `Type « ${type.nom} »` : undefined}
        action={suivante && !lecture && <Bouton variante="primaire" icone={<ArrowRight size={15} />} onClick={ouvrir}>Passage à « {suivante} »</Bouton>}>
        <ol className="flex flex-wrap gap-y-4 p-5">
          {phases.map((p, i) => {
            const etat = i < rang ? "faite" : i === rang ? "courante" : "avenir";
            return (
              <li key={p} className="flex min-w-36 flex-1 flex-col items-center gap-2 text-center">
                <div className="flex w-full items-center">
                  <span className={cx("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= rang ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")} />
                  <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", etat === "faite" && "bg-emerald-500 text-white", etat === "courante" && "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-sky-950", etat === "avenir" && "bg-slate-100 text-slate-400 dark:bg-slate-800")}>
                    {etat === "faite" ? <Check size={15} /> : etat === "courante" ? <Flag size={14} /> : i + 1}
                  </span>
                  <span className={cx("h-0.5 flex-1", i === phases.length - 1 ? "bg-transparent" : i < rang ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")} />
                </div>
                <p className={cx("px-1 text-sm", etat === "courante" ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{p}</p>
                {etat === "faite" && (rapportDe(p) ? <Badge couleur="vert">Rapport validé</Badge> : <LienProjet to="/rapports" className="text-xs text-amber-600 hover:underline">Rapport manquant</LienProjet>)}
              </li>
            );
          })}
        </ol>
        {!mandatSigne && <div className="px-5 pb-5"><Alerte>Le mandat de projet n'est pas encore signé : le démarrage du projet n'est pas formellement autorisé.</Alerte></div>}
      </Carte>

      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre="Décisions de passage de phase">
          {historique.length === 0 ? <p className="px-5 py-6 text-center text-sm text-slate-500">Aucun passage de phase enregistré.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {historique.map((d) => (
                <li key={d.id} className="space-y-1 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{d.dePhase} <ArrowRight size={12} className="inline text-slate-400" /> {d.versPhase}</p>
                    <Badge couleur={COULEUR[d.decision]}>{d.decision}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(d.date)} · {d.organe}{personnes.find((p) => p.id === d.auteurId) ? ` · saisi par ${personnes.find((p) => p.id === d.auteurId)!.nom}` : ""}{d.conditions.length ? ` · ${d.conditions.length} condition(s)` : ""}</p>
                  {d.commentaire && <p className="text-sm text-slate-600 dark:text-slate-300">{d.commentaire}</p>}
                </li>
              ))}
            </ul>
          )}
        </Carte>
        <Carte titre="Conditions à lever" sousTitre="Réserves émises lors des passages de phase"><SuiviConditions conditions={ouvertes} /></Carte>
      </div>

      {demande && (
        <Panneau ouverte onFermer={() => setDemande(null)} titre={`Passage de phase : ${demande.dePhase} → ${demande.versPhase}`}
          pied={<><Bouton libre onClick={() => setDemande(null)}>Annuler</Bouton><Bouton variante="primaire" onClick={enregistrer}>Enregistrer la décision</Bouton></>}>
          <div className="space-y-4">
            {!rapportDe(demande.dePhase) && <Alerte>Aucun rapport validé pour la phase « {demande.dePhase} ». La décision peut être enregistrée, mais l'indice de complétude du projet en tiendra compte.</Alerte>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ libelle="Décision"><Liste value={demande.decision} onChange={(e) => setDemande({ ...demande, decision: e.target.value as DecisionPhase["decision"] })}>{DECISIONS.map((x) => <option key={x}>{x}</option>)}</Liste></Champ>
              <Champ libelle="Date"><Saisie type="date" value={demande.date} onChange={(e) => setDemande({ ...demande, date: e.target.value })} /></Champ>
              <Champ libelle="Organe de décision" className="sm:col-span-2"><Liste value={demande.organe} onChange={(e) => setDemande({ ...demande, organe: e.target.value })}>{ORGANES.map((x) => <option key={x}>{x}</option>)}</Liste></Champ>
              <Champ libelle="Rapport de phase présenté" className="sm:col-span-2">
                <Liste value={demande.rapportId ?? ""} onChange={(e) => setDemande({ ...demande, rapportId: e.target.value || undefined })}>
                  <option value="">—</option>{rapports.filter((r) => r.type === "Phase").map((r) => <option key={r.id} value={r.id}>{r.titre} (v{r.version}, {r.statut.toLowerCase()})</option>)}
                </Liste>
              </Champ>
              <Champ libelle="Commentaire" className="sm:col-span-2"><Zone rows={3} value={demande.commentaire ?? ""} onChange={(e) => setDemande({ ...demande, commentaire: e.target.value })} /></Champ>
            </div>
            <SaisieConditions valeur={demande.conditions} onChange={(conditions: ConditionSuivie[]) => setDemande({ ...demande, conditions })} />
            <p className="text-xs text-slate-500">{demande.decision.startsWith("Accordé") ? `Le projet passera en phase « ${demande.versPhase} ».` : `Le projet reste en phase « ${demande.dePhase} ».`}</p>
          </div>
        </Panneau>
      )}
    </div>
  );
}
