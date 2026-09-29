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
  | "11 Énoncé des besoins"
  | "21 Définition du projet"
  | "22 Procédure de choix de mandataires"
  | "31 Avant-projet"
  | "32 Projet de l'ouvrage"
  | "33 Procédure de demande d'autorisation"
  | "41 Appels d'offres"
  | "51 Projet d'exécution"
  | "52 Exécution de l'ouvrage"
  | "53 Mise en service, achèvement"
  | "61 Exploitation";

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
  /** Phase SIA 112 dans laquelle se trouve le lot */
  phase?: PhaseSIA;
  /** Dates prévues ou réelles de chaque phase du lot (frise des phases) */
  datesPhases?: Partial<Record<PhaseSIA, { debut?: string; fin?: string }>>;
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
  /** Texte descriptif complet (import CRBX) */
  texte?: string;
  /** Quantités par subdivision (« élévations » SIA 451 : PG, EA, EB…) */
  quantitesParElevation?: Record<string, number>;
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
  /** Offre importée d'un fichier CRBX : total annoncé par l'entreprise et contrôles */
  fichier?: string;
  totalDeclare?: number;
  ecarts?: { cle: string; type: string; detail: string }[];
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
  /** Descriptif importé d'un fichier CRBX */
  source?: { fichier: string; date?: string; logiciel?: string; projet?: string };
  chapitres?: Record<string, string>;
  elevations?: Record<string, string>;
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
  acces?: AccesPersonne;
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

// ---------------------------------------------------------------------------
// Organigramme
// ---------------------------------------------------------------------------

export type TypeNoeud =
  | "Maître d'ouvrage"
  | "Direction de projet"
  | "Direction des travaux"
  | "Lot"
  | "Mandataire"
  | "Entreprise"
  | "Commission"
  | "Autre";

export interface NoeudOrganigramme {
  id: ID;
  projetId: ID;
  parentId?: ID;
  type: TypeNoeud;
  /** Fonction affichée, ex. « Direction de projet » ou « Lot L1 – Génie civil » */
  titre: string;
  /** Membre de l'équipe occupant la fonction */
  personneId?: ID;
  /** Entreprise ou mandataire (pour les intervenants externes) */
  entrepriseId?: ID;
  /** Nom libre si la personne n'est pas dans l'équipe */
  nomLibre?: string;
  ordre: number;
}

// ---------------------------------------------------------------------------
// Circuits de validation
// ---------------------------------------------------------------------------

export type DecisionValidation = "Approuvé" | "Refusé" | "Modifications demandées";
export type StatutEtape = "En attente" | DecisionValidation;
export type StatutCircuit = "En cours" | "Approuvé" | "Refusé" | "À corriger" | "Annulé";
export type TypeObjetValidation = "Document" | "Facture" | "Avenant" | "Autre";

export interface EtapeValidation {
  id: ID;
  personneId: ID;
  statut: StatutEtape;
  date?: string;
  commentaire?: string;
}

export interface EvenementValidation {
  date: string;
  personneId: ID;
  action: string;
  version: number;
  commentaire?: string;
}

export interface CircuitValidation {
  id: ID;
  projetId: ID;
  titre: string;
  objet: { type: TypeObjetValidation; id?: ID; contratId?: ID };
  url?: string;
  version: number;
  demandeurId: ID;
  etapes: EtapeValidation[];
  statut: StatutCircuit;
  dateCreation: string;
  echeance?: string;
  historique: EvenementValidation[];
}

// ---------------------------------------------------------------------------
// Risques
// ---------------------------------------------------------------------------

export type CategorieRisque = "Technique" | "Financier" | "Délais" | "Juridique" | "Environnement" | "Sécurité" | "Organisation" | "Tiers";
export type StatutRisque = "Ouvert" | "En traitement" | "Survenu" | "Clos";

