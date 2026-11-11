import { describe, expect, it } from "vitest";
import { _resoudre as resoudre } from "./chemins";

describe("adresses dans le projet ouvert", () => {
  it("replace les pages de projet sous le projet courant, paramètres compris", () => {
    expect(resoudre("p1", "/contrats/c1")).toBe("/projets/p1/contrats/c1");
    expect(resoudre("p1", "/validations?type=Facture&id=f1")).toBe("/projets/p1/validations?type=Facture&id=f1");
    expect(resoudre("p1", "/projet")).toBe("/projets/p1");
    expect(resoudre("p1", "/organigramme")).toBe("/projets/p1/organisation");
  });
  it("laisse les pages globales à leur place", () => {
    expect(resoudre("p1", "/entreprises")).toBe("/entreprises");
    expect(resoudre("p1", "/")).toBe("/portefeuille");
    expect(resoudre("p1", "/parametres")).toBe("/administration/connecteurs");
    expect(resoudre("p1", "/projets/p2/risques")).toBe("/projets/p2/risques");
  });
  it("renvoie au portefeuille sans projet ouvert", () => {
    expect(resoudre(null, "/contrats")).toBe("/portefeuille");
  });
});
