import { useCallback } from "react";
import { useProjetId } from "../donnees/hooks";
import { cheminProjet } from "./registre";

/** Construit une adresse dans le projet courant : `chemin("contrats/c1")` → `/projets/<id>/contrats/c1` */
export function useChemin(): (sousChemin?: string) => string {
  const projetId = useProjetId();
  return useCallback((sousChemin = "") => (projetId ? cheminProjet(projetId, sousChemin) : "/portefeuille"), [projetId]);
}
