import { useMemo } from "react";
import { useProjetActif, useStore } from "../../store/useStore";
import { calculerBudget, libellePosition, totaux, type PositionCalculee } from "../../lib/budget";
import type { ID } from "../../types";

/**
 * Suivi par position du projet actif. Le calcul porte toujours sur l'ensemble du projet (les répartitions
 * peuvent viser plusieurs lots) ; le filtre « Mes lots » ne s'applique qu'à l'affichage.
 */
export function useBudget() {
  const s = useStore();
  const d = useProjetActif();
  const pid = d.projet?.id;
  const par = <T extends { projetId: ID }>(xs: T[]) => xs.filter((x) => x.projetId === pid);
  const lots = useMemo(() => s.lots.filter((l) => l.projetId === pid), [s.lots, pid]);
  const toutes = useMemo(() => calculerBudget({
    budget: par(s.budget), lots, contrats: par(s.contrats), factures: par(s.factures), facturesHorsCommande: par(s.facturesHorsCommande),
    offres: par(s.offres), ajustements: par(s.ajustements), mutations: par(s.mutations), appelsOffres: par(s.appelsOffres),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pid, s.budget, lots, s.contrats, s.factures, s.facturesHorsCommande, s.offres, s.ajustements, s.mutations, s.appelsOffres]);
  const mesLots = new Set(d.mesLots.map((l) => l.id));
  const positions = d.filtreActif ? toutes.filter((p) => p.lotId && mesLots.has(p.lotId)) : toutes;
  const t = totaux(positions);
  const libelle = (id: ID) => {
    const p = toutes.find((x) => x.id === id);
    return p ? libellePosition(p.ligne, lots) : "Position supprimée";
  };
  const ordre = (a: PositionCalculee, b: PositionCalculee) => {
    const la = lots.findIndex((l) => l.id === a.lotId);
    const lb = lots.findIndex((l) => l.id === b.lotId);
    return (la < 0 ? 999 : la) - (lb < 0 ? 999 : lb);
  };
  return { d, lots, toutes, positions: [...positions].sort(ordre), totaux: t, libelle };
}

export type Budget = ReturnType<typeof useBudget>;
