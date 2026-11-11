import { beforeAll, describe, expect, it } from "vitest";
import { estActif } from "../../domaine/lib/risques";
import { serie } from "../../domaine/socle/seances";
import { blocsReception } from "../../modules/chantier/exportChantier";
import { blocsContrat } from "../../modules/contrats/exportContrat";
import { Depot } from "../depot";
import { controler } from "../qualite";
import { REGLES, autoriser } from "../regles";
import { StockageMemoire } from "../stockage";
import { chargerDemo } from "./charger";

const JOUR = "2026-11-11";
const DIRECTIONS = ["DG", "DGC", "DFI", "DEN", "DDE", "DSE"];
let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, chantier: true, simulation: true, jour: JOUR });
});
const parNumero = (numero: string) => depot.tous("projets").find((p) => (p.numeroSource ?? p.code) === numero)!;

describe("simulation complète", () => {
  it("installe les six directions du groupe, chacune avec au moins un projet rempli de bout en bout", () => {
    expect(depot.tous("directions").map((d) => d.code).sort()).toEqual([...DIRECTIONS].sort());
    for (const code of DIRECTIONS) {
      const direction = depot.tous("directions").find((d) => d.code === code)!;
      const projets = depot.tous("projets").filter((p) => p.directionId === direction.id && !p.parentId);
      expect(projets.length, `projets de ${code}`).toBeGreaterThanOrEqual(1);
      // Au moins un projet de la direction a tout : mandat, risques, jalons, tâches, comité de pilotage, décision, document
      const complet = projets.some((p) => {
        const id = p.id;
        return depot.parProjet("mandats", id).length > 0 && depot.parProjet("risques", id).filter(estActif).length >= 3
          && depot.parProjet("taches", id).filter((t) => t.jalon).length >= 3 && depot.parProjet("actions", id).length >= 2
          && serie(depot.tous("seances"), { type: "Comité de pilotage", projetId: id }).length >= 1
          && depot.parProjet("decisions", id).length >= 1 && depot.parProjet("documents", id).length >= 2 && depot.parProjet("partiesPrenantes", id).length >= 3;
      });
      expect(complet, `projet complet dans ${code}`).toBe(true);
    }
  });

  it("donne à chaque projet de la source un numéro qui commence par le code de sa direction", () => {
    for (const p of depot.tous("projets").filter((x) => x.numeroSource)) {
      const code = depot.parId("directions", p.directionId ?? "")?.code;
      expect(p.numeroSource!.startsWith(`${code}-`), `${p.numeroSource} / ${code}`).toBe(true);
    }
  });

  it("porte au registre les décisions et les tâches des comités de pilotage", () => {
    const p = parNumero("DDE-2025-0098");
    const [seance] = serie(depot.tous("seances"), { type: "Comité de pilotage", projetId: p.id });
    expect(seance.statut).toBe("Diffusée");
    expect(seance.participants.some((x) => x.organisation === "Fournisseur des cellules")).toBe(true);
    const decision = depot.parProjet("decisions", p.id).find((d) => d.seanceId === seance.id)!;
    expect(decision).toMatchObject({ organe: "Comité de pilotage", statut: "Approuvée", montant: 130_000 });
    expect(depot.parProjet("actions", p.id).filter((a) => a.seanceId === seance.id)).toHaveLength(2);
    // Une décision reportée n'engage pas : elle figure au registre comme telle
    expect(depot.parProjet("decisions", parNumero("DFI-2025-0177").id).some((d) => d.statut === "Reportée")).toBe(true);
  });

  it("montre des jalons tenus, glissés et à venir", () => {
    const jalons = depot.parProjet("taches", parNumero("DGC-2026-0031").id).filter((t) => t.jalon);
    expect(jalons.filter((j) => j.finReelle).length).toBe(2);
    expect(jalons.filter((j) => j.finPrevue && j.finPrevue < j.fin).length).toBe(2);
    expect(jalons.filter((j) => !j.finReelle && j.fin > JOUR).length).toBe(3);
  });

  it("renseigne les conditions des contrats de construction, jusqu'au document de contrat", () => {
    const contrat = depot.parId("contrats", "ctr-1")!;
    expect(contrat.conditions).toMatchObject({ typePrix: "Prix unitaires", surete: "Cautionnement solidaire", peineParJour: 2000 });
    expect(contrat.avenants.find((a) => a.id === "av-2")).toMatchObject({ incidenceDelaiJours: 15 });
    expect(depot.parId("contrats", "ctr-5")!.conditions?.reglement).toBe("SIA 103 (ingénieurs civils)");
    const projet = depot.parId("projets", "prj-1")!;
    const blocs = blocsContrat(projet, contrat, { entreprise: depot.parId("entreprises", contrat.entrepriseId) });
    const champs = blocs.filter((b) => b.type === "champs").flatMap((b) => (b.type === "champs" ? b.lignes : []));
    // Aucune rubrique du contrat ne reste vide
    expect(champs.filter(([, valeur]) => !valeur.trim()).map(([libelle]) => libelle)).toEqual([]);
  });

  it("donne les trois issues d'une réception, avec leurs procès-verbaux", () => {
    const receptions = depot.parProjet("receptions", "prj-1");
    expect(receptions.map((r) => r.resultat).sort()).toEqual(["Acceptée", "Acceptée avec réserves", "Refusée"]);
    const projet = depot.parId("projets", "prj-1")!;
    const differee = receptions.find((r) => r.resultat === "Refusée")!;
    const reserves = depot.parProjet("reserves", "prj-1").filter((r) => r.receptionId === differee.id);
    expect(reserves.map((r) => r.gravite)).toEqual(["Bloquante"]);
    const blocs = blocsReception(projet, differee, reserves, { nomEntreprise: (id) => depot.parId("entreprises", id ?? "")?.nom ?? "" });
    expect(JSON.stringify(blocs)).toContain("Défauts majeurs (1)");
    for (const r of receptions) expect(r.participants && r.lieu && r.avisAchevement, r.objet).toBeTruthy();
  });

  it("ne laisse aucune anomalie bloquante sur les projets remplis", () => {
    const anomalies = controler(depot, depot.tous("projets"), JOUR);
    const ids = new Set(["DDE-2025-0098", "DEN-2026-0118", "DGC-2026-0031", "DG-2026-0002", "DSE-2026-0312"].map((n) => parNumero(n).id));
    expect(anomalies.filter((a) => a.projetId && ids.has(a.projetId) && a.gravite === "Bloquant").map((a) => `${a.objet} : ${a.message}`)).toEqual([]);
  });
});
