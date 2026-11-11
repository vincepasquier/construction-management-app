// Lectures dérivées du dépôt : synthèse financière et indicateurs d'un projet. Elles sont mises en
// cache par projet et ne sont recalculées que si une collection dont elles dépendent a changé.
import type { DonneesBudget } from "../domaine/lib/budget";
import { avancementPlanning, tachesEnRetard } from "../domaine/lib/finance";
import { criticite, estActif, score } from "../domaine/lib/risques";
import { attendDe } from "../domaine/lib/validations";
import { consolider, sante, syntheseDe, type Sante, type SyntheseFinanciere } from "../domaine/socle/synthese";
import type { TypeProjet } from "../domaine/socle/types";
import type { ID, Projet, Tache } from "../domaine/types";
import type { Depot } from "./depot";
import { useDerive } from "./hooks";
import type { NomCollection } from "./schema";

type Suivre = (cle: string) => void;
const rien: Suivre = () => {};

const COLLECTIONS_BUDGET: NomCollection[] = ["budget", "lots", "contrats", "factures", "facturesHorsCommande", "offres", "ajustements", "mutations", "appelsOffres"];
const COLLECTIONS_SYNTHESE: NomCollection[] = [...COLLECTIONS_BUDGET, "relevesSource", "atterrissagesSaisis", "scenarios"];

/** Données du moteur par position pour un projet */
export function donneesBudget(depot: Depot, projetId: ID, suivre: Suivre = rien): DonneesBudget {
  for (const c of COLLECTIONS_BUDGET) suivre(`${c}|${projetId}`);
  return {
    budget: depot.parProjet("budget", projetId), lots: depot.parProjet("lots", projetId), contrats: depot.parProjet("contrats", projetId),
    factures: depot.parProjet("factures", projetId), facturesHorsCommande: depot.parProjet("facturesHorsCommande", projetId),
    offres: depot.parProjet("offres", projetId), ajustements: depot.parProjet("ajustements", projetId), mutations: depot.parProjet("mutations", projetId),
    appelsOffres: depot.parProjet("appelsOffres", projetId),
  };
}

const caches = new WeakMap<Depot, Map<string, { cle: string; valeur: unknown }>>();

function memo<T>(depot: Depot, nom: string, cle: string, calcul: () => T): T {
  let c = caches.get(depot);
  if (!c) caches.set(depot, (c = new Map()));
  const e = c.get(nom);
  if (e && e.cle === cle) return e.valeur as T;
  const valeur = calcul();
  c.set(nom, { cle, valeur });
  return valeur;
}

export function typeDe(depot: Depot, projet: Pick<Projet, "typeProjetId"> | undefined): TypeProjet | undefined {
  return depot.parId("typesProjet", projet?.typeProjetId) ?? depot.tous("typesProjet")[0];
}

export function enfantsDe(depot: Depot, projetId: ID): Projet[] {
  return depot.tous("projets").filter((p) => p.parentId === projetId);
}

/** Identifiants d'un projet et de tous ses descendants */
export function familleDe(depot: Depot, projetId: ID): ID[] {
  return [projetId, ...enfantsDe(depot, projetId).flatMap((e) => familleDe(depot, e.id))];
}

function synthesePropre(depot: Depot, projet: Projet, suivre: Suivre): SyntheseFinanciere {
  const pid = projet.id;
  for (const c of COLLECTIONS_SYNTHESE) suivre(`${c}|${pid}`);
  suivre("typesProjet");
  const mode = typeDe(depot, projet)?.modeFinancier ?? "synthese";
  const cle = `${mode}|${COLLECTIONS_SYNTHESE.map((c) => depot.version(`${c}|${pid}`)).join(".")}`;
  return memo(depot, `synthese|${pid}`, cle, () => syntheseDe({
    mode,
    positions: mode === "positions" ? donneesBudget(depot, pid) : undefined,
    releve: depot.parProjet("relevesSource", pid)[0],
    atterrissagesSaisis: depot.parProjet("atterrissagesSaisis", pid),
    scenarios: depot.parProjet("scenarios", pid),
  }));
}

/** Synthèse financière d'un projet, sous-projets compris */
export function syntheseProjet(depot: Depot, projetId: ID, suivre: Suivre = rien): SyntheseFinanciere {
  suivre("projets");
  const projet = depot.parId("projets", projetId);
  if (!projet) return syntheseDe({ mode: "synthese" });
  const propre = synthesePropre(depot, projet, suivre);
  const enfants = enfantsDe(depot, projetId);
  return enfants.length ? consolider(propre, enfants.map((e) => syntheseProjet(depot, e.id, suivre))) : propre;
}

