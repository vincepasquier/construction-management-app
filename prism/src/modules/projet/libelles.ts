import type { Projet } from "@/domaine/types";

/** Libellé des champs de la fiche projet, pour les contrôles et l'historique */
export const LIBELLE_CHAMP: Partial<Record<keyof Projet, string>> = {
  code: "Code", nom: "Nom", description: "Description", maitreOuvrage: "Maître d'ouvrage", lieu: "Lieu", phase: "Phase SIA", phaseGroupe: "Phase",
  dateDebut: "Début", dateFin: "Fin", tauxTVA: "Taux de TVA", directeurId: "Responsable de projet", sponsorId: "Sponsor", directionId: "Direction",
  portefeuilleId: "Portefeuille", programmeId: "Programme", typeProjetId: "Type de projet", statut: "Statut", statutSource: "Statut dans la source",
  priorite: "Priorité", classification: "Classification", confidentialite: "Confidentialité", compteAnalytique: "Compte analytique",
  numeroSource: "Numéro dans la source", parentId: "Projet parent", strategique: "Projet stratégique", suiviCA: "Suivi par le CA",
};

export const libelleChamp = (cle: string) => LIBELLE_CHAMP[cle as keyof Projet] ?? cle;
