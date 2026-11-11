// @vitest-environment jsdom
// Écrans du socle sur les données de démonstration : ce que voit un administrateur, et ce qu'un
// utilisateur au périmètre restreint ne voit pas.
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ProjetCourant } from "../../app/ProjetCourant";
import { Depot } from "../../donnees/depot";
import { FournisseurDepot } from "../../donnees/hooks";
import { chargerDemo } from "@/donnees/demo/charger";
import { REGLES, autoriser } from "../../donnees/regles";
import { session } from "../../donnees/session";
import { StockageMemoire } from "../../donnees/stockage";
import { Portefeuille } from "../portefeuille/Portefeuille";
import { Synthese } from "./Synthese";

let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot);
});
afterEach(cleanup);

function monter(chemin: string, utilisateurId: string) {
  session.ecrire({ utilisateurId });
  depot.acteurId = utilisateurId;
  return render(
    <FournisseurDepot depot={depot}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/portefeuille" element={<Portefeuille />} />
          <Route path="/projets/:projetId" element={<ProjetCourant />}><Route index element={<Synthese />} /></Route>
        </Routes>
      </MemoryRouter>
    </FournisseurDepot>,
  );
}

describe("fiche projet", () => {
  it("présente les valeurs financières avec leur origine et le rapprochement avec la source", () => {
    monter("/projets/prj-1", "p20133-vincent-pasquier");
    expect(screen.getAllByRole("heading", { level: 1 }).some((h) => h.textContent?.includes("RC 601"))).toBe(true);
    expect(screen.getAllByText(/calcul/i).length).toBeGreaterThan(3);
    expect(screen.getAllByText(/source/i).length).toBeGreaterThan(3);
    expect(screen.getByText("Rapprochement avec le système source")).toBeTruthy();
    // Séparateur de milliers variable selon l'environnement : on compare les chiffres seuls
    expect(screen.getAllByText((t) => t.replace(/\D/g, "") === "7715000" && t.includes("CHF")).length).toBeGreaterThan(0);
  });

  it("refuse un projet hors du périmètre de l'utilisateur", () => {
    // Nadia Perret n'a accès qu'au projet prj-2
    monter("/projets/prj-1", "per-5");
    expect(screen.getByText("Projet hors de votre périmètre")).toBeTruthy();
    expect(screen.queryByText("Rapprochement avec le système source")).toBeNull();
  });
});

describe("portefeuille", () => {
  it("liste les projets du périmètre, sous-projets regroupés sous leur parent", () => {
    monter("/portefeuille", "p20133-vincent-pasquier");
    const table = screen.getByRole("table");
    expect(within(table).getByText("RC601")).toBeTruthy();
    expect(within(table).getByText("INF-2026-0312")).toBeTruthy();
    expect(within(table).queryByText("INF-2026-0312-01")).toBeNull();
  });

  it("ne montre que le périmètre d'un utilisateur restreint", () => {
    monter("/portefeuille", "per-5");
    const table = screen.getByRole("table");
    expect(within(table).getByText("STEP")).toBeTruthy();
    expect(within(table).queryByText("RC601")).toBeNull();
  });
});
