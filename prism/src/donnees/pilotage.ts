// Lignes de pilotage : pour chaque projet du périmètre, tout ce que les vues de groupe affichent —
// indicateurs, complétude, mandat, période financière, décisions en attente.
import { moisDe } from "../domaine/lib/format";
import type { Completude } from "../domaine/socle/completude";
import { mandatEnVigueur } from "../domaine/socle/mandat";
import { moisPrecedent, trier, variation, type Variation } from "../domaine/socle/periodes";
import type { PeriodeFinanciere } from "../domaine/socle/types";
import type { Projet } from "../domaine/types";
import type { Depot } from "./depot";
import { completudeProjet, conditionsOuvertes, risquesARevoir } from "./gouvernance";
import { useDerive } from "./hooks";
import { indicateursProjet, type IndicateursProjet } from "./lectures";
import { etatPeriode, type EtatPeriode } from "./periodes";

export interface LignePilotage {
  projet: Projet;
  i: IndicateursProjet;
  completude: Completude;
  mandatSigne: boolean;
  /** Période du mois précédent : arrêtée ou non, variation, commentaire attendu */
  periode: EtatPeriode;
  /** Dernière période arrêtée, quel que soit le mois, et variation de l'atterrissage depuis */
  derniere?: PeriodeFinanciere;
  depuisDerniere: Variation;
  conditionsEchues: number;
  rapportsEnRevue: number;
  risquesARevoir: number;
}

export function lignesPilotage(depot: Depot, projets: Projet[], jour: string, suivre: (cle: string) => void = () => {}): LignePilotage[] {
  const mois = moisPrecedent(moisDe(jour));
  const jours = depot.parId("configurations", "courante")?.joursRevueRisque ?? 90;
  return projets.map((projet) => {
    const pid = projet.id;
    for (const c of ["mandats", "rapports", "decisions", "decisionsPhase", "risques", "periodesFinancieres"] as const) suivre(`${c}|${pid}`);
    const periode = etatPeriode(depot, pid, mois);
    const derniere = trier(depot.parProjet("periodesFinancieres", pid)).at(-1);
    return {
      projet, i: indicateursProjet(depot, projet, jour, suivre), completude: completudeProjet(depot, projet, jour, suivre),
      mandatSigne: mandatEnVigueur(depot.parProjet("mandats", pid))?.statut === "Signé",
      periode, derniere, depuisDerniere: variation(derniere?.valeurs, periode.valeurs),
      conditionsEchues: conditionsOuvertes(depot.parProjet("decisions", pid), depot.parProjet("decisionsPhase", pid), jour).filter((c) => c.echue).length,
      rapportsEnRevue: depot.parProjet("rapports", pid).filter((r) => r.statut === "En revue").length,
      risquesARevoir: risquesARevoir(depot.parProjet("risques", pid), jour, jours).length,
    };
  });
}

export function useLignesPilotage(projets: Projet[], jour: string): LignePilotage[] {
  return useDerive((depot, suivre) => lignesPilotage(depot, projets, jour, suivre), [projets.map((p) => p.id).join("|"), jour]);
}
