// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Contrat, Projet } from "../domaine/types";
import { Depot } from "./depot";
import { FournisseurDepot, FournisseurProjet, useDonnees, useProjet } from "./hooks";
import { StockageMemoire } from "./stockage";

afterEach(cleanup);

const projet = (id: string): Projet => ({ id, code: id, nom: `Projet ${id}`, maitreOuvrage: "", lieu: "", phase: "31 Avant-projet", dateDebut: "2026-01-01", dateFin: "2027-01-01", tauxTVA: 8.1, couleur: "#000", description: "" });
const contrat = (id: string, projetId: string): Contrat => ({ id, projetId, numero: id, entrepriseId: "e", cfc: "211", objet: "o", type: "Mandat", montantInitial: 1, dateSignature: "", retenuePct: 0, statut: "Signé", avenants: [] });

async function depotDeTest() {
  const d = new Depot(new StockageMemoire());
  await d.ouvrir();
  d.ajouter("projets", projet("p1"));
  d.ajouter("projets", projet("p2"));
  d.ajouter("contrats", contrat("c1", "p1"));
  return d;
}

describe("abonnement aux seules données lues", () => {
  it("ne redessine un composant que si une collection qu'il lit change", async () => {
    const d = await depotDeTest();
    let rendusProjets = 0, rendusContrats = 0;
    function ListeProjets() { rendusProjets++; const { projets } = useDonnees(); return <p data-testid="projets">{projets.map((p) => p.nom).join(", ")}</p>; }
    function NombreContrats() { rendusContrats++; const { contrats } = useDonnees(); return <p data-testid="contrats">{contrats.length}</p>; }
    render(<FournisseurDepot depot={d}><ListeProjets /><NombreContrats /></FournisseurDepot>);
    const p0 = rendusProjets, c0 = rendusContrats;

    act(() => d.ajouter("contrats", contrat("c2", "p1")));
    expect(screen.getByTestId("contrats").textContent).toBe("2");
    expect(rendusContrats).toBeGreaterThan(c0);
    expect(rendusProjets).toBe(p0);

    act(() => d.modifier("projets", "p1", { nom: "Renommé" }));
    expect(screen.getByTestId("projets").textContent).toBe("Renommé, Projet p2");
  });

  it("isole les données d'un projet : une écriture sur un autre projet ne redessine rien", async () => {
    const d = await depotDeTest();
    let rendus = 0;
    function Contrats() { rendus++; const { contrats, projet: p } = useProjet(); return <p data-testid="c">{p?.code}:{contrats.map((c) => c.id).join(",")}</p>; }
    render(<FournisseurDepot depot={d}><FournisseurProjet projetId="p1"><Contrats /></FournisseurProjet></FournisseurDepot>);
    expect(screen.getByTestId("c").textContent).toBe("p1:c1");
    const n = rendus;
    act(() => d.ajouter("contrats", contrat("c9", "p2")));
    expect(rendus).toBe(n);
    act(() => d.ajouter("contrats", contrat("c3", "p1")));
    expect(screen.getByTestId("c").textContent).toBe("p1:c1,c3");
  });
});
