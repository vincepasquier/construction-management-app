// Contrat d'un système source de projets (Data Platform, Dynamics 365). L'application ne connaît
// que cette interface : la source simulée d'aujourd'hui se remplace par le vrai connecteur sans
// toucher aux écrans.
export interface FactureSourceBrute {
  numero: string;
  fournisseur: string;
  commande?: string;
  date: string;
  echeance?: string;
  montantHT: number;
  statut: "Reçue" | "Validée" | "Payée" | "Bloquée";
}

export interface ProjetSource {
  numero: string;
  nom: string;
  description: string;
  /** Code de la direction responsable */
  direction: string;
  /** Identifiant du type de projet PRISM correspondant */
  typeProjet: string;
  responsable: string;
  statut: string;
  dateDebut: string;
  dateFin: string;
  compteAnalytique: string;
  /** Numéro du projet parent pour un sous-projet */
  parent?: string;
  budgetInitial: number;
  budgetApprouve: number;
  engage: number;
  realise: number;
  paye: number;
  atterrissage?: number;
  parAnnee: Record<string, { budget: number; realise: number }>;
  factures: FactureSourceBrute[];
}

export interface SourceProjets {
  id: string;
  nom: string;
  /** Vrai tant que la source est un simulateur : les écrans l'affichent */
  simulee: boolean;
  /** Projets connus de la source (numéro, nom, direction, parent) */
  lister(): Promise<Pick<ProjetSource, "numero" | "nom" | "direction" | "parent" | "statut">[]>;
  /** État d'un projet à une date donnée ; `undefined` si le numéro est inconnu */
  lire(numero: string, date: string): Promise<ProjetSource | undefined>;
}
