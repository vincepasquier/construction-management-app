import {
  BarChart3, Briefcase, CalendarRange, FileCheck2, FileSignature, FolderOpen, Gavel, KeyRound, Landmark, LayoutGrid, ListChecks, Network,
  Settings, ShieldAlert, Users, Wallet,
} from "lucide-react";
import type { ModuleApp } from "../../types";

export const NAVIGATION = [
  { a: "/", libelle: "Portefeuille", icone: LayoutGrid, groupe: "Général", module: "portefeuille" },
  { a: "/projet", libelle: "Tableau de bord", icone: BarChart3, groupe: "Projet", module: "portefeuille" },
  { a: "/finances", libelle: "Finances", icone: Wallet, groupe: "Projet", module: "finances" },
  { a: "/appels-offres", libelle: "Marchés & appels d'offres", icone: Gavel, groupe: "Projet", module: "appelsOffres" },
  { a: "/contrats", libelle: "Contrats & factures", icone: FileSignature, groupe: "Projet", module: "contrats" },
  { a: "/planning", libelle: "Planning", icone: CalendarRange, groupe: "Projet", module: "planning" },
  { a: "/taches", libelle: "Tâches", icone: ListChecks, groupe: "Suivi", module: "taches" },
  { a: "/risques", libelle: "Risques", icone: ShieldAlert, groupe: "Suivi", module: "risques" },
  { a: "/validations", libelle: "Validations", icone: FileCheck2, groupe: "Suivi", module: "validations" },
  { a: "/juridique", libelle: "Autorisations & foncier", icone: Landmark, groupe: "Suivi", module: "juridique" },
  { a: "/documents", libelle: "Documents", icone: FolderOpen, groupe: "Suivi", module: "documents" },
  { a: "/organigramme", libelle: "Organigramme", icone: Network, groupe: "Organisation", module: "organigramme" },
  { a: "/ressources", libelle: "Ressources", icone: Users, groupe: "Organisation", module: "ressources" },
  { a: "/entreprises", libelle: "Entreprises", icone: Briefcase, groupe: "Organisation", module: "entreprises" },
  { a: "/acces", libelle: "Gestion des accès", icone: KeyRound, groupe: "Organisation", module: "acces" },
  { a: "/parametres", libelle: "Paramètres", icone: Settings, groupe: "Organisation", module: "parametres" },
] as const satisfies readonly { a: string; libelle: string; groupe: string; module: ModuleApp; icone: unknown }[];

/** Module correspondant à une URL (pour appliquer les droits d'accès) */
export function moduleDeChemin(chemin: string): ModuleApp {
  const segment = "/" + (chemin.split("/")[1] ?? "");
  return NAVIGATION.find((n) => n.a === segment)?.module ?? "portefeuille";
}
