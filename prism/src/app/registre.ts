// Registre des modules : ce que l'application propose, où, et sous quel droit. La navigation, les
// droits de page et la recherche s'appuient tous sur cette table.
import {
  Archive, BarChart3, Briefcase, CalendarRange, ClipboardList, FileCheck2, FileSignature, FileText, FolderOpen, Gavel, HardHat, History,
  Inbox, KeyRound, Landmark, LayoutGrid, ListChecks, Network, Scale, ScrollText, Settings, ShieldAlert, Users, Wallet, type LucideIcon,
} from "lucide-react";
import type { TypeProjet } from "../domaine/socle/types";
import type { ModuleApp } from "../domaine/types";

export interface EntreeNavigation {
  /** Chemin : absolu pour une page globale, relatif au projet (« finances ») pour une page de projet */
  chemin: string;
  libelle: string;
  icone: LucideIcon;
  module: ModuleApp;
  groupe: string;
}

export const NAVIGATION_GLOBALE: EntreeNavigation[] = [
  { chemin: "/", libelle: "Mon travail", icone: Inbox, module: "portefeuille", groupe: "Général" },
  { chemin: "/portefeuille", libelle: "Portefeuille", icone: LayoutGrid, module: "portefeuille", groupe: "Général" },
  { chemin: "/pilotage", libelle: "Pilotage groupe", icone: BarChart3, module: "vuesGroupe", groupe: "Général" },
  { chemin: "/cominv", libelle: "ComInv", icone: Scale, module: "cominv", groupe: "Général" },
  { chemin: "/ressources", libelle: "Ressources", icone: Users, module: "ressources", groupe: "Général" },
  { chemin: "/entreprises", libelle: "Entreprises", icone: Briefcase, module: "entreprises", groupe: "Général" },
];

export const NAVIGATION_PROJET: EntreeNavigation[] = [
  { chemin: "", libelle: "Synthèse", icone: FileText, module: "portefeuille", groupe: "Pilotage" },
  { chemin: "planning", libelle: "Planification", icone: CalendarRange, module: "planning", groupe: "Pilotage" },
  { chemin: "taches", libelle: "Tâches", icone: ListChecks, module: "taches", groupe: "Pilotage" },
  { chemin: "risques", libelle: "Risques", icone: ShieldAlert, module: "risques", groupe: "Pilotage" },
  { chemin: "organisation", libelle: "Organisation", icone: Network, module: "organigramme", groupe: "Pilotage" },
  { chemin: "finances", libelle: "Finances", icone: Wallet, module: "finances", groupe: "Finances et marchés" },
  { chemin: "appels-offres", libelle: "Appels d'offres", icone: Gavel, module: "appelsOffres", groupe: "Finances et marchés" },
  { chemin: "contrats", libelle: "Contrats et factures", icone: FileSignature, module: "contrats", groupe: "Finances et marchés" },
  { chemin: "chantier", libelle: "Suivi de chantier", icone: HardHat, module: "chantier", groupe: "Réalisation" },
  { chemin: "juridique", libelle: "Autorisations et foncier", icone: Landmark, module: "juridique", groupe: "Réalisation" },
  { chemin: "mandat", libelle: "Mandat et phases", icone: ScrollText, module: "mandat", groupe: "Gouvernance" },
  { chemin: "rapports", libelle: "Rapports", icone: ClipboardList, module: "rapports", groupe: "Gouvernance" },
  { chemin: "decisions", libelle: "Décisions", icone: Scale, module: "cominv", groupe: "Gouvernance" },
  { chemin: "validations", libelle: "Validations", icone: FileCheck2, module: "validations", groupe: "Gouvernance" },
  { chemin: "documents", libelle: "Documents", icone: FolderOpen, module: "documents", groupe: "Dossier" },
  { chemin: "historique", libelle: "Historique", icone: History, module: "portefeuille", groupe: "Dossier" },
];

export const NAVIGATION_ADMIN: EntreeNavigation[] = [
  { chemin: "/archives", libelle: "Archives", icone: Archive, module: "archives", groupe: "Administration" },
  { chemin: "/acces", libelle: "Gestion des accès", icone: KeyRound, module: "acces", groupe: "Administration" },
  { chemin: "/administration", libelle: "Administration", icone: Settings, module: "parametres", groupe: "Administration" },
];

/** Entrées de projet actives pour un type de projet donné */
export function navigationDuType(type: TypeProjet | undefined): EntreeNavigation[] {
  if (!type) return NAVIGATION_PROJET;
  return NAVIGATION_PROJET.filter((n) => type.modules.includes(n.module));
}

export const cheminProjet = (projetId: string, sousChemin = "") => `/projets/${projetId}${sousChemin ? `/${sousChemin.replace(/^\//, "")}` : ""}`;

/** Module dont relève une adresse, pour appliquer les droits de page */
export function moduleDeChemin(chemin: string): ModuleApp {
  const segments = chemin.split("/").filter(Boolean);
  if (segments[0] === "projets") {
    return NAVIGATION_PROJET.find((n) => n.chemin === (segments[2] ?? ""))?.module ?? "portefeuille";
  }
  const racine = `/${segments[0] ?? ""}`;
  return [...NAVIGATION_GLOBALE, ...NAVIGATION_ADMIN].find((n) => n.chemin === racine)?.module ?? "portefeuille";
}
