import { beforeEach, describe, expect, it } from "vitest";
import { dimensionsReduites, formatTaille } from "../outils/photo";
import { Depot } from "./depot";
import { ajouterPhoto, espacePhotos, photosReferencees, purgerPhotosOrphelines, supprimerPhotosDesProjets } from "./photos";
import { StockageMemoire } from "./stockage";

let depot: Depot;
beforeEach(async () => {
  depot = new Depot(new StockageMemoire());
  await depot.ouvrir();
});
const image = (octets = 100) => new Blob([new Uint8Array(octets)], { type: "image/jpeg" });

describe("réduction des photos", () => {
  it("garde les proportions et n'agrandit jamais", () => {
    expect(dimensionsReduites(4000, 3000)).toEqual({ largeur: 1600, hauteur: 1200 });
    expect(dimensionsReduites(3000, 4000)).toEqual({ largeur: 1200, hauteur: 1600 });
    expect(dimensionsReduites(800, 600)).toEqual({ largeur: 800, hauteur: 600 });
  });
  it("écrit les tailles lisiblement", () => {
    expect(formatTaille(512)).toBe("512 o");
    expect(formatTaille(300 * 1024)).toBe("300 Ko");
    expect(formatTaille(2.5 * 1024 * 1024)).toBe("2,5 Mo");
  });
});

describe("magasin de photos", () => {
  it("range une photo et la retrouve", async () => {
    const id = await ajouterPhoto(depot, image(250), "p1");
    const f = await depot.lireFichier(id);
    expect(f).toMatchObject({ projetId: "p1", taille: 250, type: "image/jpeg" });
  });

  it("distingue les photos citées des photos orphelines, et ne purge que celles-ci", async () => {
    const citee = await ajouterPhoto(depot, image(), "p1");
    const reserve = await ajouterPhoto(depot, image(), "p1");
    const orpheline = await ajouterPhoto(depot, image(40), "p1");
    await ajouterPhoto(depot, image(), "p2");
    depot.ajouter("constats", { id: "c1", projetId: "p1", numero: "CT-001", date: "2026-09-01", type: "Qualité", titre: "Enrobage", description: "", photos: [{ fichierId: citee }] }, { origine: "systeme" });
    depot.ajouter("reserves", { id: "r1", projetId: "p1", numero: "R-001", libelle: "Fissure", gravite: "Mineure", statut: "Ouverte", dateConstat: "2026-09-01", photos: [reserve] }, { origine: "systeme" });
    expect(photosReferencees(depot)).toEqual(new Set([citee, reserve]));
    const e = await espacePhotos(depot, "p1");
    expect(e.nombre).toBe(3);
    expect(e.octets).toBe(240);
    expect(e.orphelines.map((f) => f.id)).toEqual([orpheline]);
    expect(await purgerPhotosOrphelines(depot, "p1")).toBe(1);
    expect(await depot.lireFichier(orpheline)).toBeUndefined();
    expect(await depot.lireFichier(citee)).toBeDefined();
    // La photo de l'autre projet n'est pas touchée par une purge limitée au projet
    expect((await espacePhotos(depot)).nombre).toBe(3);
  });

  it("supprime les photos d'un projet éliminé, pas celles des autres ni les archives", async () => {
    await ajouterPhoto(depot, image(), "p1");
    const autre = await ajouterPhoto(depot, image(), "p2");
    await depot.ajouterFichier({ id: "archive-a1", nom: "a.json", type: "application/json", taille: 2, projetId: "p1", donnees: new Blob(["{}"]) });
    expect(await supprimerPhotosDesProjets(depot, ["p1"])).toBe(1);
    expect((await depot.listerFichiers()).map((f) => f.id).sort()).toEqual(["archive-a1", autre].sort());
  });
});
