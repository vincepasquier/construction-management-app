// Droits d'accès : un profil donne un niveau par module, ajustable personne par personne.
// Le périmètre se définit par projet ou par direction, et il est borné par un niveau de confidentialité.
//
// Ces règles sont appliquées à trois endroits : le dépôt de données (toute écriture), la lecture
// (portefeuille, recherche, exports) et l'interface. Sans authentification ni serveur de données,
// l'identité reste un profil choisi : les règles sont démontrées, pas garanties.
import type { AccesPersonne, Confidentialite, ID, ModuleApp, NiveauAcces, Personne, ProfilAcces, Projet } from "../types";
import type { CanalNote, Decision } from "./types";

export const MODULES: { id: ModuleApp; libelle: string; description: string; portee: "socle" | "construction" }[] = [
  { id: "portefeuille", libelle: "Portefeuille et fiche projet", description: "Vue d'ensemble et fiche des projets", portee: "socle" },
  { id: "vuesGroupe", libelle: "Vues de pilotage", description: "Vues Finance, PMO, Direction et CA", portee: "socle" },
  { id: "finances", libelle: "Finances", description: "Budget, engagements, atterrissage", portee: "socle" },
  { id: "risques", libelle: "Risques et opportunités", description: "Registre, mesures, revues", portee: "socle" },
  { id: "mandat", libelle: "Mandat de projet", description: "Mandat, signatures, passages de phase", portee: "socle" },
  { id: "rapports", libelle: "Rapports", description: "Rapports de phase et de clôture, complétude", portee: "socle" },
  { id: "cominv", libelle: "ComInv et décisions", description: "Séances, décisions, conditions", portee: "socle" },
  { id: "planning", libelle: "Planification", description: "Jalons, planning, charge", portee: "socle" },
  { id: "taches", libelle: "Tâches", description: "Actions attribuées", portee: "socle" },
  { id: "validations", libelle: "Validations", description: "Circuits de validation", portee: "socle" },
  { id: "documents", libelle: "Documents", description: "Registre et SharePoint", portee: "socle" },
  { id: "organigramme", libelle: "Organisation", description: "Organigramme et parties prenantes", portee: "socle" },
  { id: "ressources", libelle: "Ressources", description: "Équipe, charge, capacité", portee: "socle" },
  { id: "entreprises", libelle: "Entreprises", description: "Carnet d'adresses", portee: "socle" },
  { id: "appelsOffres", libelle: "Appels d'offres", description: "Descriptifs, offres, adjudications", portee: "construction" },
  { id: "contrats", libelle: "Contrats et factures", description: "Contrats, avenants, factures", portee: "construction" },
  { id: "chantier", libelle: "Suivi de chantier", description: "PV, réserves, journal, régies, constats", portee: "construction" },
  { id: "juridique", libelle: "Autorisations et foncier", description: "Permis, préavis, servitudes", portee: "construction" },
  { id: "ia", libelle: "Assistant IA", description: "Questions et imports par IA", portee: "socle" },
  { id: "archives", libelle: "Archives", description: "Archivage et lecture des archives", portee: "socle" },
  { id: "parametres", libelle: "Administration", description: "Référentiels, connecteurs, sauvegarde, journal", portee: "socle" },
  { id: "acces", libelle: "Gestion des accès", description: "Droits des membres", portee: "socle" },
];

export const PROFILS: ProfilAcces[] = [
  "Administrateur", "PMO", "Finance", "Direction", "ComInv",
  "Directeur de projet", "Responsable de lot", "Collaborateur", "Lecture seule", "Externe",
];

export const DESCRIPTION_PROFIL: Record<ProfilAcces, string> = {
  "Administrateur": "Tous les droits, y compris la gestion des accès et l'administration.",
  "PMO": "Gouvernance du portefeuille : mandats, rapports, ComInv, référentiels.",
  "Finance": "Contrôle de gestion : finances de tous les projets, conditions ComInv.",
  "Direction": "Consultation de l'ensemble, arbitrages et validations.",
  "ComInv": "Membre du comité d'investissement : décisions et notes de séance.",
  "Directeur de projet": "Pilote ses projets : modification de tous les modules métier.",
  "Responsable de lot": "Modifie les données de ses lots ; finances et contrats en lecture.",
  "Collaborateur": "Suit le projet, met à jour ses tâches, planning et documents.",
  "Lecture seule": "Consulte le projet sans rien modifier (ex. maître d'ouvrage).",
  "Externe": "Accès restreint : tâches, validations et documents qui le concernent.",
};

const E: NiveauAcces = "ecriture";
const L: NiveauAcces = "lecture";
const A: NiveauAcces = "aucun";

const tous = (n: NiveauAcces): Record<ModuleApp, NiveauAcces> =>
  Object.fromEntries(MODULES.map((m) => [m.id, n])) as Record<ModuleApp, NiveauAcces>;

