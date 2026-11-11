// Fiche d'un projet du portefeuille de démonstration : tout ce qui est propre au projet, sous une
// forme compacte. La fabrique en tire les enregistrements de chaque écran. Les durées sont en jours
// par rapport au jour du chargement (négatif : passé), pour que chaque projet garde son stade.
import type { CanalNote, ContenuMandat, PointSeance } from "../../../domaine/socle/types";
import type { Action, CategorieDocument, CategorieRisque, ConditionsContrat, PhaseSIA, Projet, Risque, StatutAutorisation, StatutServitude, TypeAjustement, TypeAutorisation, TypeContrat, TypeServitude } from "../../../domaine/types";
import type { Constat, LigneRegie, Reception, Regie, Reserve } from "../../../domaine/types-chantier";

export type LigneRisque = [titre: string, categorie: CategorieRisque, probabilite: number, impact: number, impactFinancier: number, description: string, mesures: string, strategie?: Risque["strategie"]];
/** Jalon : nom, date actuelle (jours), glissement par rapport à la référence */
export type LigneJalon = [nom: string, dans: number, glissement?: number];
export type LigneTache = [nom: string, debut: number, fin: number, avancement: number, lot?: string];
export type LigneAction = [titre: string, dans: number, priorite: Action["priorite"], statut?: Action["statut"], assigne?: string];
export type LigneDocument = [nom: string, categorie: CategorieDocument, version: string, ilYA: number];
export interface LignePoint { titre: string; texte: string; nature?: PointSeance["nature"]; clos?: boolean; dans?: number; responsable?: string; responsableNom?: string; montant?: number; statut?: "Approuvée" | "Reportée" | "Refusée"; condition?: string }
export interface SeanceFiche { ilYA: number; lieu: string; invites?: [nom: string, organisation: string][]; points: LignePoint[] }

export type EtatMarche = "Préparation" | "Publié" | "Évaluation" | "Adjugé" | "Signé" | "En cours" | "Réceptionné" | "Clôturé";

export interface Marche {
  cle: string;
  objet: string;
  cfc: string;
  lot?: string;
  type: TypeContrat;
  /** Titulaire, ou entreprise pressentie tant que le marché n'est pas adjugé */
  entreprise: string;
  etat: EtatMarche;
  /** Montant du contrat hors TVA ; calculé à partir des positions quand elles sont données */
  montant?: number;
  estime?: number;
  /** Offres concurrentes : entreprise et écart de prix en % par rapport au titulaire */
  concurrents?: [entreprise: string, ecartPct: number][];
  procedure?: "Ouverte" | "Sélective" | "Sur invitation" | "Gré à gré";
  /** Descriptif : positions avec les prix du titulaire */
  positions?: [numero: string, libelle: string, unite: string, quantite: number, prixUnitaire: number][];
  /** Dates en jours : signature (ou retour des offres s'il n'est pas signé), début et fin des prestations */
  signe: number;
  debut: number;
  fin: number;
  /** Part du contrat déjà facturée, de 0 à 1 */
  facture?: number;
  avenants?: [objet: string, montant: number, statut: "Demandé" | "Approuvé" | "Refusé", motif: string, ilYA: number, delaiJours?: number][];
  conditions?: Partial<ConditionsContrat>;
  /** Relevés de métré tirés des positions, au prorata de la facturation */
  metres?: boolean;
  regies?: [objet: string, ilYA: number, statut: Regie["statut"], lignes: [type: LigneRegie["type"], libelle: string, quantite: number, unite: string, prixUnitaire: number][], remarques?: string][];
  reserves?: [libelle: string, localisation: string, gravite: Reserve["gravite"], statut: Reserve["statut"], delaiDans: number, description?: string][];
  reception?: { objet: string; ilYA: number; type: Reception["type"]; resultat: Reception["resultat"]; lieu: string; participants: string; documents?: string; surete?: string; remarques?: string; secondeDans?: number };
}

export interface FicheChantier {
  conducteur: string;
  lieuSeance: string;
  /** Chantier terminé : nombre de jours écoulés depuis le dernier jour de travaux */
  finIlYA?: number;
  /** Entreprises sur place et leur effectif habituel */
  entreprises: [nom: string, effectif: number][];
  /** Travaux des derniers jours ouvrés, du plus ancien au plus récent */
  travaux: string[];
  evenements?: [jour: number, type: "Livraison" | "Visite" | "Incident" | "Sécurité" | "Arrêt" | "Autre", texte: string][];
  /** Deux séances de chantier : les points ouverts de la première sont repris dans la seconde */
  seances: [LignePoint[], LignePoint[]];
  invites: [nom: string, organisation: string][];
  constats: [type: Constat["type"], titre: string, description: string, localisation: string, entreprise: string | undefined, legende: string, ilYA: number, suite?: "reserve" | "tache"][];
  /** Réserves relevées en cours de chantier, hors réception */
  reserves?: [libelle: string, localisation: string, gravite: Reserve["gravite"], statut: Reserve["statut"], delaiDans: number, entreprise: string, description?: string][];
}

export interface FicheConstruction {
  lots: [code: string, nom: string, cfc: string[], responsable: string, phase: PhaseSIA][];
  budget: [cfc: string, libelle: string, montant: number][];
  marches: Marche[];
  mutations?: [motif: string, deCfc: string, versCfc: string, montant: number, statut: "Soumise" | "Validée", ilYA: number][];
  ajustements?: [type: TypeAjustement, libelle: string, montant: number, probabilite: number, cfc: string, justification: string][];
  horsCommande?: [fournisseur: string, montant: number, cfc: string, remarque: string, ilYA: number][];
  autorisations?: [type: TypeAutorisation, objet: string, autorite: string, reference: string, statut: StatutAutorisation, depotIlYA: number | undefined, decisionIlYA: number | undefined, oppositions: number, conditions: [service: string, texte: string, statut: "À traiter" | "En cours" | "Respectée" | "Levée", dans?: number][]][];
  servitudes?: [parcelle: string, commune: string, proprietaire: string, type: TypeServitude, statut: StatutServitude, indemnite: number, emprise: string, remarque?: string][];
  chantier?: FicheChantier;
}

export interface FicheProjet {
  numero: string;
  /** Clé courte, préfixe des identifiants du projet */
  cle: string;
  complements: Partial<Projet>;
  chef: string;
  equipe: [personne: string, pourcentage: number][];
  mandat: { contenu: Partial<ContenuMandat>; objectifs: [objectif: string, critere: string, approbateur: string][]; etat?: "Signé" | "En signature" | "Brouillon" };
  risques: LigneRisque[];
  planning: LigneTache[];
  jalons: LigneJalon[];
  actions: LigneAction[];
  documents: LigneDocument[];
  pilotage: SeanceFiche[];
  notes?: [canal: CanalNote, texte: string, auteur: string, ilYA: number][];
  construction?: FicheConstruction;
}
