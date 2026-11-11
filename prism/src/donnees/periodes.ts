// Arrêt mensuel de la situation financière d'un projet : la photo de sa synthèse, comparée à la
// période précédente. La règle « commentaire au-delà du seuil » est appliquée par le dépôt.
import { commentaireExige, photographier, precedente, variation, type Variation } from "../domaine/socle/periodes";
import type { PeriodeFinanciere, ValeursSynthese } from "../domaine/socle/types";
import type { ID } from "../domaine/types";
import type { Depot } from "./depot";
import { syntheseProjet } from "./lectures";

export interface EtatPeriode {
  mois: string;
  valeurs: ValeursSynthese;
  precedente?: PeriodeFinanciere;
  variation: Variation;
  seuilPct: number;
  /** Un commentaire est exigé pour arrêter cette période */
  commentaireExige: boolean;
  existante?: PeriodeFinanciere;
}

export const seuilVariation = (depot: Depot) => depot.parId("configurations", "courante")?.seuilVariationPct ?? 2;

export function etatPeriode(depot: Depot, projetId: ID, mois: string): EtatPeriode {
  const periodes = depot.parProjet("periodesFinancieres", projetId);
  const valeurs = syntheseProjet(depot, projetId);
  const prec = precedente(periodes, mois);
  const v = variation(prec?.valeurs, valeurs);
  const seuilPct = seuilVariation(depot);
  return { mois, valeurs, precedente: prec, variation: v, seuilPct, commentaireExige: commentaireExige(v, seuilPct), existante: periodes.find((p) => p.mois === mois) };
}

/** Arrête la période : crée la photo du mois (ou la refait si elle existe déjà) */
export function arreterPeriode(depot: Depot, projetId: ID, mois: string, commentaire?: string, date = new Date().toISOString()): PeriodeFinanciere {
  const e = etatPeriode(depot, projetId, mois);
  const photo = photographier(projetId, mois, date, e.valeurs, depot.acteurId, commentaire);
  depot.grouper(`Arrêt de la période ${mois}`, () => {
    if (e.existante) depot.supprimer("periodesFinancieres", e.existante.id, { motif: "Période refaite pour le même mois" });
    depot.ajouter("periodesFinancieres", photo);
  });
  return photo;
}

export interface ResultatArretGroupe {
  arretees: ID[];
  /** Projets dont la variation dépasse le seuil : leur responsable doit commenter */
  aCommenter: ID[];
  dejaFaites: ID[];
}

/** Arrête la période de tous les projets indiqués qui peuvent l'être sans commentaire */
export function arreterPeriodeGroupe(depot: Depot, projetIds: ID[], mois: string, date = new Date().toISOString()): ResultatArretGroupe {
  const r: ResultatArretGroupe = { arretees: [], aCommenter: [], dejaFaites: [] };
  depot.grouper(`Arrêt de la période ${mois} pour le portefeuille`, () => {
    for (const id of projetIds) {
      const e = etatPeriode(depot, id, mois);
      if (e.existante) r.dejaFaites.push(id);
      else if (e.commentaireExige) r.aCommenter.push(id);
      else { depot.ajouter("periodesFinancieres", photographier(id, mois, date, e.valeurs, depot.acteurId)); r.arretees.push(id); }
    }
  });
  return r;
}
