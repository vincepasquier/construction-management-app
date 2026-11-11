import type { TypeProjet } from "../domaine/socle/types";
import { NAVIGATION_PROJET } from "./registre";

/** Le sous-chemin demandé correspond-il à un module actif pour ce type de projet ? */
export function moduleActif(type: TypeProjet | undefined, sousChemin: string): boolean {
  if (!type) return true;
  const entree = NAVIGATION_PROJET.find((n) => n.chemin === (sousChemin.split("/")[0] ?? ""));
  return !entree || type.modules.includes(entree.module);
}
