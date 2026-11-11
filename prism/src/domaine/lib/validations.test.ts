import { describe, expect, it } from "vitest";
import type { CircuitValidation } from "../types";
import { attendDe, circuitApplicable, decider, etapesCourantes, nouvelleVersion } from "./validations";

const circuit = (mode?: "sequentiel" | "parallele"): CircuitValidation => ({
  id: "v", projetId: "p", titre: "Mandat", objet: { type: "Mandat" }, version: 1, demandeurId: "d", statut: "En cours", dateCreation: "2026-11-01", historique: [], mode,
  etapes: [{ id: "e1", personneId: "a", statut: "En attente" }, { id: "e2", personneId: "b", statut: "En attente" }, { id: "e3", personneId: "c", statut: "En attente" }],
});

describe("circuits de validation", () => {
  it("séquentiel : chacun son tour", () => {
    let c = circuit();
    expect(etapesCourantes(c).map((e) => e.personneId)).toEqual(["a"]);
    expect(attendDe(c, "b")).toBe(false);
    expect(() => decider(c, "b", "Approuvé", "2026-11-02")).toThrow();
    c = decider(c, "a", "Approuvé", "2026-11-02");
    expect(attendDe(c, "b")).toBe(true);
    c = decider(decider(c, "b", "Approuvé", "2026-11-03"), "c", "Approuvé", "2026-11-04");
    expect(c.statut).toBe("Approuvé");
  });

  it("parallèle : tous en même temps, dans n'importe quel ordre, et tous doivent approuver", () => {
    let c = circuit("parallele");
    expect(etapesCourantes(c)).toHaveLength(3);
    expect(attendDe(c, "c")).toBe(true);
    c = decider(c, "c", "Approuvé", "2026-11-02");
    c = decider(c, "a", "Approuvé", "2026-11-02");
    expect(c.statut).toBe("En cours");
    expect(attendDe(c, "a")).toBe(false);
    expect(decider(c, "b", "Approuvé", "2026-11-03").statut).toBe("Approuvé");
    expect(decider(c, "b", "Refusé", "2026-11-03", "Budget insuffisant").statut).toBe("Refusé");
    const corrige = decider(c, "b", "Modifications demandées", "2026-11-03", "Préciser le périmètre");
    expect(corrige.statut).toBe("À corriger");
    expect(etapesCourantes(nouvelleVersion(corrige, "d", "2026-11-05"))).toHaveLength(3);
  });

  it("un délégué décide à la place du validateur absent, et la délégation est tracée", () => {
    const delegations = [{ deId: "a", aId: "z", debut: "2026-11-01", fin: "2026-11-15" }];
    const c = circuit();
    expect(attendDe(c, "z", delegations, "2026-11-10")).toBe(true);
    expect(attendDe(c, "z", delegations, "2026-11-20")).toBe(false);
    expect(attendDe(c, "z")).toBe(false);
    const suite = decider(c, "z", "Approuvé", "2026-11-10", undefined, delegations);
    expect(suite.etapes[0]).toMatchObject({ statut: "Approuvé", parDelegationDe: "a" });
    expect(suite.historique[0]).toMatchObject({ personneId: "z", action: "Approuvé (par délégation)" });
    expect(() => decider(c, "z", "Approuvé", "2026-11-20", undefined, delegations)).toThrow();
  });

  it("choisit le circuit selon le seuil de compétence", () => {
    const modeles = [{ id: "bas", typeObjet: "Facture" }, { id: "haut", typeObjet: "Facture", seuilMin: 250_000 }, { id: "avenant", typeObjet: "Avenant" }];
    expect(circuitApplicable(modeles, "Facture", 80_000)?.id).toBe("bas");
    expect(circuitApplicable(modeles, "Facture", 250_000)?.id).toBe("haut");
    expect(circuitApplicable(modeles, "Mandat")).toBeUndefined();
  });
});
