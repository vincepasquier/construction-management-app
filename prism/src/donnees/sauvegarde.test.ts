import { lireChantierPlus } from "./reprise";
import { describe, expect, it } from "vitest";
import { donneesDemo } from "../domaine/data/demo";
import { Depot } from "./depot";
import { chargerDemo } from "./demo/charger";
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
    // Fichier de projet ou de sauvegarde Chantier+ : les données sont sous « donnees »
    const fichierProjet = { format: "chantier-plus", version: 1, date: "2026-10-01", donnees: donneesDemo() };
    const lue = lireSauvegarde(strToU8(JSON.stringify(fichierProjet)));
    expect(lue.resume).toMatchObject({ type: "chantier-plus", projets: 2 });
    expect(lireChantierPlus((lue as { brut: unknown }).brut)?.donnees.contrats?.length).toBe(donneesDemo().contrats.length);
    // État du navigateur
    expect(lireChantierPlus({ state: { ...donneesDemo(), utilisateurId: "per-1" }, version: 6 })).toMatchObject({ utilisateurId: "per-1", version: 6 });
    // Session de l'ancienne application de suivi financier
    const session = { sessionName: "Essai", data: { estimations: [], offres: [], commandes: [], factures: [] } };
    expect(lireSauvegarde(strToU8(JSON.stringify(session))).resume).toMatchObject({ type: "chantier-plus", projets: 1 });
    expect(() => lireSauvegarde(strToU8(JSON.stringify({ rien: true })))).toThrow(/non reconnu/);
    expect(() => lireSauvegarde(strToU8("bonjour"))).toThrow(/illisible/);
    expect(() => lireSauvegarde(strToU8('{"a":1}'))).toThrow(/non reconnu/);
  });
});
