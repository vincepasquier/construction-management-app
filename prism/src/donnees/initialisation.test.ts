import { beforeEach, describe, expect, it } from "vitest";
import { donneesDemo } from "../domaine/data/demo";
import { calculerBudget, totaux } from "../domaine/lib/budget";
import { dataPlatformSimulee } from "./connecteurs/dataPlatformSimulee";
import { importerProjet, leverSurcharge, NumeroInconnu, origineChamp, surcharger, synchroniser } from "./connecteurs/synchro";
import { Depot } from "./depot";
import { chargerDemo, demarrerVide, installerReferentiels, reprendreChantierPlus } from "./initialisation";
import { autoriser, REGLES } from "./regles";
import { lireChantierPlus } from "./reprise";
import { session } from "./session";
import { StockageMemoire } from "./stockage";

async function nouveau() {
  const depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  return depot;
}

beforeEach(() => session.ecrire({ utilisateurId: null }));

describe("initialisation de la base", () => {
  it("charge la démonstration : projets de construction, projets de la source et sous-projets", async () => {
    const d = await nouveau();
    await chargerDemo(d);
    const projets = d.tous("projets");
    expect(projets).toHaveLength(11);
    expect(projets.filter((p) => p.typeProjetId === "construction").length).toBeGreaterThanOrEqual(5);
    const parent = projets.find((p) => p.numeroSource === "INF-2026-0312")!;
    expect(projets.filter((p) => p.parentId === parent.id)).toHaveLength(2);
    expect(d.tous("relevesSource")).toHaveLength(11);
    expect(d.tous("typesProjet").length).toBeGreaterThan(2);
    expect(d.acteur()?.acces?.profil).toBe("Administrateur");
    expect(d.tous("executionsSynchro")).toHaveLength(1);
  });

  it("démarre à vide avec un administrateur et les référentiels", async () => {
    const d = await nouveau();
    demarrerVide(d, "Camille Exemple");
    expect(d.tous("projets")).toHaveLength(0);
    expect(d.acteur()?.nom).toBe("Camille Exemple");
    expect(d.parId("configurations", "courante")).toBeDefined();
  });
});

describe("source simulée et synchronisation", () => {
  it("ajoute un projet par son numéro, refuse un numéro inconnu et ne duplique pas", async () => {
    const d = await nouveau();
    installerReferentiels(d);
    await expect(importerProjet(d, dataPlatformSimulee, "XX-0000")).rejects.toBeInstanceOf(NumeroInconnu);
    const p = await importerProjet(d, dataPlatformSimulee, "ENR-2025-0098", "2026-11-11T08:00:00.000Z");
    expect(p).toMatchObject({ code: "ENR-2025-0098", typeProjetId: "investissement", directionId: "dir-enr" });
    expect(origineChamp(p, "nom")).toBe("source");
    expect(origineChamp(p, "lieu")).toBe("saisie");
    await importerProjet(d, dataPlatformSimulee, "enr-2025-0098", "2026-11-11T08:00:00.000Z");
    expect(d.tous("projets")).toHaveLength(1);
    expect(d.tous("facturesSource").length).toBeGreaterThan(2);
  });

  it("est idempotente à date égale et fait avancer le réalisé à une date ultérieure", async () => {
    const d = await nouveau();
    installerReferentiels(d);
    const p = await importerProjet(d, dataPlatformSimulee, "ENR-2025-0098", "2026-06-01T08:00:00.000Z");
    const r1 = d.parId("relevesSource", `rel-${p.id}`)!.realise;
    const meme = await synchroniser(d, dataPlatformSimulee, { horodatage: "2026-06-01T09:00:00.000Z" });
    expect(meme).toMatchObject({ lus: 1, modifies: 0, crees: 0, statut: "Réussie" });
    const plusTard = await synchroniser(d, dataPlatformSimulee, { horodatage: "2026-11-01T09:00:00.000Z" });
    expect(plusTard.modifies + plusTard.crees).toBeGreaterThan(0);
    expect(d.parId("relevesSource", `rel-${p.id}`)!.realise).toBeGreaterThan(r1);
    expect(d.tous("executionsSynchro")).toHaveLength(2);
  });

  it("conserve une correction locale jusqu'à ce qu'elle soit levée", async () => {
    const d = await nouveau();
    installerReferentiels(d);
    const p = await importerProjet(d, dataPlatformSimulee, "NUM-2026-0021", "2026-11-11T08:00:00.000Z");
    surcharger(d, p.id, "nom", "PRISM", "Nom de travail du projet");
    await synchroniser(d, dataPlatformSimulee, { horodatage: "2026-12-11T08:00:00.000Z" });
    const apres = d.parId("projets", p.id)!;
    expect(apres.nom).toBe("PRISM");
    expect(origineChamp(apres, "nom")).toBe("saisie");
    expect(apres.synchro?.surcharges?.nom).toMatchObject({ valeurSource: "Plateforme de pilotage des projets", motif: "Nom de travail du projet" });
    leverSurcharge(d, p.id, "nom");
    expect(d.parId("projets", p.id)!.nom).toBe("Plateforme de pilotage des projets");
  });
});

