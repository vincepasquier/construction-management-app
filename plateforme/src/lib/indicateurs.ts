import type { DonneesDemo } from "../data/demo";
import { avancementPlanning, suiviParCFC, tachesEnRetard, totauxSuivi } from "./finance";

export function indicateursProjet(d: DonneesDemo, projetId: string, aujourdhui: string) {
  const par = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId === projetId);
  const contrats = par(d.contrats);
  const factures = par(d.factures);
  const taches = par(d.taches);
  const suivi = suiviParCFC(par(d.budget), contrats, factures, par(d.appelsOffres));
  const totaux = totauxSuivi(suivi);
  const retard = tachesEnRetard(taches, aujourdhui);
  const avenantsEnAttente = contrats.flatMap((c) => c.avenants).filter((a) => a.statut === "Demandé").length;
  const facturesATraiter = factures.filter((f) => f.statut === "Reçue" || f.statut === "Contrôlée").length;
  return {
    totaux,
    suivi,
    avancement: avancementPlanning(taches),
    tachesEnRetard: retard,
    avenantsEnAttente,
    facturesATraiter,
    aoOuverts: par(d.appelsOffres).filter((a) => !["Adjugé", "Annulé"].includes(a.statut)).length,
    tauxFacturation: totaux.prevision > 0 ? (totaux.facture / totaux.prevision) * 100 : 0,
  };
}

export type Sante = "bon" | "alerte" | "mauvais";

/** Santé globale : écart budgétaire et retards */
export function santeProjet(ecartPct: number, retards: number): Sante {
  if (ecartPct < -5 || retards >= 3) return "mauvais";
  if (ecartPct < 0 || retards > 0) return "alerte";
  return "bon";
}
