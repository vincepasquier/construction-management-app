import { describe, expect, it } from "vitest";
import { donneesDemo } from "../domaine/data/demo";
import { Depot } from "./depot";
import { chargerDemo } from "./initialisation";
import { creerSauvegarde, lireSauvegarde, restaurerSauvegarde } from "./sauvegarde";
import { strToU8 } from "fflate";
import { StockageMemoire } from "./stockage";

describe("sauvegarde et restauration", () => {
  it("restitue la base à l'identique, photographies comprises", async () => {
    const d = new Depot(new StockageMemoire());
    await d.ouvrir();
    await chargerDemo(d);
    await d.ajouterFichier({ id: "ph-1", nom: "constat.jpg", type: "image/jpeg", taille: 4, projetId: "prj-1", donnees: new Blob([new Uint8Array([1, 2, 3, 4])]) });
    const zip = await creerSauvegarde(d, "2026-11-11T12:00:00.000Z");

    const lue = lireSauvegarde(zip);
    expect(lue.resume).toMatchObject({ type: "prism", projets: 11, fichiers: 1 });
    if (lue.type !== "prism") throw new Error("type inattendu");

    const d2 = new Depot(new StockageMemoire());
    await d2.ouvrir();
    await restaurerSauvegarde(d2, lue);
    expect(d2.exporter().docs).toEqual(d.exporter().docs);
    expect(d2.journal).toEqual(d.journal);
    const photo = await d2.lireFichier("ph-1");
    expect(new Uint8Array(await photo!.donnees.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("reconnaît un export Chantier+ et refuse un fichier étranger", () => {
    expect(lireSauvegarde(strToU8(JSON.stringify(donneesDemo()))).resume).toMatchObject({ type: "chantier-plus", projets: 2 });
    expect(() => lireSauvegarde(strToU8("bonjour"))).toThrow(/illisible/);
    expect(() => lireSauvegarde(strToU8('{"a":1}'))).toThrow(/non reconnu/);
  });
});
