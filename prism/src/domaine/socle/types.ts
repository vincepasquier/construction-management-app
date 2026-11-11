// Types du socle groupe (PRISM) : référentiels, gouvernance, collaboration, traçabilité.
// Les types repris de Chantier+ (projet, lots, finances par position, marchés…) sont dans ../types.
import type { Confidentialite, ID, ModuleApp, PhaseSIA, RefObjet } from "../types";

// ---------------------------------------------------------------------------
// Référentiels
// ---------------------------------------------------------------------------

export interface Direction {
  id: ID;
  code: string;
  nom: string;
  responsableId?: ID;
}

export interface Portefeuille {
  id: ID;
  nom: string;
  description?: string;
  responsableId?: ID;
}

export interface Programme {
  id: ID;
  nom: string;
  portefeuilleId?: ID;
  description?: string;
}

/** Source des chiffres financiers d'un projet */
export type ModeFinancier =
  /** Budget, réalisé et engagé viennent du système source ; atterrissage saisi et commenté */
  | "synthese"
  /** Calcul par position budgétaire (verticale construction) ; la source sert de contrôle */
  | "positions";

export interface ChampType {
  cle: string;
  libelle: string;
  type: "texte" | "nombre" | "date" | "liste";
  options?: string[];
}

export interface TypeProjet {
  id: ID;
  nom: string;
  description: string;
  modeFinancier: ModeFinancier;
  /** Modules actifs pour ce type de projet */
  modules: ModuleApp[];
  /** Phases de gouvernance, dans l'ordre */
  phases: string[];
  /** Champs obligatoires de la fiche projet : « * » pour toutes les phases, sinon par phase */
  champsObligatoires: Record<string, string[]>;
  /** Champs propres au type, affichés dans une section de la fiche projet */
  champs: ChampType[];
}

/** Phases de gouvernance du groupe, telles qu'elles figurent dans le mandat de projet */
export const PHASES_GROUPE = ["Définition des objectifs", "Études préliminaires", "Étude du projet", "Appel d'offres", "Réalisation", "Clôture"] as const;

/** Correspondance entre phase SIA 112 et phase de gouvernance du groupe */
export const PHASE_GROUPE_DE_SIA: Record<PhaseSIA, (typeof PHASES_GROUPE)[number]> = {
  "11 Énoncé des besoins": "Définition des objectifs",
  "21 Définition du projet": "Études préliminaires",
  "22 Procédure de choix de mandataires": "Études préliminaires",
  "31 Avant-projet": "Étude du projet",
  "32 Projet de l'ouvrage": "Étude du projet",
  "33 Procédure de demande d'autorisation": "Étude du projet",
  "41 Appels d'offres": "Appel d'offres",
  "51 Projet d'exécution": "Réalisation",
  "52 Exécution de l'ouvrage": "Réalisation",
  "53 Mise en service, achèvement": "Clôture",
  "61 Exploitation": "Clôture",
};

// ---------------------------------------------------------------------------
// Fiche projet
// ---------------------------------------------------------------------------

export type CanalNote = "Responsable de projet" | "PMO" | "Finance / ComInv";

/** Note de suivi d'un projet ; chaque canal a sa propre visibilité */
export interface NoteProjet {
  id: ID;
  projetId: ID;
  canal: CanalNote;
  texte: string;
  auteurId?: ID;
  date: string;
  modifieLe?: string;
}

export interface PartiePrenante {
  id: ID;
  projetId: ID;
  personneId?: ID;
  entrepriseId?: ID;
  /** Nom libre si la personne n'est ni dans l'équipe ni dans une entreprise */
  nom?: string;
  roleProjet: string;
  responsabilites?: string;
  interne: boolean;
  /** Attentes ou points d'attention */
  remarques?: string;
}

// ---------------------------------------------------------------------------
// Finances du socle
// ---------------------------------------------------------------------------

/** Lecture financière commune à tous les projets, quel que soit leur mode financier */
export interface ValeursSynthese {
  budgetInitial: number;
  budgetApprouve: number;
  engage: number;
  realise: number;
  paye: number;
  atterrissage: number;
  atterrissageDefavorable: number;
}

/** Valeurs brutes reçues du système source pour un projet (jamais modifiées dans PRISM) */
export interface ReleveSource {
  id: ID;
  projetId: ID;
  systeme: string;
  /** Date et heure de réception (ISO) */
  date: string;
  budgetInitial: number;
  budgetApprouve: number;
  engage: number;
  realise: number;
  paye: number;
  /** Atterrissage tenu dans la source, s'il existe */
  atterrissage?: number;
  /** Budget et réalisé par année civile */
  parAnnee: Record<string, { budget: number; realise: number }>;
  statut?: string;
  responsable?: string;
}

