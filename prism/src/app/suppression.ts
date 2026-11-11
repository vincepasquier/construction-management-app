// Suppression avec confirmation dans la page ; un motif est demandé pour les données sensibles.
import { useCallback } from "react";
import type { ID } from "../domaine/types";
import { useActions } from "../donnees/hooks";
import { META, type NomCollection } from "../donnees/schema";
import { confirmer } from "./etatUI";

export function useSuppression() {
  const { supprimer } = useActions();
  return useCallback(async (collection: NomCollection, id: ID, o: { message?: string; quoi?: string } = {}): Promise<boolean> => {
    const meta = META[collection];
    const r = await confirmer({
      titre: `Supprimer ${o.quoi ?? meta.libelle.toLowerCase()}`,
      message: o.message ?? "Cette suppression est inscrite au journal et peut être annulée juste après.",
      action: "Supprimer", danger: true, motif: meta.sensible,
    });
    if (!r) return false;
    supprimer(collection, id, { motif: r.motif || undefined });
    return true;
  }, [supprimer]);
}
