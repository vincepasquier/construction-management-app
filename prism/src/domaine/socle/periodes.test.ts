import { describe, expect, it } from "vitest";
import { commentaireExige, historique, moisPrecedent, photographier, precedente, variation } from "./periodes";
import type { ValeursSynthese } from "./types";

const v = (atterrissage: number, realise = 0): ValeursSynthese => ({ budgetInitial: 1_000_000, budgetApprouve: 1_000_000, engage: realise, realise, paye: 0, atterrissage, atterrissageDefavorable: atterrissage });

describe("périodes financières", () => {
  it("calcule la variation de l'atterrissage rapportée au budget approuvé", () => {
    const x = variation(v(1_000_000, 100_000), v(1_030_000, 250_000));
    expect(x.atterrissage).toBe(30_000);
    expect(x.pct).toBeCloseTo(3);
    expect(x.realise).toBe(150_000);
    expect(variation(undefined, v(1_030_000)).pct).toBe(0);
  });

  it("exige un commentaire au-delà du seuil, à la hausse comme à la baisse", () => {
    expect(commentaireExige(variation(v(1_000_000), v(1_015_000)), 2)).toBe(false);
    expect(commentaireExige(variation(v(1_000_000), v(1_030_000)), 2)).toBe(true);
    expect(commentaireExige(variation(v(1_000_000), v(960_000)), 2)).toBe(true);
  });

  it("retrouve la période précédente et déroule l'historique", () => {
    const p = [photographier("p", "2026-09", "2026-10-02", v(1_010_000)), photographier("p", "2026-07", "2026-08-01", v(1_000_000)), photographier("p", "2026-10", "2026-11-03", v(1_050_000), "u", "  Avenant 3  ")];
    expect(precedente(p, "2026-10")?.mois).toBe("2026-09");
    expect(precedente(p, "2026-07")).toBeUndefined();
    const h = historique(p);
    expect(h.map((x) => x.periode.mois)).toEqual(["2026-07", "2026-09", "2026-10"]);
    expect(h.map((x) => x.variation.atterrissage)).toEqual([0, 10_000, 40_000]);
    expect(p[2].commentaire).toBe("Avenant 3");
    expect(p[2].id).toBe("per-p-2026-10");
  });

  it("recule d'un mois, y compris en janvier", () => {
    expect(moisPrecedent("2026-03")).toBe("2026-02");
    expect(moisPrecedent("2026-01")).toBe("2025-12");
  });
});