/** Atterrissage saisi et commenté par le responsable (projets sans calcul par position) */
export interface AtterrissageSaisi {
  id: ID;
  projetId: ID;
  date: string;
  montant: number;
  commentaire: string;
  auteurId?: ID;
}

/** Photo mensuelle de la synthèse financière : base de l'historique et des variations */
export interface PeriodeFinanciere {
  id: ID;
  projetId: ID;
  /** Mois, ex. « 2026-09 » */
  mois: string;
  date: string;
  valeurs: ValeursSynthese;
  /** Commentaire exigé lorsque la variation dépasse le seuil configuré */
  commentaire?: string;
  auteurId?: ID;
}

export interface LigneScenario {
  id: ID;
  libelle: string;
  montant: number;
  annee?: number;
  risqueId?: ID;
}

export interface ScenarioAtterrissage {
  id: ID;
  projetId: ID;
  nom: string;
  type: "Probable" | "Favorable" | "Défavorable" | "Autre";
  lignes: LigneScenario[];
  commentaire?: string;
  /** Scénario retenu pour le reporting */
  valide?: boolean;
}

/** Facture reçue du système source (Dynamics 365), en lecture seule */
export interface FactureSource {
  id: ID;
  projetId: ID;
  numero: string;
  fournisseur: string;
  commande?: string;
  date: string;
  echeance?: string;
  montantHT: number;
  statut: "Reçue" | "Validée" | "Payée" | "Bloquée";
  compteAnalytique?: string;
}

// ---------------------------------------------------------------------------
// Mandat de projet
// ---------------------------------------------------------------------------

export interface ObjectifMandat {
  id: ID;
  objectif: string;
  critere: string;
  approbateur: string;
}

export interface PhaseMandat {
  phase: string;
  applicable: boolean;
  debut?: string;
  fin?: string;
  livrables?: string;
}

export interface RessourceMandat {
  id: ID;
  provenance: string;
  joursHommes: number;
  confirmee: boolean;
}

export interface RisqueMandat {
  id: ID;
  risque: string;
  reponse: string;
}

/** Contenu du mandat, selon le modèle du groupe */
export interface ContenuMandat {
  nomProjet: string;
  auteur: string;
  portefeuille: string;
  commanditaire: string;
  chefProjet: string;
  client: string;
  autresParties: string;
  motifs: { croissance: boolean; efficience: boolean; maintenance: boolean; legal: boolean };
  contexte: string;
  benefices: string;
  objectifs: ObjectifMandat[];
  perimetre: string;
  exclusions: string;
  impactsEnvironnementaux: string;
  impactsSociaux: string;
  projetsConnexes: string;
  composanteIT: boolean;
  descriptionIT: string;
  dateArchiboard?: string;
  phases: PhaseMandat[];
  coutsTexte: string;
  budget: number;
  centreCout: string;
  ressources: RessourceMandat[];
  risques: RisqueMandat[];
  preavisComInv: boolean;
  annexes: string;
}

export type RoleSignataire = "Commanditaire" | "Client" | "Chef de projet";

export interface SignatureMandat {
  role: RoleSignataire;
  personneId?: ID;
  nom?: string;
  /** Date de signature ; vide tant que la signature est attendue */
  date?: string;
  relances?: string[];
}

export type StatutMandat = "Brouillon" | "Soumis" | "Signé" | "Refusé" | "Remplacé";

export interface Mandat {
  id: ID;
  projetId: ID;
  version: number;
  statut: StatutMandat;
  contenu: ContenuMandat;
  signatures: SignatureMandat[];
  dateCreation: string;
  auteurId?: ID;
  dateSoumission?: string;
  /** Décision de démarrage */
  decision?: "Autorisé" | "Refusé" | "Complément demandé";
  /** Empreinte du contenu figé à la signature */
  empreinte?: string;
}

// ---------------------------------------------------------------------------
// Rapports et passages de phase
// ---------------------------------------------------------------------------

export interface SectionRapport {
  cle: string;
  titre: string;
  texte: string;
}

export type StatutRapport = "Brouillon" | "En revue" | "Validé" | "Refusé";

