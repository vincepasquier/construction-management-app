// Droits d'accès : un profil donne des niveaux par défaut à chaque module, que l'on peut
// ensuite ajuster membre par membre. L'accès aux projets est défini séparément.
//
// Important : dans cette version sans serveur de données, les droits pilotent l'interface
// (menus masqués, mode lecture seule). Une protection réelle nécessitera une base de données
// partagée avec authentification, où les mêmes règles seront appliquées côté serveur.
import type { AccesPersonne, ID, ModuleApp, NiveauAcces, Personne, ProfilAcces, Projet } from "../types";

export const MODULES: { id: ModuleApp; libelle: string; description: string }[] = [
  { id: "portefeuille", libelle: "Portefeuille & tableau de bord", description: "Vue d'ensemble des projets" },
  { id: "finances", libelle: "Finances", description: "Budget, mutations, engagements, prévisions" },
  { id: "appelsOffres", libelle: "Appels d'offres", description: "Descriptifs, offres, adjudications" },
  { id: "contrats", libelle: "Contrats & factures", description: "Contrats, avenants, factures" },
  { id: "planning", libelle: "Planning", description: "Diagramme de Gantt" },
  { id: "taches", libelle: "Tâches", description: "Actions attribuées aux membres" },
  { id: "risques", libelle: "Risques", description: "Registre et suivi des risques" },
  { id: "validations", libelle: "Validations", description: "Circuits de validation" },
  { id: "documents", libelle: "Documents", description: "Registre et SharePoint" },
  { id: "juridique", libelle: "Autorisations & foncier", description: "Permis, préavis, servitudes" },
  { id: "organigramme", libelle: "Organigramme", description: "Organisation du projet" },
  { id: "ressources", libelle: "Ressources", description: "Équipe, charge, lots" },
  { id: "entreprises", libelle: "Entreprises", description: "Carnet d'adresses" },
  { id: "ia", libelle: "Assistant IA", description: "Questions et imports par IA" },
  { id: "parametres", libelle: "Paramètres", description: "Intégrations, sauvegardes" },
  { id: "acces", libelle: "Gestion des accès", description: "Droits des membres" },
];

export const PROFILS: ProfilAcces[] = ["Administrateur", "Directeur de projet", "Responsable de lot", "Collaborateur", "Lecture seule", "Externe"];

export const DESCRIPTION_PROFIL: Record<ProfilAcces, string> = {
  "Administrateur": "Tous les droits, y compris la gestion des accès et les paramètres.",
  "Directeur de projet": "Pilote ses projets : modification de tous les modules métier.",
  "Responsable de lot": "Modifie les données de ses lots ; finances et contrats en lecture.",
  "Collaborateur": "Suit le projet, met à jour ses tâches, planning et documents.",
  "Lecture seule": "Consulte le projet sans rien modifier (ex. maître d'ouvrage).",
  "Externe": "Accès restreint : tâches, validations et documents qui le concernent.",
};

const E: NiveauAcces = "ecriture";
const L: NiveauAcces = "lecture";
const A: NiveauAcces = "aucun";

export const DROITS_PROFIL: Record<ProfilAcces, Record<ModuleApp, NiveauAcces>> = {
  "Administrateur": {
    portefeuille: E, finances: E, appelsOffres: E, contrats: E, planning: E, taches: E, risques: E, validations: E,
    documents: E, juridique: E, organigramme: E, ressources: E, entreprises: E, ia: E, parametres: E, acces: E,
  },
  "Directeur de projet": {
    portefeuille: E, finances: E, appelsOffres: E, contrats: E, planning: E, taches: E, risques: E, validations: E,
    documents: E, juridique: E, organigramme: E, ressources: E, entreprises: E, ia: E, parametres: L, acces: L,
  },
  "Responsable de lot": {
    portefeuille: L, finances: L, appelsOffres: E, contrats: L, planning: E, taches: E, risques: E, validations: E,
    documents: E, juridique: E, organigramme: L, ressources: L, entreprises: E, ia: E, parametres: A, acces: A,
  },
  "Collaborateur": {
    portefeuille: L, finances: L, appelsOffres: L, contrats: L, planning: E, taches: E, risques: L, validations: E,
    documents: E, juridique: L, organigramme: L, ressources: L, entreprises: L, ia: E, parametres: A, acces: A,
  },
  "Lecture seule": {
    portefeuille: L, finances: L, appelsOffres: L, contrats: L, planning: L, taches: L, risques: L, validations: L,
    documents: L, juridique: L, organigramme: L, ressources: L, entreprises: L, ia: A, parametres: A, acces: A,
  },
  "Externe": {
    portefeuille: A, finances: A, appelsOffres: A, contrats: A, planning: L, taches: E, risques: A, validations: E,
    documents: L, juridique: A, organigramme: L, ressources: A, entreprises: A, ia: A, parametres: A, acces: A,
  },
};

/** Profil par défaut déduit du rôle, pour les membres sans configuration explicite */
export function accesParDefaut(p: Personne): AccesPersonne {
  const profil: ProfilAcces =
    p.role === "Directeur de projet" ? "Directeur de projet"
      : p.role === "Responsable de lot" ? "Responsable de lot"
        : p.role === "Maître d'ouvrage" ? "Lecture seule"
          : "Collaborateur";
  return { profil, projets: "tous", modules: {} };
}

export function accesDe(p: Personne): AccesPersonne {
  return p.acces ?? accesParDefaut(p);
}

export function niveau(p: Personne | undefined, module: ModuleApp): NiveauAcces {
  // Sans utilisateur (premier lancement, données vidées), tout reste accessible
  if (!p) return "ecriture";
  const a = accesDe(p);
  return a.modules[module] ?? DROITS_PROFIL[a.profil][module];
}

export function projetsAccessibles<T extends Pick<Projet, "id">>(p: Personne | undefined, projets: T[]): T[] {
  if (!p) return projets;
  const a = accesDe(p);
  return a.projets === "tous" ? projets : projets.filter((x) => (a.projets as ID[]).includes(x.id));
}

export const LIBELLE_NIVEAU: Record<NiveauAcces, string> = { aucun: "Aucun", lecture: "Lecture", ecriture: "Modification" };
