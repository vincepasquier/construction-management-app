import type { Risque } from "../types";

export const score = (r: Pick<Risque, "probabilite" | "impact">) => r.probabilite * r.impact;

export type Criticite = "Faible" | "Moyenne" | "Élevée" | "Critique";

export interface SeuilsCriticite { modere: number; eleve: number; critique: number }
export const SEUILS_CRITICITE_DEFAUT: SeuilsCriticite = { modere: 4, eleve: 9, critique: 15 };
let seuils = SEUILS_CRITICITE_DEFAUT;

/** Applique la matrice des risques de la configuration publiée (appelé au démarrage et à chaque publication) */
export function definirSeuilsCriticite(s: SeuilsCriticite | undefined): void {
  seuils = s && s.modere < s.eleve && s.eleve < s.critique ? s : SEUILS_CRITICITE_DEFAUT;
}

export function criticite(s: number, matrice: SeuilsCriticite = seuils): Criticite {
  if (s >= matrice.critique) return "Critique";
  if (s >= matrice.eleve) return "Élevée";
  if (s >= matrice.modere) return "Moyenne";
  return "Faible";
}

export const COULEUR_CRITICITE: Record<Criticite, string> = {
  Faible: "#10b981", Moyenne: "#f59e0b", Élevée: "#f97316", Critique: "#e11d48",
};

export const estActif = (r: Risque) => r.statut === "Ouvert" || r.statut === "En traitement";

/** Exposition financière pondérée : impact financier × probabilité (1 → 10 %, 5 → 90 %) */
export function exposition(risques: Risque[]): number {
  const proba = [0, 0.1, 0.3, 0.5, 0.7, 0.9];
  return risques.filter(estActif).reduce((s, r) => s + r.impactFinancier * proba[r.probabilite], 0);
}
