// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Depot } from "../../donnees/depot";
import { FournisseurDepot } from "../../donnees/hooks";
import { StockageMemoire } from "../../donnees/stockage";
import { lireNombre, TableDonnees, type Colonne } from "./TableDonnees";

afterEach(cleanup);

interface Ligne { id: string; lot: string; libelle: string; montant: number }
const LIGNES: Ligne[] = [
  { id: "a", lot: "L1", libelle: "Terrassement", montant: 300 },
  { id: "b", lot: "L2", libelle: "Canalisations", montant: 100 },
  { id: "c", lot: "L1", libelle: "Maçonnerie", montant: 200 },
];

async function afficher(enregistrer = vi.fn()) {
  const depot = new Depot(new StockageMemoire());
  await depot.ouvrir();
  const colonnes: Colonne<Ligne>[] = [
    { id: "lot", titre: "Lot", valeur: (l) => l.lot, groupable: true },
    { id: "libelle", titre: "Libellé", valeur: (l) => l.libelle },
    { id: "montant", titre: "Montant", valeur: (l) => l.montant, type: "nombre", total: true, edition: { type: "nombre", enregistrer } },
  ];
  render(<FournisseurDepot depot={depot}><TableDonnees id="test" lignes={LIGNES} colonnes={colonnes} cle={(l) => l.id} /></FournisseurDepot>);
  return enregistrer;
}

const libelles = () => screen.getAllByRole("row").slice(1).map((r) => within(r).queryAllByRole("cell")[1]?.textContent).filter(Boolean);

describe("tableau de données", () => {
  it("trie, filtre et affiche le total des lignes visibles", async () => {
    await afficher();
    expect(libelles()).toEqual(["Terrassement", "Canalisations", "Maçonnerie"]);
    fireEvent.click(screen.getByRole("button", { name: "Libellé" }));
    expect(libelles()).toEqual(["Canalisations", "Maçonnerie", "Terrassement"]);
    fireEvent.click(screen.getByRole("button", { name: "Libellé" }));
    expect(libelles()[0]).toBe("Terrassement");
    expect(within(screen.getAllByRole("row").at(-1)!).getByText("600")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Filtrer le tableau"), { target: { value: "maç" } });
    expect(libelles()).toEqual(["Maçonnerie"]);
    expect(within(screen.getAllByRole("row").at(-1)!).getByText("200")).toBeTruthy();
  });

  it("regroupe avec sous-totaux", async () => {
    await afficher();
    fireEvent.change(screen.getByLabelText("Regrouper par"), { target: { value: "lot" } });
    const enTetes = screen.getAllByRole("row").filter((r) => /^L\d · \d$/.test(within(r).queryAllByRole("cell")[0]?.textContent?.replace(/\s+/g, " ").trim() ?? ""));
    expect(enTetes).toHaveLength(2);
    expect(within(enTetes[0]).getByText("500")).toBeTruthy();
  });

  it("enregistre une saisie en ligne et répartit un collage venu d'Excel", async () => {
    const enregistrer = await afficher();
    const champs = screen.getAllByLabelText("Montant");
    fireEvent.focus(champs[0]);
    fireEvent.change(champs[0], { target: { value: "350" } });
    fireEvent.blur(champs[0]);
    expect(enregistrer).toHaveBeenCalledWith(LIGNES[0], "350");

    fireEvent.paste(champs[1], { clipboardData: { getData: () => "10\n20\n" } });
    expect(enregistrer).toHaveBeenCalledWith(LIGNES[1], "10");
    expect(enregistrer).toHaveBeenCalledWith(LIGNES[2], "20");
  });

  it("lit les nombres saisis à la suisse", () => {
    expect(lireNombre("1'250.50")).toBe(1250.5);
    expect(lireNombre("1 250,5")).toBe(1250.5);
    expect(lireNombre("12 %")).toBe(12);
    expect(lireNombre("abc")).toBe(0);
  });
});
