import { describe, expect, it } from "vitest";
import type { EntreeJournalChantier, Metre, Reception, Regie, Reserve } from "../types-chantier";
import {
  aVerrouiller, bilanJournal, bilanRegies, bilanReserves, changerStatutReserve, echeancesGarantie, garantieDepuis, joursSansEntree,
  alertesChantier, manquesRegie, nouvelleEntree, numeroSuivant, regieFigee, resultatReception, resumeChantier, retardReserve, situation, totalRegie, totalRegieParType,
} from "./chantier";

const reserve = (x: Partial<Reserve>): Reserve => ({ id: "r", projetId: "p", numero: "R-001", libelle: "Fissure", gravite: "Mineure", statut: "Ouverte", dateConstat: "2026-09-01", photos: [], ...x });
const entree = (date: string, x: Partial<EntreeJournalChantier> = {}): EntreeJournalChantier => ({ id: date, projetId: "p", date, meteo: "Beau", effectifs: [], travaux: "", evenements: [], photos: [], ...x });
const metre = (x: Partial<Metre>): Metre => ({ id: Math.random().toString(36), projetId: "p", contratId: "c", position: "211.101", libelle: "Fouille", unite: "m3", periode: "2026-09", quantite: 10, prixUnitaire: 20, statut: "Contradictoire", ...x });

describe("numérotation", () => {
  it("continue la série du préfixe et ignore les autres", () => {
    expect(numeroSuivant([], "R")).toBe("R-001");
    expect(numeroSuivant([{ numero: "R-007" }, { numero: "BR-020" }, { numero: "R-003" }], "R")).toBe("R-008");
  });
});

describe("réserves", () => {
  it("compte le retard seulement pour une réserve ouverte dont le délai est passé", () => {
    expect(retardReserve(reserve({ delai: "2026-09-10" }), "2026-09-15")).toBe(5);
    expect(retardReserve(reserve({ delai: "2026-09-10", statut: "Levée" }), "2026-09-15")).toBe(0);
    expect(retardReserve(reserve({}), "2026-09-15")).toBe(0);
    expect(retardReserve(reserve({ delai: "2026-09-15" }), "2026-09-15")).toBe(0);
  });
  it("dresse le bilan", () => {
    const b = bilanReserves([
      reserve({ id: "1", delai: "2026-09-10" }), reserve({ id: "2", statut: "Levée" }),
      reserve({ id: "3", statut: "Levée annoncée", gravite: "Bloquante" }), reserve({ id: "4", statut: "Contestée" }),
    ], "2026-09-15");
    expect(b).toMatchObject({ total: 4, ouvertes: 3, levees: 1, annoncees: 1, enRetard: 1, bloquantes: 1, tauxLevee: 25 });
    expect(bilanReserves([], "2026-09-15").tauxLevee).toBe(100);
  });
  it("date et signe la levée, et l'efface à la réouverture", () => {
    expect(changerStatutReserve(reserve({}), "Levée", "2026-09-20", "u1")).toEqual({ statut: "Levée", dateLevee: "2026-09-20", leveeParId: "u1" });
    expect(changerStatutReserve(reserve({ statut: "Levée", dateLevee: "2026-09-20", leveeParId: "u1" }), "Ouverte", "2026-09-25")).toEqual({ statut: "Ouverte", dateLevee: undefined, leveeParId: undefined });
  });
});

describe("réceptions et garanties", () => {
  const reception = (x: Partial<Reception>): Reception => ({ id: "x", projetId: "p", objet: "Lot 1", date: "2026-06-30", type: "Finale", resultat: "Acceptée", ...x });
  it("propose deux ans de dénonciation et cinq ans de prescription", () => {
    expect(garantieDepuis("2026-06-30")).toEqual({ debutGarantie: "2026-06-30", finGarantie: "2028-06-30", prescription: "2031-06-30" });
  });
  it("classe les garanties par échéance et signale celles qui approchent", () => {
    const e = echeancesGarantie([
      reception({ id: "a", finGarantie: "2028-06-30" }), reception({ id: "b", finGarantie: "2026-12-01" }),
      reception({ id: "c", finGarantie: "2026-01-01" }), reception({ id: "d", resultat: "Refusée", finGarantie: "2027-01-01" }), reception({ id: "e" }),
    ], "2026-10-01");
    expect(e.map((x) => [x.reception.id, x.etat])).toEqual([["c", "Échue"], ["b", "À vérifier"], ["a", "En cours"]]);
  });
  it("déduit le résultat des réserves rattachées", () => {
    expect(resultatReception([])).toBe("Acceptée");
    expect(resultatReception([reserve({ statut: "Levée", gravite: "Bloquante" })])).toBe("Acceptée");
    expect(resultatReception([reserve({})])).toBe("Acceptée avec réserves");
    expect(resultatReception([reserve({ gravite: "Bloquante" })])).toBe("Refusée");
  });
});

