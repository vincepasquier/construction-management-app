// Périodes financières : une photo mensuelle de la synthèse de chaque projet. Elles donnent
// l'historique, les variations d'un mois à l'autre, et imposent un commentaire quand
// l'atterrissage bouge au-delà du seuil fixé dans la configuration.
import type { ID } from "../types";
import type { PeriodeFinanciere, ValeursSynthese } from "./types";

const CHAMPS: (keyof ValeursSynthese)[] = ["budgetInitial", "budgetApprouve", "engage", "realise", "paye", "atterrissage", "atterrissageDefavorable"];

export const moisDe = (date: string) => date.slice(0, 7);

export function moisPrecedent(mois: string): string {
  const [a, m] = mois.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export const valeursDe = (s: ValeursSynthese): ValeursSynthese => Object.fromEntries(CHAMPS.map((c) => [c, Math.round(s[c] * 100) / 100])) as unknown as ValeursSynthese;

/** Périodes d'un projet, de la plus ancienne à la plus récente */
export const trier = (periodes: PeriodeFinanciere[]) => [...periodes].sort((a, b) => a.mois.localeCompare(b.mois));

/** Dernière période arrêtée avant le mois indiqué */
export const precedente = (periodes: PeriodeFinanciere[], mois: string) => trier(periodes).filter((p) => p.mois < mois).at(-1);

export interface Variation {
  /** Variation de l'atterrissage en francs ; positive = hausse du coût prévu */
  atterrissage: number;
  /** Rapportée au budget approuvé de la période de référence */
  pct: number;
  budget: number;
  realise: number;
  engage: number;
}

export function variation(reference: ValeursSynthese | undefined, courant: ValeursSynthese): Variation {
  if (!reference) return { atterrissage: 0, pct: 0, budget: 0, realise: courant.realise, engage: courant.engage };
  const d = courant.atterrissage - reference.atterrissage;
  const base = reference.budgetApprouve || reference.atterrissage;
  return {
    atterrissage: d, pct: base ? (d / base) * 100 : 0,
    budget: courant.budgetApprouve - reference.budgetApprouve, realise: courant.realise - reference.realise, engage: courant.engage - reference.engage,
  };
}

/** Un commentaire est exigé quand l'atterrissage a bougé de plus que le seuil, dans un sens ou dans l'autre */
export const commentaireExige = (v: Variation, seuilPct: number) => Math.abs(v.pct) > seuilPct;

export function photographier(projetId: ID, mois: string, date: string, valeurs: ValeursSynthese, auteurId?: ID, commentaire?: string): PeriodeFinanciere {
  return { id: `per-${projetId}-${mois}`, projetId, mois, date, valeurs: valeursDe(valeurs), auteurId, commentaire: commentaire?.trim() || undefined };
}

/** Suite des périodes avec la variation de chacune par rapport à la précédente */
export function historique(periodes: PeriodeFinanciere[]): { periode: PeriodeFinanciere; variation: Variation }[] {
  const liste = trier(periodes);
  return liste.map((p, i) => ({ periode: p, variation: variation(liste[i - 1]?.valeurs, p.valeurs) }));
}
