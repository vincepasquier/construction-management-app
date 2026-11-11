import { beforeAll, describe, expect, it } from "vitest";
import { Depot } from "./depot";
import { chargerDemo } from "./initialisation";
import { chercher, construireIndex } from "./recherche";
import { StockageMemoire } from "./stockage";

let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire());
  await depot.ouvrir();
  await chargerDemo(depot);
  depot.ajouter("notes", { id: "n1", projetId: "prj-1", canal: "PMO", texte: "Arbitrage budgétaire sensible", date: "2026-11-01T00:00:00Z" });
  depot.ajouter("decisions", { id: "d1", projetId: "prj-1", organe: "ComInv", date: "2026-10-01", objet: "Crédit complémentaire giratoire", texte: "", statut: "Note de travail", conditions: [], restreint: true });
});

const personne = (id: string) => depot.parId("personnes", id);

describe("recherche transverse", () => {
  it("trouve projets, contrats, risques et contacts, titre d'abord", () => {
    const index = construireIndex(depot, personne("p20133-vincent-pasquier"));
    expect(chercher(index, "rc601")[0]).toMatchObject({ type: "Projet", lien: "/projets/prj-1" });
    expect(chercher(index, "collecteur step").some((r) => r.type === "Projet")).toBe(true);
    expect(new Set(index.map((r) => r.type))).toEqual(expect.objectContaining(new Set(["Projet", "Contrat", "Risque", "Entreprise", "Personne"])));
    expect(chercher(index, "", { type: "Contrat", projetId: "prj-1" }).every((r) => r.type === "Contrat" && r.projetId === "prj-1")).toBe(true);
  });

  it("ne sort jamais un projet hors périmètre ni ses objets", () => {
    // Nadia Perret n'a accès qu'au projet prj-2
    const index = construireIndex(depot, personne("per-5"));
    expect(index.some((r) => r.projetId === "prj-1")).toBe(false);
    expect(chercher(index, "rc601")).toHaveLength(0);
    expect(index.some((r) => r.projetId === "prj-2")).toBe(true);
  });

  it("respecte la confidentialité, les canaux de notes et les décisions restreintes", () => {
    const collaborateur = construireIndex(depot, personne("per-4"));
    expect(collaborateur.some((r) => r.titre.includes("Refonte du processus d'investissement"))).toBe(false);
    expect(chercher(collaborateur, "arbitrage")).toHaveLength(0);
    expect(chercher(collaborateur, "crédit complémentaire")).toHaveLength(0);

    const pmo = construireIndex(depot, personne("per-pmo"));
    expect(chercher(pmo, "arbitrage")).toHaveLength(1);
    expect(chercher(pmo, "crédit complémentaire")).toHaveLength(1);
    expect(pmo.some((r) => r.titre.includes("Refonte du processus d'investissement"))).toBe(true);
  });

  it("filtre par direction et par période", () => {
    const index = construireIndex(depot, undefined);
    const projets = depot.tous("projets");
    const enr = chercher(index, "", { type: "Projet", directionId: "dir-enr" }, projets);
    expect(enr.length).toBe(3);
    expect(chercher(index, "", { type: "Projet", du: "2028-01-01" }, projets).every((r) => (r.date ?? "") >= "2028-01-01")).toBe(true);
  });
});
