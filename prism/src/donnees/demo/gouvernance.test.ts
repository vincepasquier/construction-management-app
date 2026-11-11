import { beforeAll, describe, expect, it } from "vitest";
import { decisionVisible } from "../../domaine/socle/droits";
import { integre } from "../../domaine/socle/mandat";
import { bilanCapacite } from "../../domaine/socle/planification";
import { Depot } from "../depot";
import { conditionsOuvertes } from "../gouvernance";
import { chargerDemo } from "./charger";
import { lignesPilotage } from "../pilotage";
import { REGLES, autoriser } from "../regles";
import { StockageMemoire } from "../stockage";

const JOUR = "2026-11-11";
let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, jour: JOUR });
});

describe("démonstration avec gouvernance", () => {
  it("se charge en respectant les règles du dépôt, avec des mandats signés et intègres", () => {
    const mandats = depot.tous("mandats");
    expect(mandats.length).toBe(depot.tous("projets").length);
    const signes = mandats.filter((m) => m.statut === "Signé");
    expect(signes.length).toBeGreaterThanOrEqual(7);
    expect(signes.every(integre)).toBe(true);
    expect(mandats.filter((m) => m.statut === "Brouillon").length).toBeGreaterThanOrEqual(1);
  });

  it("donne aux vues de pilotage des situations contrastées", () => {
    const racines = depot.tous("projets").filter((p) => !p.parentId);
    const lignes = lignesPilotage(depot, racines, JOUR);
    const indices = lignes.map((l) => l.completude.indice);
    expect(Math.max(...indices)).toBeGreaterThanOrEqual(90);
    expect(Math.min(...indices)).toBeLessThan(70);
    // Deux projets démarrés n'ont pas encore arrêté la période du mois dernier
    expect(lignes.filter((l) => !l.periode.existante && l.projet.dateDebut <= JOUR).length).toBe(2);
    expect(lignes.filter((l) => !l.mandatSigne).map((l) => l.projet.code)).toEqual(["DFI-2026-0021"]);
  });

  it("porte la séance du comité au registre : décisions, condition échue, tâche, note restreinte", () => {
    const decisions = depot.tous("decisions");
    expect(decisions.map((d) => d.statut).sort()).toEqual(["Approuvée", "Approuvée", "Note de travail", "Reportée"]);
    const ouvertes = conditionsOuvertes(decisions, depot.tous("decisionsPhase"), JOUR);
    expect(ouvertes).toHaveLength(2);
    expect(ouvertes.filter((c) => c.echue)).toHaveLength(1);
    expect(depot.tous("actions").some((a) => a.seanceId === "sea-demo-1")).toBe(true);
    const note = decisions.find((d) => d.statut === "Note de travail")!;
    expect(decisionVisible(depot.parId("personnes", "per-pmo"), note)).toBe(true);
    expect(decisionVisible(depot.parId("personnes", "per-keller"), note)).toBe(false);
  });

  it("met une direction en surcharge", () => {
    const bilan = bilanCapacite(depot.tous("estimationsCharge"), depot.tous("capacites"), 2027);
    expect(bilan.length).toBe(6);
    expect(bilan.every((l) => l.capacite > 0)).toBe(true);
  });
});

describe("ordre du jour du comité", () => {
  it("propose les projets dont le mandat demande un préavis et qui n'ont pas encore de décision", async () => {
    const { candidatsComInv } = await import("../seances");
    const candidats = candidatsComInv(depot, depot.tous("projets"));
    const codes = candidats.map((c) => c.projet.numeroSource ?? c.projet.code);
    // La centrale de chauffe a déjà sa décision ; le poste de transformation et le collecteur attendent
    expect(codes).toContain("DDE-2025-0098");
    expect(codes).toContain("DSE-2026-0240");
    expect(codes).not.toContain("DSE-2026-0312");
    expect(candidats[0].montant).toBeGreaterThan(0);
  });
});
