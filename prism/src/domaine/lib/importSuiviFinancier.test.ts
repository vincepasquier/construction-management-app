import { describe, expect, it } from "vitest";
import { cleEntreprise, importerSuiviFinancier, moisDuFichier, type Feuille } from "./importSuiviFinancier";
import { importerFactures } from "./importFactures";
import { lireCsv } from "./lectureCsv";
import { calculerBudget, totaux } from "./budget";

// Classeur fictif reprenant la structure du classeur de suivi (feuilles et colonnes)
const L = (lot: string, pos0: string, pos1: string, et: string) => `L${lot}|${pos0}|${pos1} [Et.${et}]`;
const vide = (n: number) => Array(n).fill(null);
const paires = (...p: [string, number][]) => p.flatMap(([l, m]) => [l, m]).concat(vide(24 - 2 * p.length));

const classeur: Feuille[] = [
  { sheet: "SUIVI", data: [[...vide(17), "Lot 0 — Honoraires/Divers"], [...vide(17), "Lot 1 — Centrale"]] },
  {
    sheet: "BUDGET", data: [
      [3],
      ["Lot", "Position 0", "Position 1 (libellé)", "Et.", "ID", "Budget Initial\n(CHF)", "Mutations\n(CHF)", "Budget Révisé\n(CHF)", "Engagé\n(Commandes)", "Attendu\n(Offres/Est.)", "Atterrissage\n(Probable)", "Écart\nRévisé/AT", "Facturé\n(CHF)", "Payé\n(CHF)", "Facturé hors cmd\n(CHF)"],
      ["0", "Divers et imprevus", "Divers et imprevus (10%)", "1", "EST-1", 100_000, 0, 100_000, 0, 0, 100_000, 0, 1_000, 1_000, 1_000],
      ["1", "Batiment", "Gros oeuvre", "1", "EST-2", 500_000, -50_000, 450_000, 400_000, 0, 400_000, 50_000, 120_000, 100_000, 0],
      ["1", "Batiment", "Serrurerie", "2", "EST-3", 20_000, 50_000, 70_000, 0, 30_000, 30_000, 40_000, 0, 0, 0],
      [1, "∑  Batiment", null, null, null, 520_000],
    ],
  },
  {
    sheet: "MUTATIONS", data: [
      ["MUTATIONS BUDGÉTAIRES"], [""],
      ["MUTATION N°01"],
      ["Motif :", "Transfert serrurerie", null, null, null, "Date :", null, null, "Validé par :"],
      ["N°", "DÉBIT", "Montant", null, null, "CRÉDIT", "Montant", "Contrôle"],
      [1, L("1", "Batiment", "Gros oeuvre", "1"), 50_000, null, null, L("1", "Batiment", "Serrurerie", "2"), 50_000],
      ["TOTAL"],
    ],
  },
  {
    sheet: "COMMANDES", data: [
      ["COMMANDES — COÛTS ENGAGÉS"],
      ["N° Commande", "Fournisseur", "Description", "Date", "Montant Total\n(CHF)", "Statut", "Remarques", ...Array.from({ length: 12 }, (_, i) => [`Position ${i + 1}`, null]).flat(), "Contrôle"],
      [...vide(7), ...Array.from({ length: 12 }, () => ["Sélection (ID — libellé)", "Montant\nImputé (CHF)"]).flat(), "Correction", "Total Imputé"],
      ["CMD-1", "Béton SA", "Gros œuvre", null, 400_000, "En cours", null, ...paires([L("1", "Batiment", "Gros oeuvre", "1"), 400_000]), 25_000],
    ],
  },
  {
    sheet: "OFFRES", data: [
      ["OFFRES"],
      ["N° Offre / Réf.", "Fournisseur / Description", "Date", "Type", "Statut", "Remarques", ...Array.from({ length: 12 }, (_, i) => [`Position ${i + 1}`, null]).flat(), "Montant Total\n(CHF)"],
      [...vide(6), ...Array.from({ length: 12 }, () => ["Sélection (ID — libellé)", "Montant\nImputé (CHF)"]).flat(), "Montant total\nsaisi (CHF)"],
      [1, "Serrurier Sàrl", null, "Offre ferme", "Reçue", "Caillebotis", ...paires([L("1", "Batiment", "Serrurerie", "2"), 30_000]), 30_000],
      [2, "A définir", null, "Estimation interne", "Refusée", "Variante", ...paires([L("1", "Batiment", "Serrurerie", "2"), 9_000]), 9_000],
    ],
  },
  {
    sheet: "IMPORT_SUR_CMD", data: [
      ["FACTURES SUR COMMANDE"], [""],
      ["N° comd", "N° fact", "Montant validé HT", "Date", "Statut facture", "Qté", "u", "Statut commande", "Fournisseur", "N° fact fourn"],
      ["CMD-1", "F-1", 100_000, new Date("2026-03-31"), "Réglé", 1, "%", "En cours", "Béton SA", "INV-1"],
      ["CMD-1", "F-2", 20_000, new Date("2026-04-30"), "Validé", 1, "%", "En cours", "Béton SA", "INV-2"],
    ],
  },
  {
    sheet: "IMPORT_HORS_CMD", data: [
      ["FACTURES HORS COMMANDE"], [""],
      ["N° fact", "Montant validé HT", "Date", "Statut facture", "Qté", "u", null, "Fournisseur", "N° fact fourn", "Position 1 (ID — libellé)", "Montant P1", "Position 2", "Montant P2", "Position 3", "Montant P3"],
      ["H-1", 1_000, new Date("2026-02-01"), "Réglé", 1, "%", null, "Labo SA", "L-9", L("0", "Divers et imprevus", "Divers et imprevus (10%)", "1")],
      ["H-2", 500, new Date("2026-02-02"), "", 1, "%", null, "Inconnu", "X"],
    ],
  },
];