describe("régies", () => {
  const regie = (x: Partial<Regie>): Regie => ({
    id: "g", projetId: "p", contratId: "c", numero: "BR-001", date: "2026-09-01", objet: "Purge", statut: "Saisi",
    lignes: [{ id: "1", type: "Main-d'œuvre", libelle: "Maçon", quantite: 7.5, unite: "h", prixUnitaire: 92.4 }, { id: "2", type: "Engin", libelle: "Pelle 18 t", quantite: 4, unite: "h", prixUnitaire: 165 }], ...x,
  });
  it("totalise au centime, par type", () => {
    expect(totalRegie(regie({}))).toBe(1353);
    expect(totalRegieParType(regie({}))).toEqual({ "Main-d'œuvre": 693, Engin: 660 });
  });
  it("fige un bon validé ou facturé", () => {
    expect(regieFigee(regie({}))).toBe(false);
    expect(regieFigee(regie({ statut: "Validé" }))).toBe(true);
    expect(regieFigee(regie({ statut: "Contesté" }))).toBe(false);
  });
  it("sépare ce qui reste à valider du reste, sans compter les bons contestés", () => {
    const b = bilanRegies([regie({}), regie({ statut: "Validé" }), regie({ statut: "Facturé" }), regie({ statut: "Contesté" })]);
    expect(b).toMatchObject({ nombre: 4, aValider: 1, montantAValider: 1353, valide: 1353, facture: 1353, conteste: 1353, total: 4059 });
  });
  it("dit ce qu'il manque avant validation", () => {
    expect(manquesRegie(regie({}))).toEqual([]);
    expect(manquesRegie(regie({ objet: " ", contratId: undefined, lignes: [] }))).toEqual(["l'objet des travaux", "le contrat concerné", "au moins une ligne"]);
    expect(manquesRegie(regie({ lignes: [{ id: "1", type: "Matériel", libelle: "", quantite: 0, unite: "pce", prixUnitaire: 0 }] }))).toHaveLength(2);
  });
});

describe("métrés", () => {
  const metres = [
    metre({ periode: "2026-08", quantite: 100 }), metre({ periode: "2026-09", quantite: 40 }), metre({ periode: "2026-09", quantite: 5, statut: "Contesté" }),
    metre({ position: "211.205", libelle: "Remblai", periode: "2026-09", quantite: 12.5, prixUnitaire: 31.2 }),
    metre({ periode: "2026-10", quantite: 999 }), metre({ contratId: "autre", quantite: 999 }),
  ];
  it("cumule par position jusqu'au mois demandé, sans les relevés contestés", () => {
    const s = situation(metres, "c", "2026-09");
    expect(s.lignes.map((l) => l.position)).toEqual(["211.101", "211.205"]);
    expect(s.lignes[0]).toMatchObject({ anterieur: 100, periode: 40, cumul: 140, montantPeriode: 800, montantCumul: 2800 });
    expect(s.lignes[0].metres).toHaveLength(2);
    expect(s.lignes[1]).toMatchObject({ anterieur: 0, periode: 12.5, montantPeriode: 390 });
    expect(s).toMatchObject({ montantPeriode: 1190, montantAnterieur: 2000, montantCumul: 3190, conteste: 100 });
  });
  it("donne une situation vide pour un contrat sans relevé", () => {
    expect(situation(metres, "inconnu", "2026-09")).toMatchObject({ lignes: [], montantCumul: 0 });
  });
});

