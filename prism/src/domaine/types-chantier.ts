// Suivi de chantier (verticale construction) : réserves, réceptions, journal, régies, constats, métrés.
// Les procès-verbaux de séance utilisent le type Seance du socle (type « Chantier »).
import type { ID } from "./types";

export type StatutReserve = "Ouverte" | "Levée annoncée" | "Levée" | "Contestée";
export type GraviteReserve = "Mineure" | "Majeure" | "Bloquante";

export interface Reserve {
  id: ID;
  projetId: ID;
  numero: string;
  libelle: string;
  description?: string;
  localisation?: string;
  lotId?: ID;
  contratId?: ID;
  entrepriseId?: ID;
  gravite: GraviteReserve;
  statut: StatutReserve;
  dateConstat: string;
  /** Délai accordé à l'entreprise pour lever la réserve */
  delai?: string;
  dateLevee?: string;
  leveeParId?: ID;
  receptionId?: ID;
  constatId?: ID;
  /** Identifiants des photographies dans le magasin de fichiers */
  photos: ID[];
}

export interface Reception {
  id: ID;
  projetId: ID;
  contratId?: ID;
  lotId?: ID;
  objet: string;
  date: string;
  type: "Partielle" | "Finale";
  resultat: "Acceptée" | "Acceptée avec réserves" | "Refusée";
  /** Début du délai de garantie (SIA 118 : deux ans de dénonciation des défauts) */
  debutGarantie?: string;
  finGarantie?: string;
  participants?: string;
  remarques?: string;
  lieu?: string;
  /** Date de l'avis d'achèvement donné par l'entrepreneur */
  avisAchevement?: string;
  /** Documents remis à la réception (dossier de l'ouvrage, plans conformes, procès-verbaux d'essais…) */
  documentsRemis?: string;
  /** Sûreté fournie pour la durée du délai de dénonciation */
  surete?: string;
  /** Réception différée : date prévue de la nouvelle vérification commune */
  secondeVerification?: string;
}

export interface EffectifChantier {
  entreprise: string;
  personnes: number;
  remarque?: string;
}

export interface EvenementChantier {
  id: ID;
  type: "Livraison" | "Visite" | "Incident" | "Sécurité" | "Arrêt" | "Autre";
  texte: string;
}

export interface EntreeJournalChantier {
  id: ID;
  projetId: ID;
  date: string;
  meteo: "Beau" | "Nuageux" | "Pluie" | "Neige" | "Gel" | "Vent fort";
  temperature?: number;
  effectifs: EffectifChantier[];
  travaux: string;
  evenements: EvenementChantier[];
  photos: ID[];
  auteurId?: ID;
  /** Une entrée verrouillée ne peut plus être modifiée */
  verrouillee?: boolean;
}

export interface LigneRegie {
  id: ID;
  type: "Main-d'œuvre" | "Matériel" | "Engin";
  libelle: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
}

export interface Regie {
  id: ID;
  projetId: ID;
  contratId?: ID;
  numero: string;
  date: string;
  objet: string;
  lignes: LigneRegie[];
  statut: "Saisi" | "Validé" | "Contesté" | "Facturé";
  valideParId?: ID;
  dateValidation?: string;
  factureId?: ID;
  remarques?: string;
}

export interface PhotoConstat {
  fichierId: ID;
  legende?: string;
}

export interface Constat {
  id: ID;
  projetId: ID;
  numero: string;
  date: string;
  type: "Qualité" | "Sécurité" | "Environnement" | "Avancement" | "État des lieux" | "Autre";
  titre: string;
  description: string;
  localisation?: string;
  lotId?: ID;
  entrepriseId?: ID;
  partiesPresentes?: string;
  photos: PhotoConstat[];
  auteurId?: ID;
  /** Suites données au constat */
  reserveId?: ID;
  actionId?: ID;
  risqueId?: ID;
}

export interface Metre {
  id: ID;
  projetId: ID;
  contratId: ID;
  /** Position du descriptif (numéro CAN) ou libellé libre */
  position: string;
  libelle: string;
  unite: string;
  /** Mois du relevé, ex. « 2026-09 » */
  periode: string;
  quantite: number;
  prixUnitaire: number;
  statut: "Relevé" | "Contradictoire" | "Contesté";
  remarque?: string;
}