export interface Rapport {
  id: ID;
  projetId: ID;
  type: "Phase" | "Clôture";
  phase?: string;
  titre: string;
  version: number;
  statut: StatutRapport;
  sections: SectionRapport[];
  /** Indicateurs du projet figés à la soumission */
  indicateurs?: Record<string, number | string>;
  /** Rapport déposé sous forme de document existant plutôt que rédigé dans l'application */
  documentUrl?: string;
  documentNom?: string;
  decision?: string;
  auteurId?: ID;
  date: string;
  validationId?: ID;
}

export type StatutCondition = "À traiter" | "En cours" | "Remplie" | "Levée";

/** Condition ou réserve attachée à une décision, suivie jusqu'à sa levée */
export interface ConditionSuivie {
  id: ID;
  texte: string;
  responsableId?: ID;
  echeance?: string;
  statut: StatutCondition;
}

export interface DecisionPhase {
  id: ID;
  projetId: ID;
  dePhase: string;
  versPhase: string;
  date: string;
  decision: "Accordé" | "Accordé avec réserves" | "Refusé" | "Reporté";
  organe: string;
  conditions: ConditionSuivie[];
  commentaire?: string;
  auteurId?: ID;
  rapportId?: ID;
}

/** Appréciation qualitative motivée d'un responsable autorisé (jamais calculée) */
export interface Appreciation {
  id: ID;
  projetId: ID;
  auteurId?: ID;
  date: string;
  niveau: "Exemplaire" | "Conforme" | "À améliorer" | "Insuffisant";
  texte: string;
}

// ---------------------------------------------------------------------------
// Séances et décisions (ComInv, comités, séances de chantier)
// ---------------------------------------------------------------------------

export type TypeSeance = "ComInv" | "Comité de pilotage" | "Chantier" | "Autre";
export type NaturePoint = "Information" | "Décision" | "Tâche" | "Note de travail";

export interface PointSeance {
  id: ID;
  /** Numéro stable du point, conservé d'une séance à l'autre (ex. « 12.3 ») */
  numero: string;
  /** Projet concerné, pour les séances qui traitent plusieurs projets (ComInv) */
  projetId?: ID;
  titre: string;
  texte: string;
  nature: NaturePoint;
  responsableId?: ID;
  /** Nom libre du responsable s'il n'est pas dans l'équipe (entreprise, mandataire) */
  responsableNom?: string;
  echeance?: string;
  statut: "Ouvert" | "Clos";
  actionId?: ID;
  decisionId?: ID;
  /** Pour un point de nature « Décision » : ce qui sera porté au registre des décisions */
  decision?: { statut: Decision["statut"]; montant?: number; restreint?: boolean; conditions: ConditionSuivie[] };
  /** Séance où le point a été ouvert (il garde son numéro tant qu'il reste ouvert) */
  origineSeanceId?: ID;
}

export interface ParticipantSeance {
  personneId?: ID;
  nom?: string;
  organisation?: string;
  presence: "Présent" | "Excusé" | "Absent";
  diffusion: boolean;
}

export interface Seance {
  id: ID;
  type: TypeSeance;
  /** Projet de la séance ; vide pour une séance transverse (ComInv) */
  projetId?: ID;
  numero: number;
  titre: string;
  date: string;
  lieu?: string;
  participants: ParticipantSeance[];
  points: PointSeance[];
  statut: "Planifiée" | "Tenue" | "Diffusée";
  redacteurId?: ID;
  prochaineSeance?: string;
  /** Séance précédente dont les points ouverts ont été repris */
  seancePrecedenteId?: ID;
}

export type OrganeDecision = "ComInv" | "Comité de pilotage" | "Direction générale" | "Conseil d'administration" | "Autre";

export interface Decision {
  id: ID;
  projetId: ID;
  seanceId?: ID;
  organe: OrganeDecision;
  date: string;
  objet: string;
  texte: string;
  montant?: number;
  /** Une note de travail n'engage pas ; seule une décision approuvée fait foi */
  statut: "Note de travail" | "Approuvée" | "Refusée" | "Reportée";
  conditions: ConditionSuivie[];
  responsableId?: ID;
  /** Décision sensible : visible seulement des profils habilités */
  restreint?: boolean;
}

// ---------------------------------------------------------------------------
// Planification des ressources
// ---------------------------------------------------------------------------

/** Demande de capacité d'un projet, en jours-hommes */
export interface EstimationCharge {
  id: ID;
  projetId: ID;
  phase?: string;
  directionId?: ID;
  competence?: string;
  annee: number;
  joursHommes: number;
  commentaire?: string;
}

