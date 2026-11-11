// Rapports de phase et de clôture : trame des rubriques, cycle de vie, et indicateurs du projet
// figés au moment où le rapport est soumis.
import type { ID } from "../types";
import type { Rapport, SectionRapport, StatutRapport, ValeursSynthese } from "./types";

const RUBRIQUES_PHASE: [string, string, string][] = [
  ["resume", "Résumé de la phase", "Ce qui a été réalisé pendant la phase, en quelques lignes."],
  ["objectifs", "Atteinte des objectifs", "Objectifs de la phase tenus, partiellement tenus ou reportés, et pourquoi."],
  ["livrables", "Livrables", "Livrables remis, et ceux qui restent à remettre."],
  ["finances", "Situation financière", "Budget, engagé, réalisé, atterrissage ; explication des écarts."],
  ["planning", "Planning et jalons", "Jalons tenus ou décalés ; planning de la phase suivante."],
  ["risques", "Risques et opportunités", "Risques survenus, risques ouverts, mesures en cours."],
  ["ressources", "Ressources", "Charge consommée et besoins pour la phase suivante."],
  ["suite", "Phase suivante et décision demandée", "Ce qui est demandé à l'organe de décision : passage de phase, crédit, arbitrage."],
];

const RUBRIQUES_CLOTURE: [string, string, string][] = [
  ["resume", "Résumé du projet", "Rappel de l'objet du projet et de son déroulement."],
  ["objectifs", "Atteinte des objectifs et bénéfices", "Objectifs du mandat atteints ou non ; bénéfices constatés et à venir."],
  ["finances", "Bilan financier", "Budget initial, budget approuvé, coût final ; explication de l'écart."],
  ["planning", "Bilan des délais", "Dates prévues et réelles des principaux jalons."],
  ["qualite", "Qualité et réserves", "Réserves ouvertes, garanties, points de vigilance pour l'exploitation."],
  ["enseignements", "Enseignements", "Ce qui a bien fonctionné, ce qu'il faudrait faire autrement."],
  ["transfert", "Transfert à l'exploitation", "Documents remis, responsabilités après la clôture."],
  ["reste", "Points ouverts", "Ce qui reste à traiter après la clôture, par qui et pour quand."],
];

export const rubriques = (type: Rapport["type"]) => (type === "Phase" ? RUBRIQUES_PHASE : RUBRIQUES_CLOTURE).map(([cle, titre, aide]) => ({ cle, titre, aide }));

export function rapportVide(o: { id: ID; projetId: ID; type: Rapport["type"]; phase?: string; version?: number; auteurId?: ID; date: string; preremplissage?: Record<string, string> }): Rapport {
  const sections: SectionRapport[] = rubriques(o.type).map((r) => ({ cle: r.cle, titre: r.titre, texte: o.preremplissage?.[r.cle] ?? "" }));
  return {
    id: o.id, projetId: o.projetId, type: o.type, phase: o.type === "Phase" ? o.phase : undefined,
    titre: o.type === "Phase" ? `Rapport de phase – ${o.phase ?? ""}`.trim() : "Rapport de clôture",
    version: o.version ?? 1, statut: "Brouillon", sections, auteurId: o.auteurId, date: o.date,
  };
}

/** Le rapport peut-il être soumis ? Un rapport rédigé doit avoir ses rubriques ; un rapport déposé, son document */
export function rubriquesVides(r: Rapport): string[] {
  if (r.documentUrl?.trim()) return [];
  return r.sections.filter((s) => !s.texte.trim()).map((s) => s.titre);
}

const TRANSITIONS: Record<StatutRapport, StatutRapport[]> = {
  Brouillon: ["En revue"], "En revue": ["Validé", "Refusé", "Brouillon"], "Refusé": ["Brouillon"], "Validé": [],
};

export const transitionsPossibles = (s: StatutRapport) => TRANSITIONS[s];

export function changerStatut(r: Rapport, vers: StatutRapport, indicateurs?: Rapport["indicateurs"]): Rapport {
  if (!TRANSITIONS[r.statut].includes(vers)) throw new Error(`Un rapport « ${r.statut} » ne peut pas passer à « ${vers} ».`);
  if (vers === "En revue") {
    const vides = rubriquesVides(r);
    if (vides.length) throw new Error(`Rubriques à compléter avant la soumission : ${vides.join(", ")}.`);
    // Les indicateurs sont figés à la soumission : le rapport reste lisible tel qu'il a été présenté
    return { ...r, statut: vers, indicateurs: indicateurs ?? r.indicateurs };
  }
  return { ...r, statut: vers };
}

/** Indicateurs du projet joints au rapport */
export function indicateursFiges(v: ValeursSynthese, o: { avancement: number; retards: number; risquesOuverts: number; risquesCritiques: number; completude: number; date: string }): NonNullable<Rapport["indicateurs"]> {
  return {
    "Budget approuvé": Math.round(v.budgetApprouve), "Engagé": Math.round(v.engage), "Réalisé": Math.round(v.realise), "Atterrissage": Math.round(v.atterrissage),
    "Écart": Math.round(v.budgetApprouve - v.atterrissage), "Avancement (%)": Math.round(o.avancement), "Tâches en retard": o.retards,
    "Risques ouverts": o.risquesOuverts, "Risques critiques": o.risquesCritiques, "Indice de complétude (%)": o.completude, "Valeurs au": o.date,
  };
}

/** Phases terminées : toutes celles qui précèdent la phase courante dans l'ordre du type de projet */
export function phasesTerminees(phases: string[], courante: string | undefined, cloture = false): string[] {
  if (cloture) return [...phases];
  const i = courante ? phases.indexOf(courante) : -1;
  return i > 0 ? phases.slice(0, i) : [];
}

export const phaseSuivante = (phases: string[], courante: string | undefined) => {
  const i = courante ? phases.indexOf(courante) : -1;
  return i >= 0 ? phases[i + 1] : phases[0];
};
