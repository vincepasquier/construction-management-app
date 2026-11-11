import { beforeAll, describe, expect, it } from "vitest";
import { journalVisible, lignesAudit } from "./audit";
import { Depot } from "./depot";
import { chargerDemo } from "./initialisation";
import { filtrerJournal } from "./journal";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";

let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot);
  depot.modifier("contrats", "ctr-1", { objet: "Travaux de génie civil – lot 1" });
  depot.modifier("risques", depot.parProjet("risques", "prj-1")[0].id, { probabilite: 5 });
  depot.supprimer("factures", depot.parProjet("factures", "prj-1")[0].id, { motif: "Saisie en double" });
  depot.ajouter("notifications", { id: "n", destinataireId: "per-pmo", date: "2026-11-11", type: "Information", titre: "x", lu: false, canal: "Application" });
  depot.consigner("Export : portefeuille.xlsx");
});

describe("journal d'audit", () => {
  it("donne l'auteur, l'ancienne et la nouvelle valeur, et le motif des suppressions sensibles", () => {
    const admin = depot.acteur();
    const visibles = journalVisible(depot, admin);
    const lignes = lignesAudit(depot, filtrerJournal(visibles, { projetId: "prj-1" }));
    const contrat = lignes.find((l) => l.champ === "objet" && l.type === "Contrat")!;
    expect(contrat).toMatchObject({ auteur: admin!.nom, apres: "Travaux de génie civil – lot 1", projet: "RC601", origine: "saisie" });
    expect(contrat.avant).not.toBe(contrat.apres);
    expect(lignes.find((l) => l.action.startsWith("Suppression") && l.type === "Facture")?.motif).toBe("Saisie en double");
  });

  it("consigne les exports et tait les écritures de service", () => {
    const visibles = journalVisible(depot, depot.acteur());
    expect(visibles.some((e) => e.libelle === "Export : portefeuille.xlsx" && e.irreversible)).toBe(true);
    expect(visibles.some((e) => e.changements.some((c) => c.collection === "notifications"))).toBe(false);
    // Un export consigné ne prend pas la place de la dernière action annulable
    expect(depot.derniereAnnulable()?.changements[0]?.collection).toBe("factures");
  });

  it("ne montre que ce que la personne a le droit de voir", () => {
    // Nadia Perret n'a accès qu'au projet prj-2
    const restreinte = journalVisible(depot, depot.parId("personnes", "per-5"));
    expect(restreinte.some((e) => e.projetId === "prj-1" || e.changements.some((c) => c.projetId === "prj-1"))).toBe(false);
    // Un profil sans accès aux contrats ne voit pas leurs modifications
    const admin = depot.acteur()!;
    const sansContrats = journalVisible(depot, { ...admin, acces: { ...admin.acces!, modules: { contrats: "aucun" } } });
    expect(sansContrats.some((e) => e.changements.some((c) => c.collection === "contrats" || c.collection === "factures"))).toBe(false);
    expect(sansContrats.some((e) => e.changements.some((c) => c.collection === "risques"))).toBe(true);
  });
});