export interface IndicateursProjet {
  projet: Projet;
  type?: TypeProjet;
  synthese: SyntheseFinanciere;
  sante: Sante;
  /** Avancement en %, d'après le planning ou, à défaut, le temps écoulé */
  avancement: number;
  retards: Tache[];
  risquesOuverts: number;
  risquesCritiques: number;
  prochainJalon?: Tache;
  validationsEnAttente: number;
  /** Champs obligatoires de la fiche non renseignés pour ce type de projet et cette phase */
  champsManquants: string[];
  sousProjets: number;
}

/** Champs obligatoires de la fiche, selon le type de projet et la phase, qui sont restés vides */
export function champsManquantsProjet(projet: Projet, type: TypeProjet | undefined): string[] {
  if (!type) return [];
  const requis = new Set([...(type.champsObligatoires["*"] ?? []), ...(type.champsObligatoires[projet.phaseGroupe ?? ""] ?? [])]);
  const p = projet as unknown as Record<string, unknown>;
  return [...requis].filter((c) => p[c] === undefined || p[c] === null || p[c] === "");
}

function tempsEcoule(p: Projet, jour: string): number {
  const d = new Date(p.dateDebut).getTime(), f = new Date(p.dateFin).getTime(), j = new Date(jour).getTime();
  if (!(f > d)) return 0;
  return Math.max(0, Math.min(100, ((j - d) / (f - d)) * 100));
}

export function indicateursProjet(depot: Depot, projet: Projet, jour: string, suivre: Suivre = rien): IndicateursProjet {
  const pid = projet.id;
  for (const c of ["taches", "risques", "validations"] as const) suivre(`${c}|${pid}`);
  suivre("configurations");
  const synthese = syntheseProjet(depot, pid, suivre);
  const taches = depot.parProjet("taches", pid);
  const retards = tachesEnRetard(taches, jour);
  const risques = depot.parProjet("risques", pid).filter(estActif);
  const config = depot.parId("configurations", "courante");
  const type = typeDe(depot, projet);
  return {
    projet, type, synthese,
    sante: sante(synthese, retards.length, config?.seuilsSante ?? { surveiller: 0, critique: 5 }),
    avancement: taches.length ? avancementPlanning(taches) : tempsEcoule(projet, jour),
    retards,
    risquesOuverts: risques.length,
    risquesCritiques: risques.filter((r) => criticite(score(r)) === "Critique").length,
    prochainJalon: taches.filter((t) => t.jalon && t.avancement < 100 && t.fin >= jour).sort((a, b) => a.fin.localeCompare(b.fin))[0],
    validationsEnAttente: depot.parProjet("validations", pid).filter((v) => v.statut === "En cours").length,
    champsManquants: champsManquantsProjet(projet, type),
    sousProjets: enfantsDe(depot, pid).length,
  };
}

/** Synthèse financière du projet, à jour à chaque modification des données dont elle dépend */
export function useSynthese(projetId: ID): SyntheseFinanciere {
  return useDerive((depot, suivre) => syntheseProjet(depot, projetId, suivre), [projetId]);
}

export function useIndicateurs(projets: Projet[], jour: string): IndicateursProjet[] {
  return useDerive((depot, suivre) => projets.map((p) => indicateursProjet(depot, p, jour, suivre)), [projets, jour]);
}

/** Ce qui attend une personne, tous projets confondus */
export function aTraiter(depot: Depot, utilisateurId: ID | null | undefined, projetIds: Set<ID>, jour: string) {
  const dans = <T extends { projetId: ID }>(xs: T[]) => xs.filter((x) => projetIds.has(x.projetId));
  const actions = dans(depot.tous("actions")).filter((a) => a.assigneId === utilisateurId && a.statut !== "Terminé");
  return {
    validations: dans(depot.tous("validations")).filter((v) => attendDe(v, utilisateurId, depot.tous("delegations"), jour)),
    actions: actions.sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999")),
    actionsEnRetard: actions.filter((a) => a.echeance && a.echeance < jour).length,
    risques: dans(depot.tous("risques")).filter((r) => r.proprietaireId === utilisateurId && estActif(r)).sort((a, b) => score(b) - score(a)),
  };
}
