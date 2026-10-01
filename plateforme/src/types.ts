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

/** Règle de calcul du reste à engager d'une position */
export type ModeResteAEngager =
  /** Règle du classeur : budget restant tant que rien n'est engagé ni prévu, puis soldée */
  | "auto"
  /** Budget révisé − engagé − attendu (jamais négatif) */
  | "budget"
  /** Plus rien à engager */
  | "solde"
  /** Montant estimé par le responsable */
  | "saisi";

/**
 * Position budgétaire. Montant = budget initial approuvé ; les évolutions passent par des mutations.
 * Structure : lot → position (groupe) → sous-position (libellé) → étape ; le code CFC est un attribut.
 */
export interface BudgetLigne {
  id: ID;
  projetId: ID;
  cfc: string;
  libelle: string;
  montant: number;
  notes?: string;
  lotId?: ID;
  /** Regroupement (« Position 0 » du classeur), ex. « Production de chaleur + CVS » */
  groupe?: string;
  /** Étape de réalisation, ex. « 1 » */
  etape?: string;
  /** Position de réserve (divers et imprévus) */
  reserve?: boolean;
  /** Identifiant d'origine (classeur Excel, ERP…) */
  refExterne?: string;
  raeMode?: ModeResteAEngager;
  raeMontant?: number;
  raeCommentaire?: string;
  /** Dernière revue du reste à engager par le responsable */
  dateRevue?: string;
}

/** Part d'un montant imputée à une position budgétaire */
export interface Repartition {
  budgetId: ID;
  montant: number;
}

export type StatutMutation = "Brouillon" | "Soumise" | "Validée" | "Refusée";

/** Transfert de budget entre positions : la somme des lignes est nulle (débits négatifs, crédits positifs) */
export interface Mutation {
  id: ID;
  projetId: ID;
  numero: string;
  motif: string;
  date: string;
  statut: StatutMutation;
  demandeurId?: ID;
  valideurId?: ID;
  dateValidation?: string;
  lignes: Repartition[];
  remarques?: string;
}

export type TypeOffreAttendue = "Offre ferme" | "Offre indicative" | "Estimation entreprise";
export type StatutOffreAttendue = "En cours" | "Reçue" | "Retenue" | "Commandée" | "Refusée" | "Expirée";

/** Offre reçue ou attendue, pas encore commandée : alimente l'« attendu » */
export interface OffreAttendue {
  id: ID;
  projetId: ID;
  numero: string;
  fournisseur: string;
  entrepriseId?: ID;
  description: string;
  date?: string;
  type: TypeOffreAttendue;
  statut: StatutOffreAttendue;
  montant: number;
  repartition: Repartition[];
  contratId?: ID;
  remarques?: string;
}

export type TypeAjustement = "Estimation interne" | "Plus-value attendue" | "Risque" | "Opportunité" | "Correction de commande";
export type StatutAjustement = "Active" | "Convertie" | "Abandonnée";

/** Estimation prévisionnelle qui ajuste l'atterrissage (montant positif ; une opportunité le réduit) */
export interface Ajustement {
  id: ID;
  projetId: ID;
  type: TypeAjustement;
  libelle: string;
  montant: number;
  /** Probabilité en % (100 par défaut) */
  probabilite: number;
  statut: StatutAjustement;
  repartition: Repartition[];
  auteurId?: ID;
  date: string;
  /** Date prévue d'engagement */
  echeance?: string;
  justification?: string;
  risqueId?: ID;
  contratId?: ID;
  dateRevue?: string;
}

/** Facture sans commande (import Power BI / ERP), affectée à une ou plusieurs positions */
export interface FactureHorsCommande {
  id: ID;
  projetId: ID;
  numero: string;
  numeroFournisseur?: string;
  fournisseur: string;
  date: string;
  montantHT: number;
  paye: boolean;
  repartition: Repartition[];
  remarques?: string;
}

export interface ValeursPosition {
  initial: number;
  revise: number;
  engage: number;
  attendu: number;
  rae: number;
  ajustements: number;
  atterrissage: number;
  facture: number;
  paye: number;
}

/** Photo mensuelle de l'état financier, non modifiable */
export interface Cloture {
  id: ID;
  projetId: ID;
  /** Mois clôturé, ex. « 2026-09 » */
  mois: string;
  date: string;
  auteurId?: ID;
  commentaire: string;
  positions: Record<ID, ValeursPosition>;
  totaux: ValeursPosition & { atterrissageDefavorable: number };
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
  /** Interlocuteurs (liste des parties prenantes) */
  contacts?: ContactEntreprise[];
  /** Autorité, commune, particulier… (par défaut : entreprise ou bureau) */
  categorie?: "Entreprise" | "Mandataire" | "Autorité" | "Particulier" | "Autre";
}

export interface ContactEntreprise {
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  remarques?: string;
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
export type StatutContrat = "En préparation" | "Signé" | "En cours" | "Réceptionné" | "Clôturé" | "Annulé";

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
  /** Répartition du montant initial sur les positions budgétaires (sinon : par code CFC) */
  repartition?: Repartition[];
  remarques?: string;
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
  fonction?: string;
  telephone?: string;
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
export type TypeObjetValidation = "Document" | "Facture" | "Avenant" | "Mutation" | "Autre";

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
