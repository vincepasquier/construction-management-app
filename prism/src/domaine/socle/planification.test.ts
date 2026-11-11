import { describe, expect, it } from "vitest";
import type { Tache } from "../types";
import { anneesCouvertes, bilanCapacite, ecartJalon, etatJalon } from "./planification";
import type { Capacite, EstimationCharge } from "./types";

const jalon = (t: Partial<Tache>): Tache => ({ id: "j", projetId: "p", nom: "Jalon", debut: "2026-06-30", fin: "2026-06-30", avancement: 0, jalon: true, dependances: [], ...t } as Tache);
const e = (projetId: string, directionId: string, annee: number, joursHommes: number, competence?: string): EstimationCharge => ({ id: `${projetId}-${directionId}-${annee}-${competence ?? ""}`, projetId, directionId, annee, joursHommes, competence });
const c = (directionId: string, annee: number, joursHommes: number, competence?: string): Capacite => ({ id: `${directionId}-${annee}-${competence ?? ""}`, directionId, annee, joursHommes, competence });

describe("jalons", () => {
  it("mesure l'écart à la date de référence, avec la date réelle quand elle existe", () => {
    expect(ecartJalon(jalon({ finPrevue: "2026-06-01", fin: "2026-06-30" }))).toBe(29);
    expect(ecartJalon(jalon({ finPrevue: "2026-06-01", fin: "2026-06-30", finReelle: "2026-06-11" }))).toBe(10);
    expect(ecartJalon(jalon({}))).toBe(0);
  });
  it("qualifie l'état du jalon", () => {
    expect(etatJalon(jalon({ finReelle: "2026-07-02" }), "2026-08-01")).toBe("Atteint");
    expect(etatJalon(jalon({}), "2026-08-01")).toBe("En retard");
    expect(etatJalon(jalon({ finPrevue: "2026-06-01" }), "2026-06-15")).toBe("Décalé");
    expect(etatJalon(jalon({}), "2026-06-15")).toBe("À venir");
  });
});

describe("charge et capacité", () => {
  const estimations = [e("a", "INF", 2027, 120, "Ingénierie"), e("b", "INF", 2027, 60, "Conduite de travaux"), e("a", "INF", 2027, 30, "Conduite de travaux"), e("c", "NUM", 2027, 80), e("a", "INF", 2028, 40)];
  const capacites = [c("INF", 2027, 150), c("NUM", 2027, 200), c("FIN", 2027, 50)];

  it("compare la demande des projets à la capacité de chaque direction, les plus chargées d'abord", () => {
    const b = bilanCapacite(estimations, capacites, 2027);
    expect(b.map((l) => [l.directionId, l.demande, l.capacite, l.solde, Math.round(l.taux ?? -1)])).toEqual([["INF", 210, 150, -60, 140], ["NUM", 80, 200, 120, 40], ["FIN", 0, 50, 50, 0]]);
    expect(b[0].projets).toEqual([{ projetId: "a", joursHommes: 150 }, { projetId: "b", joursHommes: 60 }]);
  });

  it("signale une demande sans capacité saisie, et détaille par compétence sur demande", () => {
    const sans = bilanCapacite(estimations, [], 2027);
    expect(sans[0].taux).toBeUndefined();
    const detail = bilanCapacite(estimations, [c("INF", 2027, 100, "Ingénierie")], 2027, true);
    expect(detail.find((l) => l.competence === "Ingénierie")).toMatchObject({ demande: 120, capacite: 100, solde: -20 });
    expect(detail.find((l) => l.competence === "Conduite de travaux")).toMatchObject({ demande: 90, capacite: 0 });
  });

  it("liste les années à présenter", () => {
    expect(anneesCouvertes(estimations, capacites, 2026)).toEqual([2026, 2027, 2028]);
  });
});
