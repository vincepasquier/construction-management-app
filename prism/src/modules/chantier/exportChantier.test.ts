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

describe("documents fondés sur la SIA 118", () => {
  const projetComplet = { ...projet, maitreOuvrage: "Groupe (démonstration)", lieu: "Village", tauxTVA: 8.1 } as Projet;
  const reserve = (x: Partial<Reserve>): Reserve => ({ id: "r", projetId: "p", numero: "R-001", libelle: "Joint non étanche", gravite: "Mineure", statut: "Ouverte", dateConstat: "2026-06-30", delai: "2026-07-31", photos: [], receptionId: "x", ...x });
  const texte = (blocs: Parameters<typeof creerDocx>[0]) => texteDe(blocs).replace(/\s+/g, " ");

  it("écrit le procès-verbal d'une réception avec défauts mineurs : résultat coché, délais, sûreté", async () => {
    const { blocsReception } = await import("./exportChantier");
    const blocs = blocsReception(projetComplet, { id: "x", projetId: "p", objet: "Collecteur, tronçon 1", date: "2026-06-30", type: "Partielle", resultat: "Acceptée avec réserves", avisAchevement: "2026-06-12", surete: "Cautionnement solidaire de 10 %", documentsRemis: "Plans conformes\nRapport d'inspection caméra", participants: "MO, DT, entreprise" },
      [reserve({}), reserve({ id: "2", numero: "R-002", statut: "Levée", dateLevee: "2026-07-10" })], { contrat: "C-03", entreprise: "Hydro SA", nomEntreprise: () => "Hydro SA" });
    const cases = blocs.find((b) => b.type === "cases");
    expect(cases?.type === "cases" && cases.elements.map((e) => e.coche)).toEqual([false, true, false]);
    const t = texte(blocs);
    expect(t).toContain("Procès-verbal de réception partielle");
    expect(t).toContain("SIA 118, art. 158");
    expect(t).toContain("Défauts mineurs (2)");
    expect(t).toContain("Levée le 10.07.2026");
    expect(t).toContain("jusqu'au 30.06.2028");
    expect(t).toContain("30.06.2031");
    expect(t).toContain("Cautionnement solidaire de 10 %");
    expect(t).toContain("Rapport d'inspection caméra");
    expect(t).toContain("édition 2013");
  });

  it("n'ouvre aucun délai quand la réception est différée pour défaut majeur", async () => {
    const { blocsReception } = await import("./exportChantier");
    const blocs = blocsReception(projetComplet, { id: "x", projetId: "p", objet: "Regard R12", date: "2026-06-30", type: "Partielle", resultat: "Refusée", secondeVerification: "2026-08-20" },
      [reserve({ gravite: "Bloquante", libelle: "Enrobage insuffisant" }), reserve({ id: "2", numero: "R-002" })], { nomEntreprise: () => "" });
    const cases = blocs.find((b) => b.type === "cases");
    expect(cases?.type === "cases" && cases.elements.map((e) => e.coche)).toEqual([false, false, true]);
    const t = texte(blocs);
    expect(t).toContain("Défauts majeurs (1)");
    expect(t).toContain("Défauts mineurs (1)");
    expect(t).toContain("L'ouvrage n'est pas reçu");
    expect(t).toContain("Nouvelle vérification commune prévue le 20.08.2026");
    expect(t).not.toContain("Délai de dénonciation des défauts (");
  });

  it("calcule l'acompte d'une situation : retenue sur le cumul, acomptes antérieurs déduits", async () => {
    const { blocsSituation } = await import("./exportChantier");
    const { acompteSituation, situation } = await import("@/domaine/lib/chantier");
    const m = (periode: string, quantite: number) => ({ id: periode + quantite, projetId: "p", contratId: "c", position: "221.311", libelle: "Grave", unite: "m3", periode, quantite, prixUnitaire: 100, statut: "Contradictoire" as const });
    const s = situation([m("2026-08", 1000), m("2026-09", 500)], "c", "2026-09");
    expect(acompteSituation(s, 10, 8.1)).toEqual({ cumul: 150_000, retenue: 15_000, netCumul: 135_000, anterieurNet: 90_000, acompteHT: 45_000, tva: 3_645, acompteTTC: 48_645 });
    const t = texte(blocsSituation(projetComplet, { id: "c", projetId: "p", numero: "C-01", entrepriseId: "e", cfc: "461", objet: "Génie civil", type: "Contrat d'entreprise", montantInitial: 2_000_000, dateSignature: "2026-01-15", retenuePct: 10, statut: "En cours", avenants: [] }, s, "2026-09", { entreprise: "Routes SA" }));
    expect(t).toContain("Situation de septembre 2026");
    expect(t).toContain("SIA 118, art. 141 ss");
    expect(t).toContain("Retenue de 10 % (SIA 118, art. 149 ss)");
    expect(t).toMatch(/Acompte de la période, TVA comprise\s+48[\s’' ]?645\.00/);
  });
});
