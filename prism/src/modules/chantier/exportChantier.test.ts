import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import type { Projet } from "@/domaine/types";
import type { Reserve } from "@/domaine/types-chantier";
import { creerDocx } from "@/outils/docx";
import { blocsConstat, blocsJournal, blocsRegie, blocsReserves } from "./exportChantier";

const projet = { id: "p", code: "RC601", nom: "Traversée du village" } as Projet;
const texteDe = (blocs: Parameters<typeof creerDocx>[0]) => strFromU8(unzipSync(creerDocx(blocs))["word/document.xml"]).replace(/<[^>]+>/g, " ");

describe("documents Word du chantier", () => {
  it("écrit le bon de régie avec ses sous-totaux et son total", () => {
    const texte = texteDe(blocsRegie(projet, {
      id: "g", projetId: "p", numero: "BR-007", date: "2026-09-01", objet: "Purge de sol", statut: "Validé", dateValidation: "2026-09-02",
      lignes: [{ id: "1", type: "Main-d'œuvre", libelle: "Maçon", quantite: 7.5, unite: "h", prixUnitaire: 92.4 }, { id: "2", type: "Engin", libelle: "Pelle 18 t", quantite: 4, unite: "h", prixUnitaire: 165 }],
    }, { contrat: "C-01 · Routes SA" }));
    expect(texte).toContain("Bon de régie BR-007");
    expect(texte).toContain("C-01 · Routes SA");
    expect(texte).toContain("7,5");
    expect(texte).toMatch(/Sous-total main-d'œuvre\s+693\.00/);
    expect(texte).toMatch(/Total HT\s+1[\s’' ]?353\.00/);
    expect(texte).toContain("Validé le 02.09.2026");
  });

  it("regroupe les réserves par entreprise et signale les retards", () => {
    const r = (x: Partial<Reserve>): Reserve => ({ id: "r", projetId: "p", numero: "R-001", libelle: "Fissure", gravite: "Mineure", statut: "Ouverte", dateConstat: "2026-09-01", photos: [], ...x });
    const texte = texteDe(blocsReserves(projet, [r({ entrepriseId: "e1", delai: "2026-09-10" }), r({ id: "2", numero: "R-002", libelle: "Joint", entrepriseId: "e2" }), r({ id: "3", numero: "R-003", libelle: "Tampon" })],
      { nomEntreprise: (id) => ({ e1: "Routes SA", e2: "Hydro SA" })[id ?? ""] ?? "", nomLot: () => "" }, "2026-09-15"));
    expect(texte.indexOf("Entreprise non désignée")).toBeLessThan(texte.indexOf("Hydro SA"));
    expect(texte.indexOf("Hydro SA")).toBeLessThan(texte.indexOf("Routes SA"));
    expect(texte).toContain("5 j de retard");
  });

  it("écrit le journal dans l'ordre des jours et le constat avec ses légendes", () => {
    const journal = texteDe(blocsJournal(projet, [
      { id: "b", projetId: "p", date: "2026-09-08", meteo: "Pluie", effectifs: [{ entreprise: "Routes SA", personnes: 6 }], travaux: "Fouille", evenements: [{ id: "1", type: "Arrêt", texte: "Fouille inondée" }], photos: [], verrouillee: true },
      { id: "a", projetId: "p", date: "2026-09-07", meteo: "Beau", temperature: 14, effectifs: [], travaux: "", evenements: [], photos: ["x"] },
    ], "2026-09"));
    expect(journal).toContain("Journal de chantier – septembre 2026");
    expect(journal.indexOf("07.09.2026")).toBeLessThan(journal.indexOf("08.09.2026"));
    expect(journal).toContain("Beau, 14 °C (journée non verrouillée)");
    expect(journal).toContain("Arrêt : Fouille inondée");
    const constat = texteDe(blocsConstat(projet, { id: "c", projetId: "p", numero: "CT-003", date: "2026-09-05", type: "Sécurité", titre: "Blindage absent", description: "Fouille de 2,4 m sans blindage.", photos: [{ fichierId: "f1", legende: "Vue amont" }, { fichierId: "f2" }] }, { entreprise: "Routes SA" }));
    expect(constat).toContain("Constat CT-003");
    expect(constat).toContain("Photo 1 : Vue amont");
    expect(constat).toContain("Photo 2");
    expect(constat).toContain("Fouille de 2,4 m sans blindage.");
  });
});
