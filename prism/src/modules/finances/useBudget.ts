import { calculerBudget, libellePosition, totaux, type PositionCalculee } from "@/domaine/lib/budget";
import type { ID } from "@/domaine/types";
import { useDerive, useProjet } from "@/donnees/hooks";
import { donneesBudget } from "@/donnees/lectures";

/**
 * Suivi par position du projet ouvert. Le calcul porte toujours sur l'ensemble du projet (les
 * répartitions peuvent viser plusieurs lots) ; le filtre « Mes lots » ne s'applique qu'à l'affichage.
 * Il n'est refait que si une collection financière de ce projet change.
 */
export function useBudget() {
  const d = useProjet();
  const pid = d.projet?.id ?? "";
  const { lots, toutes } = useDerive((depot, suivre) => {
    const donnees = donneesBudget(depot, pid, suivre);
    return { lots: donnees.lots, toutes: calculerBudget(donnees) };
  }, [pid]);
  const mesLots = new Set(d.mesLots.map((l) => l.id));
  const positions = d.filtreActif ? toutes.filter((p) => p.lotId && mesLots.has(p.lotId)) : toutes;
  const libelle = (id: ID) => {
    const p = toutes.find((x) => x.id === id);
    return p ? libellePosition(p.ligne, lots) : "Position supprimée";
  };
  const rang = (p: PositionCalculee) => { const i = lots.findIndex((l) => l.id === p.lotId); return i < 0 ? 999 : i; };
  return { d, lots, toutes, positions: [...positions].sort((a, b) => rang(a) - rang(b)), totaux: totaux(positions), libelle };
}

export type Budget = ReturnType<typeof useBudget>;
