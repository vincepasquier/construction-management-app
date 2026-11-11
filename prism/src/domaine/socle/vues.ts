// Agrégats des vues de pilotage : totaux d'un ensemble de projets, regroupés par direction,
// portefeuille, programme ou type, et répartition du budget par année.
import type { ReleveSource, ValeursSynthese } from "./types";
import type { Sante } from "./synthese";

export interface LigneProjet {
  cle: string;
  valeurs: Pick<ValeursSynthese, "budgetApprouve" | "engage" | "realise" | "atterrissage">;
  sante: Sante;
}

export interface Agregat {
  cle: string;
  projets: number;
  budgetApprouve: number;
  engage: number;
  realise: number;
  atterrissage: number;
  /** Budget approuvé − atterrissage ; négatif = dépassement */
  ecart: number;
  ecartPct: number;
  critiques: number;
  aSurveiller: number;
}

const vide = (cle: string): Agregat => ({ cle, projets: 0, budgetApprouve: 0, engage: 0, realise: 0, atterrissage: 0, ecart: 0, ecartPct: 0, critiques: 0, aSurveiller: 0 });

function ajouter(a: Agregat, l: LigneProjet): void {
  a.projets++;
  a.budgetApprouve += l.valeurs.budgetApprouve; a.engage += l.valeurs.engage; a.realise += l.valeurs.realise; a.atterrissage += l.valeurs.atterrissage;
  if (l.sante === "mauvais") a.critiques++;
  if (l.sante === "alerte") a.aSurveiller++;
}

const finir = (a: Agregat): Agregat => ({ ...a, ecart: a.budgetApprouve - a.atterrissage, ecartPct: a.budgetApprouve ? ((a.budgetApprouve - a.atterrissage) / a.budgetApprouve) * 100 : 0 });

/** Totaux par groupe, du plus gros budget au plus petit */
export function agreger(lignes: LigneProjet[]): Agregat[] {
  const groupes = new Map<string, Agregat>();
  for (const l of lignes) {
    let a = groupes.get(l.cle);
    if (!a) groupes.set(l.cle, (a = vide(l.cle)));
    ajouter(a, l);
  }
  return [...groupes.values()].map(finir).sort((a, b) => b.budgetApprouve - a.budgetApprouve);
}

export function total(lignes: LigneProjet[]): Agregat {
  const a = vide("Total");
  for (const l of lignes) ajouter(a, l);
  return finir(a);
}

/** Budget et réalisé par année civile, d'après les relevés de la source */
export function parAnnee(releves: Pick<ReleveSource, "parAnnee">[]): { annee: string; budget: number; realise: number }[] {
  const annees = new Map<string, { budget: number; realise: number }>();
  for (const r of releves) {
    for (const [a, v] of Object.entries(r.parAnnee ?? {})) {
      const x = annees.get(a) ?? { budget: 0, realise: 0 };
      x.budget += v.budget; x.realise += v.realise;
      annees.set(a, x);
    }
  }
  return [...annees.entries()].map(([annee, v]) => ({ annee, ...v })).sort((a, b) => a.annee.localeCompare(b.annee));
}
