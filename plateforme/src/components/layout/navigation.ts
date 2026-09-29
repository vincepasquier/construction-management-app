import { BarChart3, Briefcase, CalendarRange, FileSignature, FolderOpen, Gavel, LayoutGrid, Settings, Users, Wallet } from "lucide-react";

export const NAVIGATION = [
  { a: "/", libelle: "Portefeuille", icone: LayoutGrid, groupe: "Général" },
  { a: "/projet", libelle: "Tableau de bord", icone: BarChart3, groupe: "Projet" },
  { a: "/finances", libelle: "Finances CFC", icone: Wallet, groupe: "Projet" },
  { a: "/appels-offres", libelle: "Appels d'offres", icone: Gavel, groupe: "Projet" },
  { a: "/contrats", libelle: "Contrats & factures", icone: FileSignature, groupe: "Projet" },
  { a: "/planning", libelle: "Planning", icone: CalendarRange, groupe: "Projet" },
  { a: "/documents", libelle: "Documents", icone: FolderOpen, groupe: "Projet" },
  { a: "/ressources", libelle: "Ressources", icone: Users, groupe: "Organisation" },
  { a: "/entreprises", libelle: "Entreprises", icone: Briefcase, groupe: "Organisation" },
  { a: "/parametres", libelle: "Paramètres", icone: Settings, groupe: "Organisation" },
] as const;
