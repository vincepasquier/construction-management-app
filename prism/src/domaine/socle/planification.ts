// Planification : tenue des jalons (date de référence, date actuelle, date réelle) et équilibre
// entre la charge demandée par les projets et la capacité des directions, en jours-hommes.
import { joursEntre } from "../lib/format";
import type { ID, Tache } from "../types";
import type { Capacite, EstimationCharge } from "./types";

export type EtatJalon = "Atteint" | "En retard" | "Décalé" | "À venir";

/** Date de référence d'un jalon : celle arrêtée au départ ; à défaut, sa date planifiée */
export const reference = (t: Tache) => t.finPrevue ?? t.fin;

/** Écart en jours entre la date de référence et la date réelle (ou, à défaut, la date planifiée) ; positif = retard */
export const ecartJalon = (t: Tache) => joursEntre(reference(t), t.finReelle ?? t.fin);

export function etatJalon(t: Tache, jour: string): EtatJalon {
  if (t.finReelle || t.avancement >= 100) return "Atteint";
  if (t.fin < jour) return "En retard";
  return ecartJalon(t) > 0 ? "Décalé" : "À venir";
}

export interface LigneCapacite {
  directionId: ID;
  competence?: string;
  demande: number;
  capacite: number;
  /** Capacité − demande ; négatif = surcharge */
  solde: number;
  /** Demande rapportée à la capacité, en % ; indéfini si aucune capacité n'est saisie */
  taux?: number;
  projets: { projetId: ID; joursHommes: number }[];
}

/** Charge demandée et capacité par direction (et par compétence si demandé), pour une année */
export function bilanCapacite(estimations: EstimationCharge[], capacites: Capacite[], annee: number, parCompetence = false): LigneCapacite[] {
  const cle = (directionId: ID | undefined, competence: string | undefined) => `${directionId ?? ""}|${parCompetence ? competence ?? "" : ""}`;
  const lignes = new Map<string, LigneCapacite>();
  const ligne = (directionId: ID | undefined, competence: string | undefined) => {
    const k = cle(directionId, competence);
    let l = lignes.get(k);
    if (!l) lignes.set(k, (l = { directionId: directionId ?? "", competence: parCompetence ? competence : undefined, demande: 0, capacite: 0, solde: 0, projets: [] }));
    return l;
  };
  for (const e of estimations.filter((x) => x.annee === annee)) {
    const l = ligne(e.directionId, e.competence);
    l.demande += e.joursHommes;
    const p = l.projets.find((x) => x.projetId === e.projetId);
    if (p) p.joursHommes += e.joursHommes; else l.projets.push({ projetId: e.projetId, joursHommes: e.joursHommes });
  }
  for (const c of capacites.filter((x) => x.annee === annee)) ligne(c.directionId, c.competence).capacite += c.joursHommes;
  return [...lignes.values()].map((l) => ({ ...l, solde: l.capacite - l.demande, taux: l.capacite ? (l.demande / l.capacite) * 100 : undefined, projets: l.projets.sort((a, b) => b.joursHommes - a.joursHommes) }))
    .sort((a, b) => (b.taux ?? Infinity) - (a.taux ?? Infinity));
}

export const anneesCouvertes = (estimations: EstimationCharge[], capacites: Capacite[], courante: number) =>
  [...new Set([courante, courante + 1, ...estimations.map((e) => e.annee), ...capacites.map((c) => c.annee)])].sort();
