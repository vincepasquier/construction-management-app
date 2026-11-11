import { beforeAll, describe, expect, it } from "vitest";
import { calculerBudget, totaux } from "../../../domaine/lib/budget";
import { bilanReserves, echeancesGarantie, joursSansEntree } from "../../../domaine/lib/chantier";
import { montantContrat } from "../../../domaine/lib/finance";
import { ajouterJours } from "../../../domaine/lib/format";
import { integre } from "../../../domaine/socle/mandat";
import { serie } from "../../../domaine/socle/seances";
import { CATALOGUE } from "../../connecteurs/dataPlatformSimulee";
import { Depot } from "../../depot";
import { espacePhotos } from "../../photos";
import { controler } from "../../qualite";
import { REGLES, autoriser } from "../../regles";
import { StockageMemoire } from "../../stockage";
import { verifierArchive } from "../../archive";
import { chargerPortefeuille, FICHE_ARCHIVEE, FICHES } from "./index";

// Mercredi 11 novembre 2026
const JOUR = "2026-11-11";
let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerPortefeuille(depot, { jour: JOUR });
});
const projet = (numero: string) => depot.tous("projets").find((p) => p.numeroSource === numero)!;
const de = <C extends Parameters<Depot["parProjet"]>[0]>(c: C, numero: string) => depot.parProjet(c, projet(numero).id);

