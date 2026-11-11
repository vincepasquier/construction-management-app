// Petit magasin d'état réactif, pour ce qui n'appartient pas à la base : session et interface.
import { useSyncExternalStore } from "react";

export interface Etat<T extends object> {
  lire(): T;
  ecrire(patch: Partial<T>): void;
  abonner(rappel: () => void): () => void;
  /** Valeur dérivée de l'état ; le composant ne se redessine que si elle change */
  utiliser<S>(selecteur: (e: T) => S): S;
}

export function creerEtat<T extends object>(initial: T, cleStockage?: string): Etat<T> {
  let etat = initial;
  if (cleStockage) {
    try {
      const brut = globalThis.localStorage?.getItem(cleStockage);
      if (brut) etat = { ...initial, ...(JSON.parse(brut) as Partial<T>) };
    } catch {
      // Stockage indisponible (navigation privée) : l'état reste en mémoire
    }
  }
  const abonnes = new Set<() => void>();
  const abonner = (rappel: () => void) => {
    abonnes.add(rappel);
    return () => abonnes.delete(rappel);
  };
  return {
    lire: () => etat,
    ecrire(patch) {
      etat = { ...etat, ...patch };
      if (cleStockage) {
        try { globalThis.localStorage?.setItem(cleStockage, JSON.stringify(etat)); } catch { /* voir ci-dessus */ }
      }
      for (const a of abonnes) a();
    },
    abonner,
    utiliser: function useSelection(selecteur) { return useSyncExternalStore(abonner, () => selecteur(etat)); },
  };
}