describe("import du classeur de suivi financier", () => {
  const r = importerSuiviFinancier(classeur, { projetId: "p", entreprises: [{ id: "e1", nom: "Béton S.A.", localite: "", contact: "", email: "", telephone: "", specialites: [] }], moisCloture: "2026-07", dateImport: "2026-10-01" });

  it("reprend positions, lots, mutations, commandes, offres et factures", () => {
    expect(r.budget).toHaveLength(3);
    expect(r.lots.map((l) => l.nom)).toEqual(["Honoraires/Divers", "Centrale"]);
    expect(r.budget[0]).toMatchObject({ reserve: true, refExterne: "EST-1" });
    expect(r.mutations[0].lignes.map((l) => l.montant)).toEqual([-50_000, 50_000]);
    expect(r.contrats[0]).toMatchObject({ numero: "CMD-1", entrepriseId: "e1", montantInitial: 400_000 });
    expect(r.offres).toHaveLength(1);
    expect(r.ajustements.find((a) => a.type === "Estimation interne")?.statut).toBe("Abandonnée");
    expect(r.ajustements.find((a) => a.type === "Correction de commande")?.montant).toBe(25_000);
    expect(r.factures.map((f) => f.statut)).toEqual(["Payée", "Approuvée"]);
    expect(r.facturesHorsCommande).toHaveLength(2);
    expect(r.avertissements.some((a) => a.includes("sans position"))).toBe(true);
  });

  it("retrouve les totaux du classeur", () => {
    const c = Object.fromEntries(r.controle.map((x) => [x.libelle, x]));
    for (const k of ["Budget initial", "Budget révisé", "Engagé (commandes)", "Payé"]) {
      expect(Math.abs(c[k].chantier - c[k].classeur), k).toBeLessThan(0.01);
    }
    // La facture hors commande sans position (500) n'existait pas dans les totaux du classeur
    expect(c["Factures hors commande"].chantier).toBe(1_500);
    expect(c["Facturé"].chantier - c["Facturé"].classeur).toBeCloseTo(500);
    expect(c["Atterrissage hors corrections de commande"].chantier - c["Atterrissage hors corrections de commande"].classeur).toBeCloseTo(500);
  });

  it("crée la clôture de reprise", () => {
    const ps = calculerBudget({ ...r, appelsOffres: [] });
    expect(r.clotures[0].mois).toBe("2026-07");
    expect(r.clotures[0].totaux.atterrissage).toBeCloseTo(totaux(ps).atterrissage);
  });

  it("rapproche les noms d'entreprises", () => {
    expect(cleEntreprise("BETON ROMAND SA")).toBe(cleEntreprise("Béton Romand"));
    expect(cleEntreprise("Morel Ingénieurs SA, succursale de Sion")).toBe("morel ingenieurs");
    expect(moisDuFichier("CL200133_Suivi_financier_global_20260713.xlsm", "2026-10-01")).toBe("2026-07");
  });
});

describe("import des factures Power BI", () => {
  it("distingue factures sur commande, hors commande et déjà connues", () => {
    const csv = "N° comd;N° fact;Montant validé HT;Date;Statut facture;Fournisseur\nCMD-1;F-1;100000;31.03.2026;Réglé;Béton SA\nCMD-1;F-3;5000;15.05.2026;Validé;Béton SA\n;H-7;800;01.06.2026;;Labo SA\n";
    const ctr = { id: "c1", projetId: "p", numero: "CMD-1", entrepriseId: "", cfc: "", objet: "", type: "Contrat d'entreprise" as const, montantInitial: 1, dateSignature: "", retenuePct: 0, statut: "En cours" as const, avenants: [] };
    const r = importerFactures([{ sheet: "x", data: lireCsv(csv) }], {
      projetId: "p", contrats: [ctr],
      factures: [{ id: "f1", projetId: "p", contratId: "c1", numero: "F-1 (INV-1)", type: "Situation", date: "", echeance: "", montantHT: 100_000, statut: "Approuvée" }],
      facturesHorsCommande: [],
    });
    expect(r.factures).toHaveLength(1);
    expect(r.factures[0]).toMatchObject({ contratId: "c1", date: "2026-05-15", montantHT: 5_000 });
    expect(r.facturesHorsCommande[0]).toMatchObject({ numero: "H-7", fournisseur: "Labo SA", repartition: [] });
    expect(r.majPaiement).toEqual([{ id: "f1", type: "commande", paye: true }]);
  });

  it("lit les CSV avec champs entre guillemets sur plusieurs lignes", () => {
    expect(lireCsv('"Nom","Remarque"\n"Bruno","ligne 1\nligne 2"\n')).toEqual([["Nom", "Remarque"], ["Bruno", "ligne 1\nligne 2"]]);
  });
});
