import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { archiverProjet, chercherDansArchive, construireArchive, controlerArchive, desarchiver, eliminerArchive, finConservation, FORMAT_ARCHIVE, ouvrirArchive } from "./archive";
import { Depot, ErreurDepot } from "./depot";
import { chargerDemo } from "./initialisation";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";

const JOUR = "2026-11-11";
let depot: Depot;
beforeEach(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, jour: JOUR });
});

describe("archivage d'un projet", () => {
  it("écrit un fichier ouvert et documenté : projet, sous-projets, collections, références, journal, manifeste", () => {
    const parent = depot.tous("projets").find((p) => p.numeroSource === "INF-2026-0312")!;
    depot.modifier("projets", parent.id, { lieu: "Quartier des Moulins, secteur nord" });
    const a = construireArchive(depot, parent.id, "2026-11-11T10:00:00.000Z");
    expect(a.format).toBe(FORMAT_ARCHIVE);
    expect(a.description).toContain("manifeste");
    expect(a.projets).toHaveLength(3);
    expect(a.manifeste.projets).toBe(3);
    expect(a.collections.mandats?.length).toBe(3);
    expect((a.collections.decisions?.[0] as unknown as { objet: string }).objet).toContain("centrale de chauffe");
    // La séance du comité ne garde que les points du projet
    expect(a.collections.seances?.[0]).toMatchObject({ type: "ComInv" });
    expect((a.collections.seances![0] as unknown as { points: unknown[] }).points).toHaveLength(1);
    expect(a.references.personnes?.some((p) => p.id === parent.directeurId)).toBe(true);
    expect(a.references.personnes?.every((p) => (p as { acces?: unknown }).acces === undefined)).toBe(true);
    expect(a.journal.some((e) => e.changements.some((c) => c.champs?.some((ch) => ch.chemin === "lieu")))).toBe(true);
  });

  it("scelle l'archive, fige le projet, et la relit intacte", async () => {
    const a = await archiverProjet(depot, "prj-1", { motif: "Projet réceptionné", date: "2026-11-11T10:00:00.000Z" });
    expect(a.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(a.manifeste.contrats).toBe(depot.parProjet("contrats", "prj-1").length);
    expect(depot.parId("projets", "prj-1")?.archive).toMatchObject({ empreinte: a.empreinte });
    // Le projet archivé ne se modifie plus
    expect(() => depot.modifier("contrats", "ctr-1", { objet: "Autre" })).toThrow(ErreurDepot);
    expect(() => depot.ajouter("risques", { ...depot.parProjet("risques", "prj-1")[0], id: "rsk-x" })).toThrow(/archivé/);
    const lu = await ouvrirArchive(depot, a);
    expect(lu.conforme).toBe(true);
    expect(lu.contenu?.projet.code).toBe("RC601");
    expect(depot.journal.at(-1)?.libelle).toBe("Consultation de l'archive RC601");
    expect(chercherDansArchive(lu.contenu!, "giratoire").length).toBeGreaterThan(0);
    expect(chercherDansArchive(lu.contenu!, "zzzz")).toEqual([]);
  });

  it("détecte un fichier altéré ou incomplet lors du contrôle de restaurabilité", async () => {
    const a = await archiverProjet(depot, "prj-1", { date: "2026-11-11T10:00:00.000Z" });
    expect((await controlerArchive(depot, a, "2026-11-12T08:00:00.000Z")).conforme).toBe(true);
    expect(depot.parId("archives", a.id)?.dernierControle).toEqual({ date: "2026-11-12T08:00:00.000Z", conforme: true });
    const f = (await depot.lireFichier(a.fichierId))!;
    const altere = (await f.donnees.text()).replace("RC601", "RC602");
    await depot.ajouterFichier({ ...f, donnees: new Blob([altere], { type: "application/json" }) });
    const r = await controlerArchive(depot, depot.parId("archives", a.id)!);
    expect(r.conforme).toBe(false);
    expect(r.ecarts[0]).toContain("empreinte");
    expect(depot.parId("archives", a.id)?.dernierControle?.conforme).toBe(false);
    await depot.supprimerFichier(a.fichierId);
    expect((await controlerArchive(depot, depot.parId("archives", a.id)!)).ecarts[0]).toContain("introuvable");
  });

  it("désarchive avec un motif, et n'élimine qu'après la durée de conservation", async () => {
    const a = await archiverProjet(depot, "prj-2", { date: "2026-11-11T10:00:00.000Z" });
    expect(finConservation(a, 10)).toBe("2036-11-11");
    await expect(eliminerArchive(depot, a, "Fin de conservation", "2030-01-01")).rejects.toThrow(/conservée jusqu'au 2036-11-11/);
    desarchiver(depot, a, "Reprise des travaux de garantie");
    expect(depot.parId("projets", "prj-2")?.archive).toBeUndefined();
    depot.modifier("projets", "prj-2", { lieu: "Vallon" });
    const b = await archiverProjet(depot, "prj-2", { date: "2026-12-01T10:00:00.000Z" });
    await eliminerArchive(depot, b, "Fin de conservation", "2037-01-01");
    expect(depot.parId("projets", "prj-2")).toBeUndefined();
    expect(depot.parProjet("contrats", "prj-2")).toHaveLength(0);
    expect(depot.parId("archives", b.id)).toBeUndefined();
    expect(await depot.lireFichier(b.fichierId)).toBeUndefined();
  });
});
