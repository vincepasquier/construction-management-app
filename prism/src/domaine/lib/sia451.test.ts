import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { comparerAuDescriptif, lireFichierCrb, lireSia451 } from "./sia451";
import { descriptifDepuisCrbx, entrepriseDepuisCrbx, soumissionDepuisCrbx } from "./importCrbx";
import { montantBrutSoumission } from "./finance";
import type { AppelOffres } from "../types";

// Construction d'un fichier SIA 451 synthétique, colonne par colonne
const place = (champs: [number, string][]) => {
  const l = Array(240).fill(" ");
  for (const [col, v] of champs) [...v].forEach((c, i) => (l[col + i] = c));
  return l.join("").trimEnd();
};
const qte = (q: number) => `A+${String(Math.round(q * 1000)).padStart(13, "0")}`;
const pu = (p: number | null) => (p === null ? "   +" : `A+${String(Math.round(p * 100)).padStart(12, "0")}`);
const g = (chap: string, pos: string, sousType: string, extra: [number, string][] = []) => place([[0, `G${chap}`], [7, pos], [41, sousType], ...extra]);

function fichier(prix: boolean, entreprise?: string) {
  const L = [
    place([[0, "A070225CRBX1721"], [81, "PRJ0001"], [92, "Collecteur test,"], [137, "Travaux de génie civil"], [167, "Logiciel Test"]]),
    place([[0, "B002"], [17, "PG"], [41, "2"], [92, "Projet global"]]),
    place([[0, "B002"], [17, "EA"], [41, "2"], [92, "élévation A"]]),
    place([[0, "C000"], [44, prix ? "+000000125145000" : "+000000000000000"]]),
    place([[0, "C001101"], [41, "1"], [43, "%+000000000000000+"], [73, "+000200"], [92, "Rabais"]]),
    place([[0, "C003203"], [43, "%+000000000000000+"], [73, "+000810"], [92, "TVA"]]),
    place([[0, "G211 24"], [41, "1"], [92, "Fouilles et terrassements"]]),
    g("211", "011110", "2", [[92, "Décapage,excav.,qualité sol"]]),
    g("211", "764002", "2", [[92, "Spécification"]]),
    g("211", "7640020101", "3", [[92, "Matériaux d'excavation"]]),
    g("211", "7640020301", "3", [[92, "     m2"]]),
    g("211", "764002", "5", [[58, "m2"]]),
    g("211", "764002", "6", [[17, "PG"], [43, qte(1000.5)], [60, pu(prix ? 0.33 : null)]]),
    g("211", "764002", "6", [[17, "EA"], [43, qte(3)], [60, pu(prix ? 0.33 : null)]]),
    g("211", "813002", "2", [[92, "d m 0,21-0,30"]]),
    g("211", "813002", "5", [[58, "m3"]]),
    g("211", "813002", "6", [[17, "PG"], [43, qte(500)], [60, pu(prix ? 249.63 : null)]]),
    place([[0, "Z070225"], [137, entreprise ?? "-"], [167, "021 000 00 00"], [187, "Jean Test"]]),
  ];
  return L.join("\r\n");
}

describe("lecture SIA 451", () => {
  it("lit l'en-tête, les subdivisions, les conditions et les positions à chiffrer", () => {
    const f = lireSia451(fichier(false));
    expect(f.date).toBe("2025-02-07");
    expect(f.projet).toBe("PRJ0001 Collecteur test");
    expect(f.objet).toBe("Travaux de génie civil");
    expect(f.elevations).toEqual({ PG: "Projet global", EA: "élévation A" });
    expect(f.chapitres["211"]).toBe("Fouilles et terrassements");
    expect(f.rabaisPct).toBe(2);
    expect(f.tvaPct).toBe(8.1);
    expect(f.estOffre).toBe(false);
    expect(f.entreprise).toBeUndefined();
    // La condition de rémunération 011110 (sans quantité) n'est pas une position à chiffrer
    expect(f.positions.map((p) => p.cle)).toEqual(["211.764.002", "211.813.002"]);
    const p = f.positions[0];
    expect(p.libelle).toBe("Matériaux d'excavation");
    expect(p.unite).toBe("m2");
    expect(p.quantite).toBe(1003.5);
    expect(p.quantitesParElevation).toEqual({ PG: 1000.5, EA: 3 });
  });

  it("lit une offre remplie et retrouve le total annoncé (arrondi à 5 ct par ligne)", () => {
    const f = lireSia451(fichier(true, "Génie Test SA"));
    expect(f.estOffre).toBe(true);
    expect(f.entreprise).toBe("Génie Test SA");
    expect(f.contact).toBe("Jean Test");
    // 1000.5 × 0.33 = 330.165 → 330.15 ; 3 × 0.33 = 0.99 → 1.00 ; 500 × 249.63 = 124'815
    expect(f.positions[0].montant).toBe(331.15);
    expect(f.positions.reduce((s, p) => s + p.montant, 0)).toBeCloseTo(125_146.15);
    expect(f.totalDeclare).toBe(1251.45);
  });

  it("ouvre l'archive CRBX (ZIP)", () => {
    const zip = zipSync({ "SIAFILE.e1s": strToU8(fichier(false)) });
    expect(lireFichierCrb(zip).positions).toHaveLength(2);
    expect(() => lireFichierCrb(strToU8("pas un fichier SIA"))).toThrow();
  });

  it("contrôle l'offre par rapport au descriptif", () => {
    const offre = lireSia451(fichier(true, "X SA"));
    const ecarts = comparerAuDescriptif([
      { cle: "211.764.002", libelle: "a", quantite: 1003.5 },
      { cle: "211.813.002", libelle: "b", quantite: 450 },
      { cle: "211.999.001", libelle: "c", quantite: 1 },
    ], offre);
    expect(ecarts.map((e) => e.type).sort()).toEqual(["manquante", "quantite"]);
  });
});

describe("import dans l'application", () => {
  it("crée le descriptif puis la soumission, et recalcule le montant comme le logiciel de l'entreprise", () => {
    const descriptif = lireSia451(fichier(false));
    const offre = lireSia451(fichier(true, "Génie Test SA"));
    const ao = { id: "ao", soumissions: [], ...descriptifDepuisCrbx(descriptif, "ao.crbx") } as unknown as AppelOffres;
    const { entreprise, nouvelle } = entrepriseDepuisCrbx(offre, [{ id: "e1", nom: "GENIE TEST", localite: "", contact: "", email: "", telephone: "", specialites: [] }]);
    expect(nouvelle).toBe(false);
    expect(entreprise.id).toBe("e1");
    const s = soumissionDepuisCrbx(ao, offre, entreprise.id, "offre.crbx");
    expect(s.rabaisPct).toBe(2);
    expect(s.ecarts).toEqual([]);
    expect(montantBrutSoumission(ao, s)).toBeCloseTo(125_146.15);
  });
});