describe("portefeuille de démonstration", () => {
  it("contient onze projets sur les six directions, chacun à un stade qui lui est propre", () => {
    const projets = depot.tous("projets").filter((p) => !p.archive);
    expect(projets).toHaveLength(11);
    const parDirection = (code: string) => projets.filter((p) => depot.parId("directions", p.directionId ?? "")?.code === code).length;
    expect(["DEN", "DDE", "DSE", "DFI", "DGC", "DG"].map(parDirection)).toEqual([4, 2, 2, 1, 1, 1]);
    // Toutes les phases du groupe sont représentées, de l'étude préliminaire à la clôture
    expect(new Set(projets.map((p) => p.phaseGroupe))).toEqual(new Set(["Études préliminaires", "Étude du projet", "Appel d'offres", "Réalisation", "Clôture"]));
    expect(projets.every((p) => p.directeurId && p.sponsorId && p.phaseGroupe)).toBe(true);
  });

  it("ajoute un douzième projet, clos puis archivé, que seul l'écran des archives présente", async () => {
    const archives = depot.tous("archives");
    expect(archives).toHaveLength(1);
    const clos = depot.parId("projets", archives[0].projetId)!;
    expect(clos.numeroSource).toBe(FICHE_ARCHIVEE.numero);
    expect(clos.archive?.empreinte).toBe(archives[0].empreinte);
    // Tout est soldé avant l'archivage, et l'archive se relit sans altération
    expect(depot.parProjet("risques", clos.id).every((r) => r.statut === "Clos")).toBe(true);
    expect(depot.parProjet("actions", clos.id).every((a) => a.statut === "Terminé")).toBe(true);
    expect(depot.parProjet("rapports", clos.id).some((r) => r.type === "Clôture" && r.statut === "Validé")).toBe(true);
    expect((await verifierArchive(depot, archives[0])).conforme).toBe(true);
    // Un projet archivé est figé : la règle du dépôt refuse toute écriture
    expect(() => depot.modifier("projets", clos.id, { nom: "Autre nom" })).toThrow();
  });

  it("donne à chaque projet de construction un budget égal à celui de la source", () => {
    for (const f of FICHES.filter((x) => x.construction)) {
      const somme = f.construction!.budget.reduce((t, [, , m]) => t + m, 0);
      expect(somme, f.numero).toBe(CATALOGUE.find((c) => c.numero === f.numero)!.budgetApprouve);
    }
  });

  it.each(FICHES.map((f) => [f.numero, f] as const))("%s : le socle est rempli sur tous les écrans", (numero, f) => {
    const p = projet(numero);
    expect(de("risques", numero).length, "risques").toBeGreaterThanOrEqual(3);
    expect(de("taches", numero).filter((t) => t.jalon).length, "jalons").toBeGreaterThanOrEqual(5);
    expect(de("taches", numero).filter((t) => !t.jalon).length, "planning").toBeGreaterThanOrEqual(5);
    expect(de("actions", numero).length, "tâches").toBeGreaterThanOrEqual(4);
    expect(de("documents", numero).length, "documents").toBeGreaterThanOrEqual(4);
    expect(de("partiesPrenantes", numero).length, "parties prenantes").toBeGreaterThanOrEqual(3);
    expect(de("affectations", numero).length, "équipe").toBeGreaterThanOrEqual(2);
    expect(de("notes", numero).length, "notes").toBeGreaterThanOrEqual(1);
    // Un projet terminé ne demande plus de charge
    if (p.statut !== "Terminé") expect(de("estimationsCharge", numero).length, "charge").toBeGreaterThanOrEqual(1);
    expect(de("periodesFinancieres", numero).length, "périodes").toBeGreaterThanOrEqual(1);
    expect(serie(depot.tous("seances"), { type: "Comité de pilotage", projetId: p.id }).length, "comité de pilotage").toBe(f.pilotage.length);
    expect(de("decisions", numero).length, "décisions").toBeGreaterThanOrEqual(1);
    const mandat = de("mandats", numero)[0];
    expect(mandat.contenu.contexte.length, "contexte du mandat").toBeGreaterThan(120);
    expect(mandat.contenu.objectifs).toHaveLength(3);
    // « En signature » : soumis, signé par le chef de projet, en attente des autres signataires
    expect(mandat.statut, "mandat").toBe(f.mandat.etat === "En signature" ? "Soumis" : "Signé");
    if (f.mandat.etat === "En signature") expect(mandat.signatures.filter((x) => x.date).length).toBe(1);
    if (mandat.statut === "Signé") expect(integre(mandat)).toBe(true);
  });

  it.each(FICHES.filter((f) => f.construction).map((f) => [f.numero, f] as const))("%s : la verticale construction est remplie", (numero, f) => {
    const fc = f.construction!;
    expect(de("lots", numero).length).toBe(fc.lots.length);
    expect(de("budget", numero).length).toBe(fc.budget.length);
    expect(de("appelsOffres", numero).length, "appels d'offres").toBeGreaterThanOrEqual(2);
    expect(de("contrats", numero).length, "contrats").toBeGreaterThanOrEqual(3);
    expect(de("factures", numero).length, "factures").toBeGreaterThanOrEqual(3);
    expect(de("autorisations", numero).length, "autorisations").toBeGreaterThanOrEqual(2);
    expect(de("servitudes", numero).length, "foncier").toBeGreaterThanOrEqual(2);
    expect(de("organigramme", numero).length, "organigramme").toBeGreaterThanOrEqual(4);
    expect(de("ajustements", numero).length + de("mutations", numero).length, "prévisions ou mutations").toBeGreaterThanOrEqual(1);
    expect(de("clotures", numero).length, "clôture mensuelle").toBe(1);
    // Chantier
    expect(de("journalChantier", numero).length, "journal").toBeGreaterThanOrEqual(6);
    expect(serie(depot.tous("seances"), { type: "Chantier", projetId: projet(numero).id }).length, "séances de chantier").toBe(2);
    expect(de("constats", numero).length, "constats").toBeGreaterThanOrEqual(2);
    expect(de("regies", numero).length + de("reserves", numero).length, "régies ou réserves").toBeGreaterThanOrEqual(1);
    expect(de("metres", numero).length + de("receptions", numero).length, "métrés ou réceptions").toBeGreaterThanOrEqual(1);
    // Chaque contrat entre dans une position du budget, sans la dépasser de façon absurde
    const budget = de("budget", numero);
    for (const c of de("contrats", numero)) expect(budget.some((b) => b.cfc === c.cfc), `${c.numero} → CFC ${c.cfc}`).toBe(true);
    // Les conditions des contrats sont renseignées, pour un document de contrat complet
    expect(de("contrats", numero).every((c) => c.conditions?.typePrix && c.conditions.debutTravaux)).toBe(true);
  });

  it("garde les finances cohérentes : engagé et facturé dans le budget, atterrissage proche", () => {
    for (const f of FICHES.filter((x) => x.construction)) {
      const n = f.numero;
      const t = totaux(calculerBudget({ budget: de("budget", n), lots: de("lots", n), contrats: de("contrats", n), factures: de("factures", n), facturesHorsCommande: de("facturesHorsCommande", n), appelsOffres: de("appelsOffres", n), mutations: de("mutations", n), offres: de("offres", n), ajustements: de("ajustements", n) }));
      const budget = f.construction!.budget.reduce((s, [, , m]) => s + m, 0);
      expect(t.revise, `${n} budget révisé`).toBe(budget);
      expect(t.engage, `${n} engagé`).toBeLessThanOrEqual(budget * 1.02);
      expect(t.facture, `${n} facturé`).toBeLessThanOrEqual(t.engage + 1);
      expect(Math.abs(t.atterrissage - budget) / budget, `${n} atterrissage`).toBeLessThan(0.12);
      // Aucune facture ne dépasse le montant de son contrat
      for (const c of de("contrats", n)) expect(de("factures", n).filter((x) => x.contratId === c.id).reduce((s, x) => s + x.montantHT, 0), c.numero).toBeLessThanOrEqual(montantContrat(c) + 1);
    }
  });

  it("montre les appels d'offres à tous les stades, avec des offres comparables", () => {
    const tous = depot.tous("appelsOffres");
    expect(new Set(tous.map((a) => a.statut))).toEqual(new Set(["Préparation", "Publié", "Évaluation", "Adjugé"]));
    for (const a of tous.filter((x) => x.statut === "Évaluation" || x.statut === "Adjugé")) {
      expect(a.soumissions.length, a.numero).toBeGreaterThanOrEqual(1);
      expect(a.soumissions.every((s) => a.positions.every((p) => s.prixUnitaires[p.id] > 0)), a.numero).toBe(true);
    }
    expect(tous.filter((a) => a.soumissions.length >= 3).length).toBeGreaterThanOrEqual(4);
  });

  it("montre les réceptions sous leurs trois issues et des garanties à des échéances différentes", () => {
    const receptions = depot.tous("receptions");
    expect(new Set(receptions.map((r) => r.resultat))).toEqual(new Set(["Acceptée", "Acceptée avec réserves", "Refusée"]));
    expect(receptions.every((r) => r.lieu && r.participants && r.avisAchevement)).toBe(true);
    const etats = new Set(echeancesGarantie(receptions, JOUR).map((e) => e.etat));
    expect(etats.has("À vérifier") && etats.has("En cours")).toBe(true);
    const b = bilanReserves(depot.tous("reserves"), JOUR);
    expect(b.ouvertes).toBeGreaterThanOrEqual(8);
    expect(b.levees).toBeGreaterThanOrEqual(6);
    expect(b.bloquantes).toBeGreaterThanOrEqual(1);
  });

  it("tient les journaux de chantier à jour, verrouillés au-delà d'une semaine, et rattache chaque photo", async () => {
    for (const f of FICHES.filter((x) => x.construction?.chantier && !x.construction.chantier.finIlYA)) {
      const journal = de("journalChantier", f.numero);
      expect(joursSansEntree(journal, ajouterJours(JOUR, -6), ajouterJours(JOUR, -1)), f.numero).toEqual([]);
      expect(journal.filter((e) => e.verrouillee).every((e) => e.date < ajouterJours(JOUR, -7))).toBe(true);
    }
    const e = await espacePhotos(depot);
    expect(e.nombre).toBe(depot.tous("constats").length);
    expect(e.orphelines).toEqual([]);
  });

  it("alimente le comité d'investissement et le rapport de clôture", () => {
    const [prochaine, tenue] = serie(depot.tous("seances"), { type: "ComInv" });
    expect(tenue.statut).toBe("Diffusée");
    expect(prochaine.statut).toBe("Planifiée");
    expect(depot.tous("decisions").filter((d) => d.organe === "ComInv").length).toBeGreaterThanOrEqual(4);
    const cloture = de("rapports", "DDE-2023-0034").find((r) => r.type === "Clôture")!;
    expect(cloture.statut).toBe("En revue");
    expect(cloture.sections.every((s) => s.texte.length > 60)).toBe(true);
  });

  it("ne laisse aucune anomalie bloquante dans la qualité des données", () => {
    const bloquantes = controler(depot, depot.tous("projets"), JOUR).filter((a) => a.gravite === "Bloquant");
    expect(bloquantes.map((a) => `${a.objet} : ${a.message}`)).toEqual([]);
  });
});
