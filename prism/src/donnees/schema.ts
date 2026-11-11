// Collections de la base PRISM. Chaque collection est rattachée à un module (droits) et, le plus
// souvent, à un projet. Cette table sert au dépôt, au journal d'audit, à la recherche et aux archives.
import type {
  Action, Affectation, Ajustement, AppelOffres, Autorisation, BudgetLigne, CircuitValidation, Cloture, Contrat, DocumentProjet,
  Entreprise, Facture, FactureHorsCommande, ID, Lot, ModuleApp, Mutation, NoeudOrganigramme, OffreAttendue, Personne, Projet,
  Risque, Servitude, Tache,
} from "../domaine/types";
import type {
  Appreciation, ArchiveRegistre, AtterrissageSaisi, Capacite, Commentaire, Configuration, Decision, DecisionPhase, Delegation,
  DemandePartage, Direction, EstimationCharge, ExecutionSynchro, FactureSource, Mandat, NoteProjet, Notification, PartiePrenante,
  PeriodeFinanciere, Portefeuille, Programme, Rapport, ReleveSource, ScenarioAtterrissage, Seance, TypeProjet, VueEnregistree,
} from "../domaine/socle/types";
import type { Constat, EntreeJournalChantier, Metre, Reception, Regie, Reserve } from "../domaine/types-chantier";

export interface Collections {
  // Repris de Chantier+
  projets: Projet;
  lots: Lot;
  budget: BudgetLigne;
  entreprises: Entreprise;
  appelsOffres: AppelOffres;
  contrats: Contrat;
  factures: Facture;
  taches: Tache;
  documents: DocumentProjet;
  personnes: Personne;
  affectations: Affectation;
  organigramme: NoeudOrganigramme;
  validations: CircuitValidation;
  risques: Risque;
  actions: Action;
  autorisations: Autorisation;
  servitudes: Servitude;
  mutations: Mutation;
  offres: OffreAttendue;
  ajustements: Ajustement;
  facturesHorsCommande: FactureHorsCommande;
  clotures: Cloture;
  // Socle groupe
  directions: Direction;
  portefeuilles: Portefeuille;
  programmes: Programme;
  typesProjet: TypeProjet;
  notes: NoteProjet;
  partiesPrenantes: PartiePrenante;
  relevesSource: ReleveSource;
  atterrissagesSaisis: AtterrissageSaisi;
  periodesFinancieres: PeriodeFinanciere;
  scenarios: ScenarioAtterrissage;
  facturesSource: FactureSource;
  mandats: Mandat;
  rapports: Rapport;
  decisionsPhase: DecisionPhase;
  appreciations: Appreciation;
  seances: Seance;
  decisions: Decision;
  estimationsCharge: EstimationCharge;
  capacites: Capacite;
  commentaires: Commentaire;
  notifications: Notification;
  delegations: Delegation;
  demandesPartage: DemandePartage;
  vues: VueEnregistree;
  executionsSynchro: ExecutionSynchro;
  archives: ArchiveRegistre;
  configurations: Configuration;
  // Suivi de chantier
  reserves: Reserve;
  receptions: Reception;
  journalChantier: EntreeJournalChantier;
  regies: Regie;
  constats: Constat;
  metres: Metre;
}

export type NomCollection = keyof Collections;
export type Doc<C extends NomCollection> = Collections[C];
export type DocQuelconque = { id: ID; projetId?: ID };

interface MetaCollection {
  /** Module dont dépendent les droits de lecture et d'écriture */
  module: ModuleApp;
  /** Libellé au singulier, affiché dans le journal et la recherche */
  libelle: string;
  /** Les enregistrements portent un `projetId` */
  parProjet: boolean;
  /** Suppression et modifications sensibles : un motif est exigé */
  sensible?: boolean;
  /** Donnée personnelle de l'utilisateur : chacun gère les siennes, sans droit de module */
  personnelle?: boolean;
}

const m = (module: ModuleApp, libelle: string, parProjet = true, extra: Partial<MetaCollection> = {}): MetaCollection =>
  ({ module, libelle, parProjet, ...extra });