export const DROITS_PROFIL: Record<ProfilAcces, Record<ModuleApp, NiveauAcces>> = {
  "Administrateur": tous(E),
  "PMO": { ...tous(E), finances: L, appelsOffres: L, contrats: L, chantier: L, juridique: L, acces: L },
  "Finance": { ...tous(L), finances: E, cominv: E, validations: E, taches: E, ia: E, parametres: A, acces: A, archives: A },
  "Direction": { ...tous(L), validations: E, ia: E, parametres: A, acces: A },
  "ComInv": {
    ...tous(A), portefeuille: L, vuesGroupe: L, finances: L, risques: L, mandat: L, rapports: L, cominv: E,
    planning: L, documents: L, validations: E, organigramme: L,
  },
  "Directeur de projet": { ...tous(E), cominv: L, vuesGroupe: L, archives: L, parametres: L, acces: L },
  "Responsable de lot": {
    ...tous(L), appelsOffres: E, planning: E, taches: E, risques: E, validations: E, documents: E, juridique: E,
    chantier: E, entreprises: E, ia: E, cominv: A, vuesGroupe: A, archives: A, parametres: A, acces: A,
  },
  "Collaborateur": {
    ...tous(L), planning: E, taches: E, validations: E, documents: E, chantier: E, ia: E,
    cominv: A, vuesGroupe: A, archives: A, parametres: A, acces: A,
  },
  "Lecture seule": { ...tous(L), cominv: A, vuesGroupe: A, archives: A, ia: A, parametres: A, acces: A },
  "Externe": { ...tous(A), planning: L, taches: E, validations: E, documents: L, organigramme: L, chantier: L },
};

const ORDRE_CONFIDENTIALITE: Confidentialite[] = ["Public", "Interne", "Confidentiel", "Strictement confidentiel"];

const CONFIDENTIALITE_PROFIL: Record<ProfilAcces, Confidentialite> = {
  "Administrateur": "Strictement confidentiel",
  "PMO": "Strictement confidentiel",
  "Finance": "Confidentiel",
  "Direction": "Strictement confidentiel",
  "ComInv": "Strictement confidentiel",
  "Directeur de projet": "Confidentiel",
  "Responsable de lot": "Interne",
  "Collaborateur": "Interne",
  "Lecture seule": "Interne",
  "Externe": "Public",
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
  return a.modules[module] ?? DROITS_PROFIL[a.profil][module] ?? "aucun";
}

export function confidentialiteMax(p: Personne | undefined): Confidentialite {
  if (!p) return "Strictement confidentiel";
  const a = accesDe(p);
  return a.confidentialiteMax ?? CONFIDENTIALITE_PROFIL[a.profil];
}

type ProjetPerimetre = Pick<Projet, "id"> & Partial<Pick<Projet, "directionId" | "confidentialite" | "directeurId" | "sponsorId">>;

/** Le projet est-il dans le périmètre de la personne (projets, directions, confidentialité) ? */
export function projetVisible(p: Personne | undefined, projet: ProjetPerimetre): boolean {
  if (!p) return true;
  const a = accesDe(p);
  // Le responsable et le sponsor d'un projet y ont toujours accès
  if (projet.directeurId === p.id || projet.sponsorId === p.id) return true;
  const rang = ORDRE_CONFIDENTIALITE.indexOf(projet.confidentialite ?? "Interne");
  if (rang > ORDRE_CONFIDENTIALITE.indexOf(confidentialiteMax(p))) return false;
  if (a.projets === "tous") return true;
  if ((a.projets as ID[]).includes(projet.id)) return true;
  return Boolean(projet.directionId && a.directions?.includes(projet.directionId));
}

export function projetsAccessibles<T extends ProjetPerimetre>(p: Personne | undefined, projets: T[]): T[] {
  if (!p) return projets;
  return projets.filter((x) => projetVisible(p, x));
}

export type ActionDroit = "lire" | "ecrire";

/** Règle unique : la personne peut-elle lire ou modifier ce module, éventuellement pour un projet donné ? */
export function peut(p: Personne | undefined, action: ActionDroit, module: ModuleApp, projet?: ProjetPerimetre): boolean {
  const n = niveau(p, module);
  if (n === "aucun") return false;
  if (action === "ecrire" && n !== "ecriture") return false;
  return projet ? projetVisible(p, projet) : true;
}

const CANAUX_PROFIL: Record<CanalNote, ProfilAcces[]> = {
  "Responsable de projet": PROFILS.filter((x) => x !== "Externe"),
  "PMO": ["Administrateur", "PMO", "Direction"],
  "Finance / ComInv": ["Administrateur", "PMO", "Direction", "Finance", "ComInv"],
};

/** Les notes du PMO et de la Finance ne sont visibles que des profils concernés */
export function canalVisible(p: Personne | undefined, canal: CanalNote): boolean {
  return !p || CANAUX_PROFIL[canal].includes(accesDe(p).profil);
}

/** Canal dans lequel la personne écrit par défaut */
export function canalDe(p: Personne | undefined): CanalNote {
  const profil = p ? accesDe(p).profil : "Directeur de projet";
  return profil === "PMO" ? "PMO" : profil === "Finance" || profil === "ComInv" ? "Finance / ComInv" : "Responsable de projet";
}

/** Une décision sensible ou une note de travail n'est visible que des profils habilités */
export function decisionVisible(p: Personne | undefined, d: Pick<Decision, "restreint" | "statut">): boolean {
  if (!p) return true;
  if (!d.restreint && d.statut !== "Note de travail") return niveau(p, "cominv") !== "aucun";
  return niveau(p, "cominv") === "ecriture" || ["Administrateur", "PMO", "Direction"].includes(accesDe(p).profil);
}

export const LIBELLE_NIVEAU: Record<NiveauAcces, string> = { aucun: "Aucun", lecture: "Lecture", ecriture: "Modification" };