export interface Risque {
  id: ID;
  projetId: ID;
  code: string;
  titre: string;
  description: string;
  categorie: CategorieRisque;
  /** 1 (rare) à 5 (quasi certain) */
  probabilite: number;
  /** 1 (négligeable) à 5 (majeur) */
  impact: number;
  /** Conséquence financière estimée si le risque survient (CHF HT) */
  impactFinancier: number;
  proprietaireId?: ID;
  statut: StatutRisque;
  mesures: string;
  echeance?: string;
  lotId?: ID;
  dateIdentification: string;
}

// ---------------------------------------------------------------------------
// Tâches attribuées (actions)
// ---------------------------------------------------------------------------

export type StatutAction = "À faire" | "En cours" | "En attente" | "Terminé";
export type PrioriteAction = "Basse" | "Normale" | "Haute" | "Urgente";

export interface Action {
  id: ID;
  projetId: ID;
  titre: string;
  description?: string;
  assigneId?: ID;
  creeParId?: ID;
  echeance?: string;
  priorite: PrioriteAction;
  statut: StatutAction;
  /** Provenance : séance de chantier, risque, validation… */
  origine?: string;
  risqueId?: ID;
  lotId?: ID;
  dateCreation: string;
}

// ---------------------------------------------------------------------------
// Gestion des accès
// ---------------------------------------------------------------------------

export type ModuleApp =
  | "portefeuille" | "finances" | "appelsOffres" | "contrats" | "planning" | "taches" | "risques"
  | "validations" | "documents" | "juridique" | "organigramme" | "ressources" | "entreprises" | "parametres" | "acces" | "ia";

export type NiveauAcces = "aucun" | "lecture" | "ecriture";

export type ProfilAcces = "Administrateur" | "Directeur de projet" | "Responsable de lot" | "Collaborateur" | "Lecture seule" | "Externe";

export interface AccesPersonne {
  profil: ProfilAcces;
  /** Projets accessibles ; « tous » pour l'ensemble du portefeuille */
  projets: ID[] | "tous";
  /** Dérogations au profil, module par module */
  modules: Partial<Record<ModuleApp, NiveauAcces>>;
}

// ---------------------------------------------------------------------------
// Autorisations et foncier
// ---------------------------------------------------------------------------

export type TypeAutorisation =
  | "Permis de construire" | "Approbation des plans" | "Autorisation spéciale" | "Autorisation de défrichement"
  | "Permis de fouille" | "Autorisation de police (circulation)" | "Autre";

export type StatutAutorisation =
  | "En préparation" | "Déposée" | "Mise à l'enquête" | "Oppositions en traitement" | "Délivrée" | "En recours" | "Refusée" | "Échue";

export type StatutCondition = "À traiter" | "En cours" | "Respectée" | "Levée";

export interface ConditionAutorisation {
  id: ID;
  /** Service ou autorité émettant le préavis / la charge */
  service: string;
  texte: string;
  /** Phase ou échéance à laquelle la condition doit être remplie */
  echeance?: string;
  responsableId?: ID;
  statut: StatutCondition;
}

export interface Autorisation {
  id: ID;
  projetId: ID;
  type: TypeAutorisation;
  objet: string;
  autorite: string;
  reference?: string;
  statut: StatutAutorisation;
  dateDepot?: string;
  dateEnquete?: string;
  oppositions: number;
  dateDecision?: string;
  /** Fin de validité (ex. début des travaux exigé avant cette date) */
  validite?: string;
  conditions: ConditionAutorisation[];
  url?: string;
  lotId?: ID;
}

export type TypeServitude =
  | "Servitude de passage" | "Servitude de conduite" | "Emprise temporaire" | "Acquisition de terrain"
  | "Droit de superficie" | "Autre";

export type StatutServitude =
  | "À négocier" | "En négociation" | "Accord de principe" | "Convention signée" | "Inscrite au registre foncier" | "Refus / expropriation";

export interface Servitude {
  id: ID;
  projetId: ID;
  parcelle: string;
  commune: string;
  proprietaire: string;
  contact?: string;
  type: TypeServitude;
  statut: StatutServitude;
  /** Surface ou longueur concernée, en texte libre (ex. « 120 m2 », « 45 m ») */
  emprise?: string;
  indemnite: number;
  echeance?: string;
  dateSignature?: string;
  remarque?: string;
  lotId?: ID;
}
