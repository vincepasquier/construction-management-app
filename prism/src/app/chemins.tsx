// Adresses à l'intérieur du projet ouvert. Les écrans de projet écrivent leurs liens comme s'ils
// étaient à la racine (« /contrats/c1 ») : ils sont replacés ici sous « /projets/<id>/ ».
import { useCallback } from "react";
import { Link, useNavigate, type LinkProps, type NavigateOptions } from "react-router-dom";
import { useProjetId } from "../donnees/hooks";
import { cheminProjet } from "./registre";

/** Pages qui ne dépendent pas du projet ouvert */
const GLOBALES = ["/portefeuille", "/administration", "/acces", "/entreprises", "/ressources", "/pilotage", "/cominv", "/archives", "/projets/", "/secours"];
/** Adresses de Chantier+ qui ont changé de place */
const RENOMMEES: Record<string, string> = { "/": "/portefeuille", "/parametres": "/administration/connecteurs", "/organigramme": "/organisation", "/projet": "" };

function resoudre(projetId: string | null, adresse: string): string {
  const [chemin, suite = ""] = adresse.split(/(?=[?#])/, 2);
  const cible = RENOMMEES[chemin] ?? chemin;
  if (!cible.startsWith("/") && cible !== "") return adresse;
  if (cible !== "" && GLOBALES.some((g) => cible === g || cible.startsWith(g.endsWith("/") ? g : `${g}/`))) return cible + suite;
  return (projetId ? cheminProjet(projetId, cible) : "/portefeuille") + suite;
}

/** Construit une adresse dans le projet courant : `chemin("contrats/c1")` → `/projets/<id>/contrats/c1` */
export function useChemin(): (sousChemin?: string) => string {
  const projetId = useProjetId();
  return useCallback((sousChemin = "") => resoudre(projetId, `/${sousChemin.replace(/^\//, "")}`), [projetId]);
}

/** `Link` dont l'adresse est comprise dans le projet ouvert */
export function LienProjet({ to, ...p }: LinkProps) {
  const projetId = useProjetId();
  return <Link to={typeof to === "string" ? resoudre(projetId, to) : to} {...p} />;
}

/** `navigate` dont l'adresse est comprise dans le projet ouvert */
export function useNaviguerProjet(): (adresse: string, options?: NavigateOptions) => void {
  const projetId = useProjetId();
  const navigate = useNavigate();
  return useCallback((adresse, options) => { void navigate(resoudre(projetId, adresse), options); }, [projetId, navigate]);
}

export const _resoudre = resoudre;
