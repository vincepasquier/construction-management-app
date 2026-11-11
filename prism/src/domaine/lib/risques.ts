import type { Risque } from "../types";

export const score = (r: Pick<Risque, "probabilite" | "impact">) => r.probabilite * r.impact;

export type Criticite = "Faible" | "Moyenne" | "Élevée" | "Critique";

export function criticite(s: number): Criticite {
  if (s >= 15) return "Critique";
  if (s >= 9) return "Élevée";
  if (s >= 4) return "Moyenne";
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
