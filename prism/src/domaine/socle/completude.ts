// Indice de complétude d'un projet : part pondérée des critères remplis, sur deux axes — le dossier
// (mandat, rapports, parties prenantes, décisions) et la qualité des données (fiche, finances,
// risques, jalons). Les critères et leurs poids se règlent dans la configuration.
import type { CritereCompletude } from "./types";

/** Faits observés sur le projet, calculés par la couche de données */
export interface FaitsCompletude {
  responsableDesigne: boolean;
  champsManquants: string[];
  /** Dernière période financière arrêtée, et mois attendu (le mois précédent) */
  dernierePeriode?: string;
  moisAttendu: string;
  risquesOuverts: number;
  risquesNonRevus: number;
  jalonsDepassesSansReel: number;
  mandatSigne: boolean;
  /** Phases terminées, et celles qui ont un rapport validé */
  phasesTerminees: string[];
  phasesAvecRapport: string[];
  partiesPrenantes: number;
  conditionsEchues: number;
  /** Le projet n'a pas encore commencé : les critères de suivi ne s'appliquent pas */
  nonDemarre: boolean;
}

export interface ResultatCritere {
  critere: CritereCompletude;
  rempli: boolean;
  /** Le critère ne s'applique pas à ce projet (ex. aucun risque ouvert) : il ne pèse pas */
  sansObjet: boolean;
  explication: string;
}

type Regle = (f: FaitsCompletude) => { rempli: boolean; sansObjet?: boolean; explication: string };

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export const REGLES_COMPLETUDE: Record<string, Regle> = {
  responsable: (f) => ({ rempli: f.responsableDesigne, explication: f.responsableDesigne ? "Responsable désigné" : "Aucun responsable de projet" }),
  champsObligatoires: (f) => ({ rempli: f.champsManquants.length === 0, explication: f.champsManquants.length ? `À renseigner : ${f.champsManquants.join(", ")}` : "Fiche complète" }),
  periodeRecente: (f) => ({
    rempli: !!f.dernierePeriode && f.dernierePeriode >= f.moisAttendu, sansObjet: f.nonDemarre,
    explication: f.nonDemarre ? "Projet non démarré" : f.dernierePeriode ? `Dernière période arrêtée : ${f.dernierePeriode}` : "Aucune période arrêtée",
  }),
  risquesRevus: (f) => ({
    rempli: f.risquesNonRevus === 0, sansObjet: f.risquesOuverts === 0,
    explication: f.risquesOuverts === 0 ? "Aucun risque ouvert" : f.risquesNonRevus ? `${pluriel(f.risquesNonRevus, "risque")} à revoir` : "Risques revus dans le délai",
  }),
  jalonsAJour: (f) => ({ rempli: f.jalonsDepassesSansReel === 0, explication: f.jalonsDepassesSansReel ? `${pluriel(f.jalonsDepassesSansReel, "jalon")} dépassé(s) sans date réelle` : "Jalons à jour" }),
  mandatSigne: (f) => ({ rempli: f.mandatSigne, explication: f.mandatSigne ? "Mandat signé" : "Mandat non signé" }),
  rapportsPhase: (f) => {
    const sans = f.phasesTerminees.filter((p) => !f.phasesAvecRapport.includes(p));
    return { rempli: sans.length === 0, sansObjet: f.phasesTerminees.length === 0, explication: f.phasesTerminees.length === 0 ? "Aucune phase terminée" : sans.length ? `Rapport manquant : ${sans.join(", ")}` : "Un rapport par phase terminée" };
  },
  partiesPrenantes: (f) => ({ rempli: f.partiesPrenantes > 0, explication: f.partiesPrenantes ? pluriel(f.partiesPrenantes, "partie") + " prenante(s)" : "Aucune partie prenante identifiée" }),
  conditionsSuivies: (f) => ({ rempli: f.conditionsEchues === 0, explication: f.conditionsEchues ? `${pluriel(f.conditionsEchues, "condition")} échue(s) non traitée(s)` : "Aucune condition en retard" }),
};

export interface Completude {
  /** 0 à 100 */
  indice: number;
  parAxe: Record<CritereCompletude["axe"], number>;
  criteres: ResultatCritere[];
  manquants: ResultatCritere[];
}

export function evaluerCompletude(criteres: CritereCompletude[], faits: FaitsCompletude): Completude {
  const resultats: ResultatCritere[] = criteres.filter((c) => c.actif).map((critere) => {
    const regle = REGLES_COMPLETUDE[critere.regle];
    if (!regle) return { critere, rempli: false, sansObjet: true, explication: "Règle inconnue : critère ignoré" };
    const r = regle(faits);
    return { critere, rempli: r.rempli || !!r.sansObjet, sansObjet: !!r.sansObjet, explication: r.explication };
  });
  const indice = (liste: ResultatCritere[]) => {
    const comptes = liste.filter((r) => !r.sansObjet);
    const total = comptes.reduce((s, r) => s + r.critere.poids, 0);
    return total ? Math.round((comptes.filter((r) => r.rempli).reduce((s, r) => s + r.critere.poids, 0) / total) * 100) : 100;
  };
  return {
    indice: indice(resultats),
    parAxe: { Documentaire: indice(resultats.filter((r) => r.critere.axe === "Documentaire")), "Qualité des données": indice(resultats.filter((r) => r.critere.axe === "Qualité des données")) },
    criteres: resultats,
    manquants: resultats.filter((r) => !r.rempli),
  };
}