/** Potentiel théorique disponible d'une direction */
export interface Capacite {
  id: ID;
  directionId: ID;
  competence?: string;
  annee: number;
  joursHommes: number;
}

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------

export interface Commentaire {
  id: ID;
  projetId?: ID;
  cible: RefObjet;
  texte: string;
  auteurId?: ID;
  date: string;
  modifieLe?: string;
  /** Personnes mentionnées (@nom) */
  mentions: ID[];
  /** Versions précédentes du texte */
  historique?: { date: string; texte: string }[];
}

export type CanalNotification = "Application" | "Teams (simulé)" | "Courriel (simulé)";

export interface Notification {
  id: ID;
  destinataireId: ID;
  date: string;
  type: "Mention" | "Validation" | "Tâche" | "Signature" | "Échéance" | "Partage" | "Information";
  titre: string;
  texte?: string;
  /** Chemin dans l'application */
  lien?: string;
  projetId?: ID;
  lu: boolean;
  canal: CanalNotification;
}

export interface Delegation {
  id: ID;
  deId: ID;
  aId: ID;
  debut: string;
  fin: string;
  motif?: string;
}

/** Demande d'accès à un projet, validée par son responsable */
export interface DemandePartage {
  id: ID;
  projetId: ID;
  personneId: ID;
  demandeurId?: ID;
  date: string;
  motif: string;
  statut: "Demandé" | "Accordé" | "Refusé";
  decideParId?: ID;
  dateDecision?: string;
}

export interface VueEnregistree {
  id: ID;
  proprietaireId?: ID;
  /** Tableau ou écran concerné (ex. « portefeuille », « recherche ») */
  table: string;
  nom: string;
  definition: Record<string, unknown>;
  partagee: boolean;
}

// ---------------------------------------------------------------------------
// Traçabilité, connecteurs, archives, configuration
// ---------------------------------------------------------------------------

export interface ExecutionSynchro {
  id: ID;
  connecteur: string;
  date: string;
  dureeMs: number;
  lus: number;
  crees: number;
  modifies: number;
  erreurs: string[];
  statut: "Réussie" | "Partielle" | "En erreur";
  declencheePar?: ID;
}

export interface ArchiveRegistre {
  id: ID;
  projetId: ID;
  code: string;
  nom: string;
  date: string;
  auteurId?: ID;
  /** Empreinte SHA-256 du contenu de l'archive */
  empreinte: string;
  taille: number;
  /** Nombre d'enregistrements par collection */
  manifeste: Record<string, number>;
  /** Identifiant du fichier d'archive dans le magasin de fichiers */
  fichierId: ID;
  dernierControle?: { date: string; conforme: boolean };
}

export interface CritereCompletude {
  id: ID;
  libelle: string;
  axe: "Documentaire" | "Qualité des données";
  poids: number;
  /** Règle évaluée (voir domaine/socle/completude) */
  regle: string;
  actif: boolean;
}

export interface ModeleCircuit {
  id: ID;
  nom: string;
  typeObjet: string;
  mode: "sequentiel" | "parallele";
  /** Profils ou rôles des valideurs, dans l'ordre */
  roles: string[];
  /** Le circuit s'applique à partir de ce montant (seuil de compétence) */
  seuilMin?: number;
}

/** Paramétrage fonctionnel, versionné : toute publication crée une version que l'on peut rétablir */
export interface Configuration {
  id: ID;
  version: number;
  date: string;
  auteurId?: ID;
  commentaire?: string;
  /** Variation d'atterrissage (en %) au-delà de laquelle un commentaire est exigé */
  seuilVariationPct: number;
  /** Seuils de criticité de la matrice des risques (score = probabilité × impact) */
  matriceRisques: { modere: number; eleve: number; critique: number };
  /** Écart budgétaire (en %) qui fait passer la santé d'un projet à « à surveiller » puis « critique » */
  seuilsSante: { surveiller: number; critique: number };
  criteresCompletude: CritereCompletude[];
  circuits: ModeleCircuit[];
  /** Jours sans revue au-delà desquels un risque est signalé */
  joursRevueRisque: number;
  /** Durée de conservation des projets archivés, en années */
  conservationAnnees: number;
  competences: string[];
  classifications: string[];
}

export const CONFIDENTIALITES: Confidentialite[] = ["Public", "Interne", "Confidentiel", "Strictement confidentiel"];
