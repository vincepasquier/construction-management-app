// Lectures de gouvernance : indice de complétude d'un projet, mandat en vigueur, conditions des
// décisions. Les faits sont relevés ici, les règles restent dans le domaine.
import { moisDe } from "../domaine/lib/format";
import { estActif } from "../domaine/lib/risques";
import { evaluerCompletude, type Completude, type FaitsCompletude } from "../domaine/socle/completude";
import { mandatEnVigueur } from "../domaine/socle/mandat";
import { moisPrecedent } from "../domaine/socle/periodes";
import { phasesTerminees } from "../domaine/socle/rapports";
import type { ConditionSuivie, Decision, DecisionPhase } from "../domaine/socle/types";
import type { ID, Projet, Risque } from "../domaine/types";
import type { Depot } from "./depot";
import { useDerive } from "./hooks";
import { champsManquantsProjet, typeDe } from "./lectures";
import { libelleChamp } from "../domaine/socle/libelles";

type Suivre = (cle: string) => void;
const rien: Suivre = () => {};

/** Date de la dernière revue d'un risque ; à défaut, sa date d'identification */
export const derniereRevue = (r: Risque) => [...(r.revues ?? [])].map((x) => x.date).sort().at(-1) ?? r.dateIdentification;

export function risquesARevoir(risques: Risque[], jour: string, joursMax: number): Risque[] {
  const limite = new Date(new Date(jour).getTime() - joursMax * 86_400_000).toISOString().slice(0, 10);
  return risques.filter((r) => estActif(r) && derniereRevue(r).slice(0, 10) < limite);
}

export interface ConditionOuverte {
  condition: ConditionSuivie;
  projetId: ID;
  origine: string;
  /** Décision ou passage de phase qui porte la condition */
  source: { type: "decision" | "phase"; id: ID };
  echue: boolean;
}

/** Conditions et réserves non levées, attachées aux décisions et aux passages de phase */
export function conditionsOuvertes(decisions: Decision[], decisionsPhase: DecisionPhase[], jour: string): ConditionOuverte[] {
  const ouverte = (c: ConditionSuivie) => c.statut !== "Remplie" && c.statut !== "Levée";
  const out: ConditionOuverte[] = [];
  for (const d of decisions) for (const c of d.conditions.filter(ouverte)) out.push({ condition: c, projetId: d.projetId, origine: `${d.organe} du ${d.date} : ${d.objet}`, source: { type: "decision", id: d.id }, echue: !!c.echeance && c.echeance < jour });
  for (const d of decisionsPhase) for (const c of d.conditions.filter(ouverte)) out.push({ condition: c, projetId: d.projetId, origine: `Passage en phase « ${d.versPhase} »`, source: { type: "phase", id: d.id }, echue: !!c.echeance && c.echeance < jour });
  return out.sort((a, b) => (a.condition.echeance ?? "9999").localeCompare(b.condition.echeance ?? "9999"));
}

export function faitsCompletude(depot: Depot, projet: Projet, jour: string, suivre: Suivre = rien): FaitsCompletude {
  const pid = projet.id;
  for (const c of ["periodesFinancieres", "risques", "taches", "mandats", "rapports", "partiesPrenantes", "decisions", "decisionsPhase"] as const) suivre(`${c}|${pid}`);
  suivre("configurations"); suivre("typesProjet");
  const type = typeDe(depot, projet);
  const config = depot.parId("configurations", "courante");
  const risques = depot.parProjet("risques", pid);
  const phases = type?.phases ?? [];
  const cloture = projet.statut === "Terminé";
  return {
    responsableDesigne: !!projet.directeurId,
    champsManquants: champsManquantsProjet(projet, type).map(libelleChamp),
    dernierePeriode: depot.parProjet("periodesFinancieres", pid).map((p) => p.mois).sort().at(-1),
    moisAttendu: moisPrecedent(moisDe(jour)),
    risquesOuverts: risques.filter(estActif).length,
    risquesNonRevus: risquesARevoir(risques, jour, config?.joursRevueRisque ?? 90).length,
    jalonsDepassesSansReel: depot.parProjet("taches", pid).filter((t) => t.jalon && t.fin < jour && !t.finReelle && t.avancement < 100).length,
    mandatSigne: mandatEnVigueur(depot.parProjet("mandats", pid))?.statut === "Signé",
    phasesTerminees: phasesTerminees(phases, projet.phaseGroupe, cloture),
    phasesAvecRapport: depot.parProjet("rapports", pid).filter((r) => r.type === "Phase" && r.statut === "Validé" && r.phase).map((r) => r.phase!),
    partiesPrenantes: depot.parProjet("partiesPrenantes", pid).length,
    conditionsEchues: conditionsOuvertes(depot.parProjet("decisions", pid), depot.parProjet("decisionsPhase", pid), jour).filter((c) => c.echue).length,
    nonDemarre: projet.dateDebut > jour || projet.statut === "Idée" || projet.statut === "En préparation",
  };
}

export function completudeProjet(depot: Depot, projet: Projet, jour: string, suivre: Suivre = rien): Completude {
  const criteres = depot.parId("configurations", "courante")?.criteresCompletude ?? [];
  return evaluerCompletude(criteres, faitsCompletude(depot, projet, jour, suivre));
}

export function useCompletude(projet: Projet | null | undefined, jour: string): Completude | null {
  return useDerive((depot, suivre) => (projet ? completudeProjet(depot, projet, jour, suivre) : null), [projet, jour]);
}
