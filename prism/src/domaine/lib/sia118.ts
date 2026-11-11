// Renvois à la norme SIA 118 « Conditions générales pour l'exécution des travaux de construction »
// utilisés dans les documents édités par PRISM. Ils sont réunis ici pour pouvoir être corrigés en
// un seul endroit : la numérotation est celle de l'édition 2013 et doit être contrôlée avec
// l'édition applicable au contrat (une révision est entrée en vigueur en 2026). PRISM renvoie à la
// norme sans en reproduire le texte.

export const NORME = "norme SIA 118";
export const EDITION = "édition 2013";

export const SIA118 = {
  /** Éléments du contrat et ordre de priorité en cas de contradiction */
  ordrePriorite: "art. 21",
  /** Travaux en régie : ordre préalable, rapports, taux */
  regie: "art. 44 ss",
  /** Modifications de commande et leur rémunération */
  modification: "art. 84 ss",
  /** Délais d'exécution */
  delais: "art. 92 ss",
  /** Métrés établis en commun */
  metre: "art. 141 ss",
  /** Acomptes sur situations */
  acomptes: "art. 144 ss",
  /** Retenue sur les acomptes */
  retenue: "art. 149 ss",
  /** Décompte final */
  decompteFinal: "art. 153 ss",
  /** Réception de l'ouvrage */
  reception: "art. 157 ss",
  /** Avis d'achèvement et vérification commune */
  verification: "art. 158",
  /** Ouvrage sans défaut : reçu à l'issue de la vérification */
  sansDefaut: "art. 159",
  /** Défauts mineurs : ouvrage reçu, défauts à éliminer dans le délai fixé */
  defautsMineurs: "art. 160",
  /** Défauts majeurs : réception différée */
  defautsMajeurs: "art. 161",
  /** Réception sans vérification commune */
  receptionTacite: "art. 164",
  /** Responsabilité pour les défauts */
  responsabilite: "art. 165 ss",
  /** Délai de dénonciation des défauts : deux ans dès la réception */
  denonciation: "art. 172",
  /** Vérification commune avant l'expiration du délai de dénonciation */
  verificationFinale: "art. 177",
  /** Défauts cachés, après le délai de dénonciation */
  defautsCaches: "art. 179",
  /** Prescription : cinq ans dès la réception */
  prescription: "art. 180",
  /** Sûreté fournie par l'entrepreneur pour la durée du délai de dénonciation */
  surete: "art. 181",
} as const;

export type RenvoiSIA118 = keyof typeof SIA118;

/** « SIA 118, art. 160 » */
export const sia = (cle: RenvoiSIA118) => `SIA 118, ${SIA118[cle]}`;

/** Mention portée au bas de chaque document qui renvoie à la norme */
export const MENTION_SIA = `Les renvois se rapportent à la ${NORME}, ${EDITION} ; l'édition applicable au contrat et ses dérogations font foi.`;

/** Règlements SIA concernant les prestations et honoraires, selon le métier du mandataire */
export const REGLEMENTS_MANDAT = ["SIA 102 (architectes)", "SIA 103 (ingénieurs civils)", "SIA 105 (architectes paysagistes)", "SIA 108 (ingénieurs mécaniciens, électriciens et CVC)", "SIA 112 (modèle : étude et conduite de projet)"] as const;

/** Lecture SIA du résultat d'une réception enregistrée dans PRISM */
export const RESULTAT_RECEPTION = {
  "Acceptée": { libelle: "Ouvrage reçu, sans défaut", renvoi: "sansDefaut" },
  "Acceptée avec réserves": { libelle: "Ouvrage reçu, défauts mineurs à éliminer", renvoi: "defautsMineurs" },
  "Refusée": { libelle: "Réception différée, défauts majeurs", renvoi: "defautsMajeurs" },
} as const satisfies Record<string, { libelle: string; renvoi: RenvoiSIA118 }>;
