import { describe, expect, it } from "vitest";
import type { Ajustement, BudgetLigne, Contrat, Facture, FactureHorsCommande, Mutation, OffreAttendue } from "../types";
import {
  calculerBudget, cascade, equilibreMutation, photographier, repartirAuProrata, reserve, totaux, type DonneesBudget,
} from "./budget";

const ligne = (id: string, montant: number, extra: Partial<BudgetLigne> = {}): BudgetLigne => ({ id, projetId: "p", cfc: "", libelle: id, montant, ...extra });
const contrat = (id: string, montant: number, extra: Partial<Contrat> = {}): Contrat => ({
  id, projetId: "p", numero: id, entrepriseId: "e", cfc: "", objet: "", type: "Contrat d'entreprise", montantInitial: montant,
  dateSignature: "2026-01-01", retenuePct: 0, statut: "En cours", avenants: [], ...extra,
});
const donnees = (d: Partial<DonneesBudget>): DonneesBudget => ({
  budget: [], lots: [], contrats: [], factures: [], facturesHorsCommande: [], offres: [], ajustements: [], mutations: [], appelsOffres: [], ...d,
});
const pos = (r: ReturnType<typeof calculerBudget>, id: string) => r.find((p) => p.id === id)!;

describe("calcul de l'atterrissage par position", () => {
  it("reproduit la règle du classeur : budget réservé tant que rien n'est engagé, puis position soldée", () => {
    const hc: FactureHorsCommande = { id: "h", projetId: "p", numero: "F1", fournisseur: "X", date: "2026-01-01", montantHT: 4_000, paye: true, repartition: [{ budgetId: "b", montant: 4_000 }] };
    const r = calculerBudget(donnees({
      budget: [ligne("a", 100_000), ligne("b", 50_000), ligne("c", 10_000)],
      contrats: [contrat("k", 80_000, { repartition: [{ budgetId: "a", montant: 80_000 }] })],
      facturesHorsCommande: [hc, { ...hc, id: "h2", montantHT: 15_000, repartition: [{ budgetId: "c", montant: 15_000 }] }],
    }));
    // Engagée : atterrissage = engagé (le reste du budget n'est plus compté)
    expect(pos(r, "a")).toMatchObject({ engage: 80_000, rae: 0, atterrissage: 80_000, ecart: 20_000 });
    // Non engagée : max(budget, factures hors commande)
    expect(pos(r, "b")).toMatchObject({ engage: 4_000, rae: 46_000, atterrissage: 50_000, facture: 4_000, paye: 4_000 });
    expect(pos(r, "c")).toMatchObject({ rae: 0, atterrissage: 15_000, ecart: -5_000 });
  });

  it("ne compte que les mutations validées dans le budget révisé", () => {
    const m = (statut: Mutation["statut"]): Mutation => ({ id: statut, projetId: "p", numero: "1", motif: "", date: "", statut, lignes: [{ budgetId: "a", montant: -10_000 }, { budgetId: "b", montant: 10_000 }] });
    const r = calculerBudget(donnees({ budget: [ligne("a", 100_000), ligne("b", 0)], mutations: [m("Validée"), m("Soumise"), m("Refusée")] }));
    expect(pos(r, "a").revise).toBe(90_000);
    expect(pos(r, "b").revise).toBe(10_000);
    expect(totaux(r).revise).toBe(100_000);
  });

  it("répartit commandes, avenants et factures selon la répartition de la commande", () => {
    const c = contrat("k", 100_000, {
      repartition: [{ budgetId: "a", montant: 75_000 }, { budgetId: "b", montant: 25_000 }],
      avenants: [
        { id: "1", numero: "1", date: "", objet: "", montant: 20_000, statut: "Approuvé" },
        { id: "2", numero: "2", date: "", objet: "", montant: 8_000, statut: "Demandé" },
      ],
    });
    const f = (statut: Facture["statut"], montantHT: number): Facture => ({ id: statut, projetId: "p", contratId: "k", numero: "", type: "Situation", date: "", echeance: "", montantHT, statut });
    const r = calculerBudget(donnees({ budget: [ligne("a", 90_000), ligne("b", 30_000)], contrats: [c], factures: [f("Payée", 40_000), f("Approuvée", 20_000), f("Reçue", 99_000)] }));
    expect(pos(r, "a")).toMatchObject({ engage: 90_000, attendu: 6_000, facture: 45_000, paye: 30_000 });
    expect(pos(r, "b")).toMatchObject({ engage: 30_000, attendu: 2_000, facture: 15_000, paye: 10_000 });
  });

  it("compte les offres actives dans l'attendu et ignore les offres commandées ou refusées", () => {
    const o = (statut: OffreAttendue["statut"], montant: number): OffreAttendue => ({
      id: statut, projetId: "p", numero: "", fournisseur: "", description: "", type: "Offre ferme", statut, montant, repartition: [{ budgetId: "a", montant: 1 }],
    });
    const r = calculerBudget(donnees({ budget: [ligne("a", 50_000)], offres: [o("Reçue", 30_000), o("Retenue", 5_000), o("Commandée", 70_000), o("Refusée", 9_000)] }));
    expect(pos(r, "a")).toMatchObject({ attendu: 35_000, rae: 0, atterrissage: 35_000 });
  });

  it("pondère les ajustements et distingue atterrissage probable et défavorable", () => {
    const a = (type: Ajustement["type"], montant: number, probabilite: number, statut: Ajustement["statut"] = "Active"): Ajustement => ({
      id: type + statut, projetId: "p", type, libelle: "", montant, probabilite, statut, date: "", repartition: [{ budgetId: "a", montant }],
    });
    const r = calculerBudget(donnees({
      budget: [ligne("a", 100_000)],
      contrats: [contrat("k", 90_000, { repartition: [{ budgetId: "a", montant: 90_000 }] })],
      ajustements: [a("Risque", 50_000, 20), a("Opportunité", 10_000, 50), a("Plus-value attendue", 8_000, 100), a("Risque", 99_000, 100, "Abandonnée")],
    }));
    expect(pos(r, "a").ajustements).toBeCloseTo(10_000 - 5_000 + 8_000);
    expect(pos(r, "a").atterrissage).toBeCloseTo(103_000);
    expect(pos(r, "a").atterrissageDefavorable).toBeCloseTo(90_000 + 50_000 + 8_000);
  });

  it("une estimation interne sur une position vide remplace le budget restant (comme une offre)", () => {
    const aj: Ajustement = { id: "x", projetId: "p", type: "Estimation interne", libelle: "", montant: 180_000, probabilite: 100, statut: "Active", date: "", repartition: [{ budgetId: "a", montant: 1 }] };
    const r = calculerBudget(donnees({ budget: [ligne("a", 250_000)], ajustements: [aj] }));
    expect(pos(r, "a")).toMatchObject({ rae: 0, atterrissage: 180_000 });
  });

  it("applique les règles de reste à engager choisies par position", () => {
    const k = contrat("k", 60_000, { repartition: [{ budgetId: "a", montant: 30_000 }, { budgetId: "b", montant: 15_000 }, { budgetId: "c", montant: 15_000 }] });
    const r = calculerBudget(donnees({
      budget: [ligne("a", 100_000, { raeMode: "budget" }), ligne("b", 100_000, { raeMode: "saisi", raeMontant: 12_000 }), ligne("c", 100_000, { raeMode: "solde" })],
      contrats: [k],
    }));
    expect(pos(r, "a").rae).toBe(70_000);
    expect(pos(r, "b").rae).toBe(12_000);
    expect(pos(r, "c").rae).toBe(0);
  });

  it("impute un contrat sans répartition sur la ligne du même CFC, sinon sur une position hors budget", () => {
    const r = calculerBudget(donnees({
      budget: [ligne("a", 100_000, { cfc: "211" }), ligne("b", 50_000, { cfc: "461" })],
      contrats: [contrat("k1", 40_000, { cfc: "211.1" }), contrat("k2", 7_000, { cfc: "999" })],
    }));
    expect(pos(r, "a").engage).toBe(40_000);
    const hb = r.find((p) => p.virtuelle)!;
    expect(hb).toMatchObject({ engage: 7_000, atterrissage: 7_000, revise: 0, ecart: -7_000 });
    expect(totaux(r).engage).toBe(47_000);
  });

  it("suit la réserve", () => {
    const r = calculerBudget(donnees({
      budget: [ligne("r", 100_000, { reserve: true, raeMode: "budget" }), ligne("a", 10_000)],
      facturesHorsCommande: [{ id: "h", projetId: "p", numero: "", fournisseur: "", date: "", montantHT: 30_000, paye: false, repartition: [{ budgetId: "r", montant: 30_000 }] }],
    }));
    // La part non utilisée de la réserve reste disponible, même si elle est comptée dans l'atterrissage
    expect(reserve(r)).toMatchObject({ revise: 100_000, consomme: 30_000, restant: 70_000 });
  });
});

