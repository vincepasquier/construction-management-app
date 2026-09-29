// Modèle de données de la plateforme.
// Tous les montants sont en CHF hors taxes (HT) sauf mention contraire.

export type ID = string;

export type Role =
  | "Directeur de projet"
  | "Responsable de lot"
  | "Conducteur de travaux"
  | "Ingénieur"
  | "Architecte"
  | "Assistant(e) de projet"
  | "Maître d'ouvrage";

export type PhaseSIA =
  | "31 Avant-projet"
  | "32 Projet de l'ouvrage"
  | "33 Procédure de demande d'autorisation"
  | "41 Appels d'offres"
  | "51 Projet d'exécution"
  | "52 Exécution de l'ouvrage"
  | "53 Mise en service, achèvement";

export interface Projet {
  id: ID;
  code: string;
  nom: string;
  maitreOuvrage: string;
  lieu: string;
  phase: PhaseSIA;
  dateDebut: string;
  dateFin: string;
  tauxTVA: number;
  couleur: string;
  description: string;
  directeurId?: ID;
  /** Dossier SharePoint associé (chemin relatif dans la bibliothèque configurée) */
  dossierSharePoint?: string;
}

export interface Lot {
  id: ID;
  projetId: ID;
  code: string;
  nom: string;
  /** Codes CFC couverts par le lot (préfixes acceptés, ex. "21" couvre 211, 212…) */
  cfc: string[];
  responsableId?: ID;
}

export interface BudgetLigne {
  id: ID;
  projetId: ID;
  cfc: string;
  libelle: string;
  montant: number;
  notes?: string;
}

export interface Entreprise {
  id: ID;
  nom: string;
  localite: string;
  contact: string;
  email: string;
  telephone: string;
  ide?: string;
  specialites: string[];
}

export type ProcedureAO = "Ouverte" | "Sélective" | "Sur invitation" | "Gré à gré";
export type StatutAO = "Préparation" | "Publié" | "Ouverture des offres" | "Évaluation" | "Adjugé" | "Annulé";

export interface PositionCAN {
  id: ID;
  /** Chapitre CAN, ex. "211" */
  chapitre: string;
  /** Numéro de position, ex. "211.112.101" */
  numero: string;
  libelle: string;
  unite: string;
  quantite: number;
}

export interface Critere {
  id: ID;
  nom: string;
  /** Pondération en % (la somme des critères doit faire 100) */
  poids: number;
  /** Le critère prix est noté automatiquement */
  estPrix?: boolean;
}

export interface Soumission {
  id: ID;
  entrepriseId: ID;
  dateReception: string;
  prixUnitaires: Record<ID, number>;
  rabaisPct: number;
  escomptePct: number;
  /** Notes 0–5 pour les critères hors prix */
  notes: Record<ID, number>;
  remarques?: string;
}

export interface AppelOffres {
  id: ID;
  projetId: ID;
  numero: string;
  objet: string;
  cfc: string;
  lotId?: ID;
  procedure: ProcedureAO;
  statut: StatutAO;
  dateEnvoi: string;
  dateRetour: string;
  montantEstime: number;
  positions: PositionCAN[];
  criteres: Critere[];
  soumissions: Soumission[];
  entreprisesInvitees: ID[];
  adjudicataireId?: ID;
}

export type StatutAvenant = "Demandé" | "Approuvé" | "Refusé";

export interface Avenant {
  id: ID;
  numero: string;
  date: string;
  objet: string;
  montant: number;
  statut: StatutAvenant;
}

export type TypeContrat = "Contrat d'entreprise" | "Mandat" | "Fourniture";
export type StatutContrat = "En préparation" | "Signé" | "En cours" | "Réceptionné" | "Clôturé";

export interface Contrat {
  id: ID;
  projetId: ID;
  numero: string;
  entrepriseId: ID;
  cfc: string;
  lotId?: ID;
  appelOffresId?: ID;
  objet: string;
  type: TypeContrat;
  montantInitial: number;
  dateSignature: string;
  /** Retenue de garantie en % sur les acomptes (SIA 118 : 10 % par défaut) */
  retenuePct: number;
  statut: StatutContrat;
  avenants: Avenant[];
}

export type TypeFacture = "Acompte" | "Situation" | "Régie" | "Décompte final";
export type StatutFacture = "Reçue" | "Contrôlée" | "Approuvée" | "Payée" | "Contestée";

export interface Facture {
  id: ID;
  projetId: ID;
  contratId: ID;
  numero: string;
  type: TypeFacture;
  date: string;
  echeance: string;
  montantHT: number;
  statut: StatutFacture;
}

export interface Tache {
  id: ID;
  projetId: ID;
  nom: string;
  lotId?: ID;
  debut: string;
  fin: string;
  avancement: number;
  jalon: boolean;
  dependances: ID[];
  responsableId?: ID;
}

export type CategorieDocument = "Plans" | "Contrats" | "PV de séance" | "Soumissions" | "Factures" | "Autorisations" | "Rapports" | "Autre";

export interface DocumentProjet {
  id: ID;
  projetId: ID;
  nom: string;
  categorie: CategorieDocument;
  version: string;
  date: string;
  url?: string;
  source: "SharePoint" | "Lien";
  auteur?: string;
  cfc?: string;
  sharePointId?: string;
}

export interface Personne {
  id: ID;
  nom: string;
  role: Role;
  email: string;
  organisation: string;
  /** Capacité en % d'un plein temps */
  capacite: number;
}

export interface Affectation {
  id: ID;
  personneId: ID;
  projetId: ID;
  pourcentage: number;
  debut: string;
  fin: string;
}

export interface ParametresSharePoint {
  clientId: string;
  tenantId: string;
  /** ex. "contoso.sharepoint.com" */
  hostname: string;
  /** ex. "/sites/Projets" */
  sitePath: string;
  /** Dossier racine dans la bibliothèque "Documents" */
  dossierRacine: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