describe("reprise de Chantier+", () => {
  it("reconnaît le stockage du navigateur et un fichier exporté", () => {
    const etat = donneesDemo();
    expect(lireChantierPlus(JSON.stringify({ state: { ...etat, utilisateurId: "per-1" }, version: 6 }))).toMatchObject({ utilisateurId: "per-1", version: 6 });
    expect(lireChantierPlus(etat)?.donnees.projets).toHaveLength(2);
    expect(lireChantierPlus("pas du json")).toBeNull();
    expect(lireChantierPlus({ autre: 1 })).toBeNull();
  });

  it("reprend toutes les collections et donne les mêmes totaux financiers qu'à l'origine", async () => {
    const origine = donneesDemo();
    const d = await nouveau();
    const rapport = reprendreChantierPlus(d, { donnees: JSON.parse(JSON.stringify(origine)), utilisateurId: "per-2" });
    expect(rapport.projets).toBe(2);
    expect(d.acteur()).toMatchObject({ id: "per-2", acces: { profil: "Administrateur" } });
    for (const projetId of ["prj-1", "prj-2"]) {
      const par = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId === projetId);
      const avant = totaux(calculerBudget({
        budget: par(origine.budget), lots: par(origine.lots), contrats: par(origine.contrats), factures: par(origine.factures),
        facturesHorsCommande: par(origine.facturesHorsCommande), offres: par(origine.offres), ajustements: par(origine.ajustements),
        mutations: par(origine.mutations), appelsOffres: par(origine.appelsOffres),
      }));
      const apres = totaux(calculerBudget({
        budget: d.parProjet("budget", projetId), lots: d.parProjet("lots", projetId), contrats: d.parProjet("contrats", projetId),
        factures: d.parProjet("factures", projetId), facturesHorsCommande: d.parProjet("facturesHorsCommande", projetId),
        offres: d.parProjet("offres", projetId), ajustements: d.parProjet("ajustements", projetId), mutations: d.parProjet("mutations", projetId),
        appelsOffres: d.parProjet("appelsOffres", projetId),
      }));
      expect(apres).toEqual(avant);
      expect(apres.atterrissage).toBeGreaterThan(0);
    }
    expect(d.parId("projets", "prj-1")).toMatchObject({ typeProjetId: "construction", statut: "En cours" });
    expect(d.tous("clotures").length).toBe(origine.clotures.length);
  });
});

describe("suppression d'un projet", () => {
  it("retire le projet, ses sous-projets et toutes leurs données, mandat signé compris", async () => {
    const { Depot } = await import("./depot");
    const { StockageMemoire } = await import("./stockage");
    const { REGLES, autoriser } = await import("./regles");
    const { chargerDemo, supprimerProjet } = await import("./initialisation");
    const depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
    await depot.ouvrir();
    await chargerDemo(depot, { gouvernance: true, jour: "2026-11-11" });
    const parent = depot.tous("projets").find((p) => p.numeroSource === "INF-2026-0312")!;
    const avant = depot.tous("projets").length;
    expect(depot.parProjet("mandats", parent.id)[0].statut).toBe("Signé");
    expect(() => supprimerProjet(depot, parent.id, "")).toThrow(/motif/i);
    expect(depot.tous("projets")).toHaveLength(avant);
    const n = supprimerProjet(depot, parent.id, "Projet abandonné, saisi par erreur");
    expect(n).toBeGreaterThan(10);
    expect(depot.tous("projets")).toHaveLength(avant - 3);
    expect(depot.parProjet("mandats", parent.id)).toHaveLength(0);
    expect(depot.journal.at(-1)).toMatchObject({ motif: "Projet abandonné, saisi par erreur" });
  });
});