describe("mutations, clôtures et répartitions", () => {
  it("contrôle l'équilibre d'une mutation", () => {
    expect(equilibreMutation({ lignes: [{ budgetId: "a", montant: -500 }, { budgetId: "b", montant: 300 }, { budgetId: "c", montant: 200 }] }).equilibree).toBe(true);
    expect(equilibreMutation({ lignes: [{ budgetId: "a", montant: -500 }, { budgetId: "b", montant: 400 }] })).toMatchObject({ equilibree: false, solde: -100 });
  });

  it("explique exactement la variation d'atterrissage entre deux états", () => {
    const avant = photographier(calculerBudget(donnees({ budget: [ligne("a", 100_000), ligne("b", 40_000)] }))).totaux;
    const apres = calculerBudget(donnees({
      budget: [ligne("a", 100_000), ligne("b", 40_000)],
      contrats: [contrat("k", 112_000, { repartition: [{ budgetId: "a", montant: 1 }] })],
    }));
    const etapes = cascade(avant, totaux(apres));
    const somme = etapes.filter((e) => e.type === "variation").reduce((s, e) => s + e.valeur, etapes[0].valeur);
    expect(somme).toBeCloseTo(etapes.at(-1)!.valeur);
    expect(etapes.at(-1)!.valeur).toBe(152_000);
  });

  it("répartit au prorata du budget révisé, au centime", () => {
    const ps = calculerBudget(donnees({ budget: [ligne("a", 1), ligne("b", 1), ligne("c", 1)] }));
    const r = repartirAuProrata(100, ["a", "b", "c"], ps);
    expect(r.map((x) => x.montant)).toEqual([33.33, 33.33, 33.34]);
  });
});
