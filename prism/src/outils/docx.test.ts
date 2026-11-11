// @vitest-environment jsdom
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { creerDocx } from "./docx";

describe("écriture d'un document Word", () => {
  const octets = creerDocx([
    { type: "titre", texte: "Mandat de projet" },
    { type: "champs", lignes: [["Nom du projet", "Collecteur & STEP <essai>"], ["Auteur", ""]] },
    { type: "sousTitre", texte: "Contexte" },
    { type: "paragraphe", texte: "Première ligne\nSeconde ligne" },
    { type: "cases", elements: [{ libelle: "Efficience", coche: true }, { libelle: "Maintenance", coche: false }] },
    { type: "liste", elements: ["Un", "Deux"] },
    { type: "tableau", entetes: ["Objectif", "Critère"], lignes: [["Outil adapté", "Deux directions pilotes"], ["Seul"]], largeurs: [1, 2] },
  ], { pied: "PRISM · NUM-1" });
  const zip = unzipSync(octets);
  const xml = (nom: string) => new DOMParser().parseFromString(strFromU8(zip[nom]), "application/xml");

  it("produit une archive dont chaque partie est du XML bien formé", () => {
    expect(Object.keys(zip).sort()).toEqual(["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels", "word/document.xml", "word/footer1.xml", "word/styles.xml"]);
    for (const nom of Object.keys(zip)) expect(xml(nom).getElementsByTagName("parsererror").length, nom).toBe(0);
  });

  it("contient le texte, échappé, avec ses retours à la ligne, ses cases et son tableau", () => {
    const doc = xml("word/document.xml");
    const texte = [...doc.getElementsByTagName("w:t")].map((t) => t.textContent).join("|");
    expect(texte).toContain("Collecteur & STEP <essai>");
    expect(texte).toContain("Première ligne|Seconde ligne");
    expect(texte).toContain("☒  Efficience");
    expect(texte).toContain("☐  Maintenance");
    expect(doc.getElementsByTagName("w:br").length).toBe(1);
    expect(doc.getElementsByTagName("w:tbl").length).toBe(2);
    // Tableau des objectifs : 1 en-tête + 2 lignes de 2 cellules, la ligne incomplète étant complétée
    const lignes = [...doc.getElementsByTagName("w:tbl")[1].getElementsByTagName("w:tr")];
    expect(lignes.map((l) => l.getElementsByTagName("w:tc").length)).toEqual([2, 2, 2]);
    expect(strFromU8(zip["word/footer1.xml"])).toContain("PRISM · NUM-1");
  });
});