describe("journal de chantier", () => {
  it("repère les jours ouvrés sans entrée", () => {
    // Du lundi 7 au dimanche 13 septembre 2026
    expect(joursSansEntree([entree("2026-09-07"), entree("2026-09-09")], "2026-09-07", "2026-09-13")).toEqual(["2026-09-08", "2026-09-10", "2026-09-11"]);
  });
  it("reprend les entreprises de la veille dans une nouvelle journée", () => {
    const e = nouvelleEntree([entree("2026-09-07", { meteo: "Pluie", effectifs: [{ entreprise: "Routes SA", personnes: 6, remarque: "demi-journée" }] }), entree("2026-09-10")], { id: "n", projetId: "p", date: "2026-09-08" });
    expect(e.effectifs).toEqual([{ entreprise: "Routes SA", personnes: 6 }]);
    expect(e.meteo).toBe("Pluie");
    expect(e.travaux).toBe("");
  });
  it("résume la période", () => {
    const b = bilanJournal([
      entree("2026-09-07", { effectifs: [{ entreprise: "A", personnes: 6 }, { entreprise: "B", personnes: 4 }], verrouillee: true }),
      entree("2026-09-08", { meteo: "Gel", effectifs: [{ entreprise: "A", personnes: 4 }], evenements: [{ id: "1", type: "Arrêt", texte: "Gel" }, { id: "2", type: "Sécurité", texte: "Visite SUVA" }] }),
      entree("2026-09-09", { meteo: "Neige" }),
    ]);
    expect(b).toEqual({ jours: 3, effectifMoyen: 7, joursIntemperies: 2, arrets: 1, incidents: 1, nonVerrouillees: 2 });
  });
  it("désigne les journées à verrouiller passé le délai de correction", () => {
    const liste = [entree("2026-09-01"), entree("2026-09-10"), entree("2026-08-20", { verrouillee: true })];
    expect(aVerrouiller(liste, "2026-09-12").map((e) => e.date)).toEqual(["2026-09-01"]);
  });
});

describe("résumé du chantier", () => {
  const donnees = {
    journal: [entree("2026-09-07", { travaux: "Pose du collecteur", effectifs: [{ entreprise: "A", personnes: 6 }] })],
    reserves: [reserve({ numero: "R-001", gravite: "Bloquante", delai: "2026-09-10" }), reserve({ id: "2", numero: "R-002", statut: "Levée" })],
    receptions: [{ id: "x", projetId: "p", objet: "Lot 1", date: "2024-11-01", type: "Finale" as const, resultat: "Acceptée" as const, finGarantie: "2026-11-01" }],
    regies: [{ id: "g", projetId: "p", contratId: "c", numero: "BR-001", date: "2026-09-01", objet: "Purge", statut: "Saisi" as const, lignes: [{ id: "1", type: "Engin" as const, libelle: "Pelle", quantite: 2, unite: "h", prixUnitaire: 150 }] }],
    constats: [{ id: "c", projetId: "p", numero: "CT-001", date: "2026-09-05", type: "Sécurité" as const, titre: "Blindage absent", description: "", photos: [] }],
  };
  it("liste les points qui demandent une action", () => {
    const a = alertesChantier(donnees, "2026-09-15");
    expect(a).toHaveLength(4);
    expect(a[0]).toMatch(/1 réserve\(s\) bloquante/);
    expect(a[1]).toMatch(/délai de levée est dépassé/);
    expect(a[2]).toMatch(/1 bon\(s\) de régie à valider/);
    expect(a[3]).toMatch(/Lot 1.*47 jour/);
    expect(alertesChantier({ journal: [], reserves: [], receptions: [], regies: [], constats: [] }, "2026-09-15")).toEqual([]);
  });
  it("résume le chantier pour l'assistant, et ne dit rien d'un chantier sans donnée", () => {
    const texte = resumeChantier(donnees, "2026-09-15");
    expect(texte).toContain("## Suivi de chantier");
    expect(texte).toContain("Réserves : 1 ouverte(s) sur 2, dont 1 bloquante(s) et 1 en retard.");
    expect(texte).toContain("- R-001 Fissure (Bloquante, Ouverte, à lever jusqu'au 2026-09-10)");
    expect(texte).not.toContain("R-002");
    expect(texte).toContain("1 à valider (300 CHF)");
    expect(texte).toContain("CT-001 du 2026-09-05, Sécurité : Blindage absent, sans suite");
    expect(resumeChantier({ journal: [], reserves: [], receptions: [], regies: [], constats: [] }, "2026-09-15")).toBe("");
  });
});
