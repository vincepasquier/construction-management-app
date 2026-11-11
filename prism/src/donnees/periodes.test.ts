import { beforeEach, describe, expect, it } from "vitest";
import { Depot, ErreurDepot } from "./depot";
import { chargerDemo } from "./initialisation";
import { arreterPeriode, arreterPeriodeGroupe, etatPeriode } from "./periodes";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";

let depot: Depot;
// Projet dont la source ne tient pas d'atterrissage : la saisie du responsable fait foi
const PROJET = "ENR-2026-0154";
let pid = "";

beforeEach(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot);
  pid = depot.tous("projets").find((p) => p.code === PROJET)!.id;
});

describe("arrêt des périodes financières", () => {
  it("photographie la synthèse du projet", () => {
    const p = arreterPeriode(depot, pid, "2026-09");
    expect(p.valeurs.budgetApprouve).toBeGreaterThan(0);
    expect(depot.parProjet("periodesFinancieres", pid)).toHaveLength(1);
    // Refaire le même mois remplace la photo
    arreterPeriode(depot, pid, "2026-09");
    expect(depot.parProjet("periodesFinancieres", pid)).toHaveLength(1);
  });

  it("refuse d'arrêter sans commentaire quand l'atterrissage a bougé au-delà du seuil", () => {
    arreterPeriode(depot, pid, "2026-09");
    const s = etatPeriode(depot, pid, "2026-10").valeurs;
    depot.ajouter("atterrissagesSaisis", { id: "att-x", projetId: pid, date: "2026-10-20", montant: s.atterrissage * 1.06, commentaire: "Hausse du prix des transformateurs" });
    const e = etatPeriode(depot, pid, "2026-10");
    expect(e.commentaireExige).toBe(true);
    expect(e.variation.pct).toBeCloseTo(6, 0);
    expect(() => arreterPeriode(depot, pid, "2026-10")).toThrow(ErreurDepot);
    expect(depot.parProjet("periodesFinancieres", pid)).toHaveLength(1);
    arreterPeriode(depot, pid, "2026-10", "Hausse du prix des transformateurs, offre du 14.10");
    expect(depot.parProjet("periodesFinancieres", pid)).toHaveLength(2);
  });

  it("une période arrêtée ne se modifie plus, hormis son commentaire", () => {
    const p = arreterPeriode(depot, pid, "2026-09");
    expect(() => depot.modifier("periodesFinancieres", p.id, { valeurs: { ...p.valeurs, atterrissage: 1 } })).toThrow(ErreurDepot);
    depot.modifier("periodesFinancieres", p.id, { commentaire: "Précision" });
    expect(depot.parId("periodesFinancieres", p.id)?.commentaire).toBe("Précision");
  });

  it("arrête tout le portefeuille en laissant de côté les projets à commenter", () => {
    const ids = depot.tous("projets").filter((p) => !p.parentId).map((p) => p.id);
    const r1 = arreterPeriodeGroupe(depot, ids, "2026-09");
    expect(r1.arretees).toHaveLength(ids.length);
    const s = etatPeriode(depot, pid, "2026-10").valeurs;
    depot.ajouter("atterrissagesSaisis", { id: "att-y", projetId: pid, date: "2026-10-20", montant: s.atterrissage * 1.2, commentaire: "Dérive" });
    const r2 = arreterPeriodeGroupe(depot, ids, "2026-10");
    expect(r2.aCommenter).toEqual([pid]);
    expect(r2.arretees.length + r2.aCommenter.length).toBe(ids.length);
    expect(arreterPeriodeGroupe(depot, ids, "2026-10").dejaFaites).toHaveLength(r2.arretees.length);
  });
});
