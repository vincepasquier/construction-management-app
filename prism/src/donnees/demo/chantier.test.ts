import { beforeAll, describe, expect, it } from "vitest";
import { bilanJournal, bilanRegies, bilanReserves, echeancesGarantie, joursSansEntree, situation } from "../../domaine/lib/chantier";
import { ajouterJours } from "../../domaine/lib/format";
import { serie } from "../../domaine/socle/seances";
import { Depot } from "../depot";
import { chargerDemo } from "./charger";
import { espacePhotos } from "../photos";
import { REGLES, autoriser } from "../regles";
import { StockageMemoire } from "../stockage";

// Mercredi 11 novembre 2026
const JOUR = "2026-11-11";
let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, chantier: true, jour: JOUR });
});

describe("démonstration du suivi de chantier", () => {
  it("tient un journal des jours ouvrés, verrouillé au-delà d'une semaine, la veille restant à saisir", () => {
    const journal = depot.parProjet("journalChantier", "prj-1");
    expect(journal).toHaveLength(9);
    expect(new Set(journal.map((e) => e.date)).size).toBe(9);
    expect(journal.every((e) => { const j = new Date(`${e.date}T12:00:00Z`).getUTCDay(); return j !== 0 && j !== 6; })).toBe(true);
    expect(joursSansEntree(journal, ajouterJours(JOUR, -10), ajouterJours(JOUR, -1))).toEqual(["2026-11-10"]);
    expect(journal.filter((e) => e.verrouillee).every((e) => e.date < ajouterJours(JOUR, -7))).toBe(true);
    expect(bilanJournal(journal)).toMatchObject({ jours: 9, joursIntemperies: 1, arrets: 1 });
  });

  it("montre des réserves dans tous les états et une garantie qui approche de son terme", () => {
    const b = bilanReserves(depot.parProjet("reserves", "prj-1"), JOUR);
    expect(b).toMatchObject({ total: 6, ouvertes: 4, levees: 2, annoncees: 1, enRetard: 1, bloquantes: 1 });
    const g = echeancesGarantie(depot.parProjet("receptions", "prj-1"), JOUR);
    expect(g.map((x) => x.etat)).toEqual(["À vérifier", "En cours"]);
  });

  it("rattache chaque photo à un constat, une réserve ou une journée", async () => {
    const e = await espacePhotos(depot, "prj-1");
    expect(e.nombre).toBe(5);
    expect(e.orphelines).toEqual([]);
    const constat = depot.parId("constats", "cst-demo-1")!;
    expect(depot.parId("reserves", constat.reserveId!)?.constatId).toBe(constat.id);
  });

  it("totalise les régies et la situation du mois", () => {
    const b = bilanRegies(depot.parProjet("regies", "prj-1"));
    expect(b).toMatchObject({ nombre: 4, aValider: 1, montantAValider: 600, valide: 1959, facture: 1110, conteste: 704 });
    const s = situation(depot.parProjet("metres", "prj-1"), "ctr-1", "2026-11");
    // Antérieur : 0,6 × 145 000 + 2 150 × 68 + 420 × 92 ; mois : 1 380 × 68 + 410 × 142 ; contesté : 85 × 92
    expect(s).toMatchObject({ montantAnterieur: 271_840, montantPeriode: 152_060, montantCumul: 423_900, conteste: 7_820 });
    expect(s.lignes.find((l) => l.position === "221.311.101")).toMatchObject({ anterieur: 2150, periode: 1380, cumul: 3530 });
  });

  it("reprend dans la seconde séance le point resté ouvert, et porte les tâches au registre", () => {
    const [seconde, premiere] = serie(depot.tous("seances"), { type: "Chantier", projetId: "prj-1" });
    expect([premiere.numero, seconde.numero]).toEqual([1, 2]);
    expect(seconde.points.map((p) => p.numero)).toEqual(["1.2", "2.1", "2.2", "2.3"]);
    const taches = depot.parProjet("actions", "prj-1").filter((a) => a.seanceId === seconde.id || a.seanceId === premiere.id);
    expect(taches.length).toBeGreaterThanOrEqual(3);
  });
});

describe("règles d'intégrité du chantier", () => {
  it("refuse de modifier une journée verrouillée, sauf réouverture motivée par un administrateur", () => {
    const verrouillee = depot.parProjet("journalChantier", "prj-1").find((e) => e.verrouillee)!;
    expect(() => depot.modifier("journalChantier", verrouillee.id, { travaux: "Réécrit après coup" })).toThrow(/verrouillée/);
    expect(() => depot.supprimer("journalChantier", verrouillee.id)).toThrow(/verrouillée/);
    expect(() => depot.modifier("journalChantier", verrouillee.id, { verrouillee: false })).toThrow(/motif/);
    // Un conducteur de travaux ne peut pas rouvrir
    const admin = depot.acteurId;
    depot.acteurId = "per-4";
    try { expect(() => depot.modifier("journalChantier", verrouillee.id, { verrouillee: false }, { motif: "Erreur d'effectif" })).toThrow(/administrateur/); } finally { depot.acteurId = admin; }
    // La réouverture ne peut pas servir à glisser une autre modification
    expect(() => depot.modifier("journalChantier", verrouillee.id, { verrouillee: false, travaux: "Autre" }, { motif: "Erreur" })).toThrow(/verrouillée/);
    depot.modifier("journalChantier", verrouillee.id, { verrouillee: false }, { motif: "Erreur d'effectif signalée par l'entreprise" });
    depot.modifier("journalChantier", verrouillee.id, { travaux: `${verrouillee.travaux} (corrigé)` });
    expect(depot.parId("journalChantier", verrouillee.id)?.travaux).toMatch(/corrigé/);
  });

  it("fige le contenu d'un bon de régie validé, mais laisse évoluer son état", () => {
    expect(() => depot.modifier("regies", "reg-demo-1", { objet: "Autre chose" })).toThrow(/validé/);
    expect(() => depot.modifier("regies", "reg-demo-1", { lignes: [] })).toThrow(/validé/);
    expect(() => depot.supprimer("regies", "reg-demo-1")).toThrow(/validé/);
    depot.modifier("regies", "reg-demo-1", { statut: "Facturé", factureId: "fac-x" });
    expect(depot.parId("regies", "reg-demo-1")?.statut).toBe("Facturé");
    // Rouvert, il redevient modifiable
    depot.modifier("regies", "reg-demo-1", { statut: "Saisi", factureId: undefined });
    depot.modifier("regies", "reg-demo-1", { objet: "Dégagement d'une conduite, profil 12" });
    expect(depot.parId("regies", "reg-demo-1")?.objet).toMatch(/profil 12/);
    // Un bon simplement saisi se supprime
    depot.supprimer("regies", "reg-demo-2");
    expect(depot.parId("regies", "reg-demo-2")).toBeUndefined();
  });
});
