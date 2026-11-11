import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { lireXlsx } from "../domaine/lib/lectureXlsx";
import { ecrireXlsx } from "./xlsx";

describe("écriture Excel", () => {
  it("produit un classeur relu à l'identique par le lecteur de l'application", () => {
    const octets = ecrireXlsx([
      { nom: "Positions", lignes: [["Code", "Libellé", "Montant", "Date"], ["211", "Terrassement & fouilles <A>", 1250000.5, new Date(2026, 8, 30)], ["281", "", 0, null]], montants: [2] },
      { nom: "Risques / 2026", lignes: [["Titre"], ["Crue"]] },
    ]);
    const feuilles = lireXlsx(octets);
    expect(feuilles.map((f) => f.sheet)).toEqual(["Positions", "Risques   2026"]);
    expect(feuilles[0].data[1].slice(0, 3)).toEqual(["211", "Terrassement & fouilles <A>", 1250000.5]);
    expect((feuilles[0].data[1][3] as Date).toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(feuilles[0].data[2][2]).toBe(0);
    const fichiers = unzipSync(octets);
    expect(strFromU8(fichiers["xl/worksheets/sheet1.xml"])).toContain('<c r="C2" s="2">');
  });
});