export const META: Record<NomCollection, MetaCollection> = {
  projets: m("portefeuille", "Projet", false, { sensible: true }),
  lots: m("portefeuille", "Lot"),
  budget: m("finances", "Position budgétaire", true, { sensible: true }),
  entreprises: m("entreprises", "Entreprise", false),
  appelsOffres: m("appelsOffres", "Appel d'offres"),
  contrats: m("contrats", "Contrat", true, { sensible: true }),
  factures: m("contrats", "Facture", true, { sensible: true }),
  taches: m("planning", "Tâche du planning"),
  documents: m("documents", "Document"),
  personnes: m("acces", "Personne", false),
  affectations: m("ressources", "Affectation"),
  organigramme: m("organigramme", "Fonction de l'organigramme"),
  validations: m("validations", "Circuit de validation"),
  risques: m("risques", "Risque"),
  actions: m("taches", "Tâche"),
  autorisations: m("juridique", "Autorisation"),
  servitudes: m("juridique", "Droit foncier"),
  mutations: m("finances", "Mutation budgétaire", true, { sensible: true }),
  offres: m("finances", "Offre attendue"),
  ajustements: m("finances", "Estimation prévisionnelle"),
  facturesHorsCommande: m("finances", "Facture hors commande"),
  clotures: m("finances", "Clôture mensuelle", true, { sensible: true }),
  directions: m("parametres", "Direction", false),
  portefeuilles: m("parametres", "Portefeuille", false),
  programmes: m("parametres", "Programme", false),
  typesProjet: m("parametres", "Type de projet", false),
  notes: m("portefeuille", "Note de projet"),
  partiesPrenantes: m("organigramme", "Partie prenante"),
  relevesSource: m("finances", "Relevé du système source"),
  atterrissagesSaisis: m("finances", "Atterrissage saisi"),
  periodesFinancieres: m("finances", "Période financière", true, { sensible: true }),
  scenarios: m("finances", "Scénario d'atterrissage"),
  facturesSource: m("finances", "Facture du système source"),
  mandats: m("mandat", "Mandat de projet", true, { sensible: true }),
  rapports: m("rapports", "Rapport"),
  decisionsPhase: m("mandat", "Décision de passage de phase"),
  appreciations: m("rapports", "Appréciation"),
  seances: m("cominv", "Séance", false),
  decisions: m("cominv", "Décision", true, { sensible: true }),
  estimationsCharge: m("ressources", "Estimation de charge"),
  capacites: m("ressources", "Capacité", false),
  commentaires: m("portefeuille", "Commentaire", false, { personnelle: true }),
  notifications: m("portefeuille", "Notification", false, { personnelle: true }),
  delegations: m("validations", "Délégation", false, { personnelle: true }),
  demandesPartage: m("portefeuille", "Demande de partage", true, { personnelle: true }),
  vues: m("portefeuille", "Vue enregistrée", false, { personnelle: true }),
  executionsSynchro: m("parametres", "Synchronisation", false),
  archives: m("archives", "Archive", false),
  configurations: m("parametres", "Configuration", false),
  reserves: m("chantier", "Réserve"),
  receptions: m("chantier", "Réception"),
  journalChantier: m("chantier", "Journal de chantier"),
  regies: m("chantier", "Bon de régie"),
  constats: m("chantier", "Constat"),
  metres: m("chantier", "Métré"),
};

export const COLLECTIONS = Object.keys(META) as NomCollection[];

/** Les séances de chantier relèvent du module chantier, les autres de la gouvernance */
export function moduleDe(collection: NomCollection, doc?: unknown): ModuleApp {
  if (collection === "seances" && (doc as { type?: string } | undefined)?.type === "Chantier") return "chantier";
  return META[collection].module;
}

/** Désignation lisible d'un enregistrement, pour le journal et la recherche */
export function designation(collection: NomCollection, doc: unknown): string {
  const d = doc as Record<string, unknown>;
  const premier = (...cles: string[]) => cles.map((c) => d[c]).find((v) => typeof v === "string" && v) as string | undefined;
  const numero = premier("numero", "code");
  const texte = premier("nom", "titre", "objet", "libelle", "motif", "texte", "mois", "parcelle", "date");
  if (collection === "seances") return `${d.type ?? "Séance"} n° ${d.numero ?? "?"} – ${d.titre ?? d.date ?? ""}`.trim();
  if (collection === "mandats") return `Mandat v${d.version ?? 1}`;
  return [numero, texte].filter(Boolean).join(" · ") || META[collection].libelle;
}
