import { describe, expect, it } from "vitest";
import { bilanExigences, EXIGENCES, familleDe, FAMILLES } from "./exigences";

describe("couverture du cahier des charges", () => {
  it("liste chaque exigence une seule fois, dans une famille connue", () => {
    expect(EXIGENCES).toHaveLength(181);
    expect(new Set(EXIGENCES.map((e) => e.code)).size).toBe(181);
    expect(EXIGENCES.every((e) => /^[A-Z]{3}-\d{2}$/.test(e.code) && FAMILLES[familleDe(e.code)] && e.titre.length > 5)).toBe(true);
  });
  it("explique tout ce qui n'est pas pleinement réalisé", () => {
    const sansRemarque = EXIGENCES.filter((e) => (e.etat === "Partiel" || e.etat === "Simulé") && !e.remarque.trim());
    expect(sansRemarque.map((e) => e.code)).toEqual([]);
  });
  it("ne présente pas comme réalisé ce qui demande une infrastructure du groupe", () => {
    const etat = (code: string) => EXIGENCES.find((e) => e.code === code)?.etat;
    for (const code of ["SEC-02", "SEC-04", "SEC-09", "EXP-05", "EXP-06", "DEV-04", "DEV-05"]) expect(etat(code), code).toBe("Hors preuve de concept");
    for (const code of ["SEC-01", "FIN-02", "PIL-03", "COL-05"]) expect(etat(code), code).toBe("Simulé");
    const b = bilanExigences();
    expect(b["Réalisé"] + b.Partiel + b["Simulé"] + b["Hors preuve de concept"]).toBe(b.total);
  });
});
