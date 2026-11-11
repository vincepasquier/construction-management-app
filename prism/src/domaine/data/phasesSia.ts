// Phases de la norme SIA 112 (modèle de prestations), regroupées par phase principale.
import type { PhaseSIA } from "../types";

export const GROUPES_PHASES: { numero: string; nom: string; couleur: string; phases: PhaseSIA[] }[] = [
  { numero: "1", nom: "Définition des objectifs", couleur: "#64748b", phases: ["11 Énoncé des besoins"] },
  { numero: "2", nom: "Études préliminaires", couleur: "#0891b2", phases: ["21 Définition du projet", "22 Procédure de choix de mandataires"] },
  { numero: "3", nom: "Étude du projet", couleur: "#4f46e5", phases: ["31 Avant-projet", "32 Projet de l'ouvrage", "33 Procédure de demande d'autorisation"] },
  { numero: "4", nom: "Appel d'offres", couleur: "#d97706", phases: ["41 Appels d'offres"] },
  { numero: "5", nom: "Réalisation", couleur: "#059669", phases: ["51 Projet d'exécution", "52 Exécution de l'ouvrage", "53 Mise en service, achèvement"] },
  { numero: "6", nom: "Exploitation", couleur: "#475569", phases: ["61 Exploitation"] },
];

export const PHASES: PhaseSIA[] = GROUPES_PHASES.flatMap((g) => g.phases);

export const couleurPhase = (p: PhaseSIA) => GROUPES_PHASES.find((g) => g.phases.includes(p))?.couleur ?? "#64748b";

export const indexPhase = (p?: PhaseSIA) => (p ? PHASES.indexOf(p) : -1);

/** Libellé court : « 52 Exécution » */
export const phaseCourte = (p: PhaseSIA) => p.split(" ").slice(0, 2).join(" ").replace(/,$/, "");
