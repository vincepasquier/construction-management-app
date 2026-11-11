import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { Contrat, Personne, Projet } from "../domaine/types";
import { Depot, ErreurDepot } from "./depot";
import { detailler } from "./diff";
import { filtrerJournal } from "./journal";
import { autoriser, REGLES } from "./regles";
import { StockageMemoire, type Stockage } from "./stockage";
import { StockageIndexedDB } from "./stockageIndexedDB";

const projet = (id: string, extra: Partial<Projet> = {}): Projet => ({
  id, code: id.toUpperCase(), nom: `Projet ${id}`, maitreOuvrage: "", lieu: "", phase: "31 Avant-projet",
  dateDebut: "2026-01-01", dateFin: "2027-01-01", tauxTVA: 8.1, couleur: "#000", description: "", ...extra,
});
const personne = (id: string, acces: Personne["acces"]): Personne => ({ id, nom: id, role: "Ingénieur", email: "", organisation: "", capacite: 100, acces });
const contrat = (id: string, projetId: string): Contrat => ({
  id, projetId, numero: `C-${id}`, entrepriseId: "e1", cfc: "211", objet: "Gros œuvre", type: "Contrat d'entreprise",
  montantInitial: 100_000, dateSignature: "2026-02-01", retenuePct: 10, statut: "Signé", avenants: [],
});

async function nouveau(stockage: Stockage = new StockageMemoire()) {
  let t = 0;
  const depot = new Depot(stockage, { autoriser, regles: REGLES, horloge: () => `2026-11-11T10:00:${String(t++).padStart(2, "0")}.000Z` });
  await depot.ouvrir();
  return depot;
}

describe("dépôt : écritures et journal d'audit", () => {
  it("journalise la création, la modification (ancienne et nouvelle valeur) et la suppression", async () => {
    const d = await nouveau();
    d.acteurId = "admin";
    d.ajouter("projets", projet("p1"));
    d.modifier("projets", "p1", { nom: "Nouvelle step", lieu: "Fribourg" });
    d.supprimer("projets", "p1", { motif: "Créé par erreur" });
    expect(d.journal.map((e) => e.changements[0].op)).toEqual(["creer", "modifier", "supprimer"]);
    expect(d.journal[1].changements[0].champs).toEqual([
      { chemin: "nom", avant: "Projet p1", apres: "Nouvelle step" },
      { chemin: "lieu", avant: "", apres: "Fribourg" },
    ]);
    expect(d.journal[2]).toMatchObject({ motif: "Créé par erreur", acteurId: "admin" });
    expect(d.journal[2].changements[0].avant).toMatchObject({ id: "p1", nom: "Nouvelle step" });
    expect(d.tous("projets")).toHaveLength(0);
  });

  it("n'écrit rien quand la modification ne change aucune valeur", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.modifier("projets", "p1", { nom: "Projet p1" });
    expect(d.journal).toHaveLength(1);
  });

  it("renvoie des tableaux stables tant que la collection ne change pas", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    const avant = d.parProjet("contrats", "p1");
    d.modifier("projets", "p1", { lieu: "Bulle" });
    expect(d.parProjet("contrats", "p1")).toBe(avant);
    d.ajouter("contrats", contrat("c2", "p2"));
    expect(d.parProjet("contrats", "p1")).toBe(avant);
    d.ajouter("contrats", contrat("c3", "p1"));
    expect(d.parProjet("contrats", "p1")).not.toBe(avant);
    expect(d.parProjet("contrats", "p1")).toHaveLength(2);
  });

  it("détaille les changements dans les listes imbriquées", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    d.modifier("contrats", "c1", { avenants: [{ id: "av1", numero: "1", date: "2026-03-01", objet: "Fouille", montant: 5000, statut: "Demandé" }] });
    d.modifier("contrats", "c1", { avenants: [{ id: "av1", numero: "1", date: "2026-03-01", objet: "Fouille", montant: 5000, statut: "Approuvé" }] });
    const champ = d.journal.at(-1)!.changements[0].champs![0];
    expect(detailler(champ)).toEqual([{ chemin: "avenants[av1].statut", avant: "Demandé", apres: "Approuvé" }]);
  });
});

describe("dépôt : droits et règles", () => {
  it("refuse l'écriture sans droit sur le module ou hors périmètre, sans laisser de trace", async () => {
    const d = await nouveau();
    d.ajouter("personnes", personne("lecteur", { profil: "Lecture seule", projets: "tous", modules: {} }), { origine: "systeme" });
    d.ajouter("personnes", personne("chef", { profil: "Directeur de projet", projets: ["p1"], modules: {} }), { origine: "systeme" });
    d.ajouter("projets", projet("p1"), { origine: "systeme" });
    d.ajouter("projets", projet("p2"), { origine: "systeme" });
    const n = d.journal.length;

    d.acteurId = "lecteur";
    expect(() => d.modifier("projets", "p1", { nom: "x" })).toThrow(ErreurDepot);
    d.acteurId = "chef";
    expect(() => d.ajouter("contrats", contrat("c9", "p2"))).toThrow(/profil/);
    expect(d.journal).toHaveLength(n);
    expect(d.parId("projets", "p1")?.nom).toBe("Projet p1");

    d.ajouter("contrats", contrat("c1", "p1"));
    expect(d.tous("contrats")).toHaveLength(1);
  });

  it("masque un projet confidentiel au-delà du niveau autorisé", async () => {
    const d = await nouveau();
    d.ajouter("personnes", personne("collab", { profil: "Collaborateur", projets: "tous", modules: {} }), { origine: "systeme" });
    d.ajouter("projets", projet("secret", { confidentialite: "Confidentiel" }), { origine: "systeme" });
    d.acteurId = "collab";
    expect(() => d.ajouter("actions", { id: "a1", projetId: "secret", titre: "t", priorite: "Normale", statut: "À faire", dateCreation: "2026-01-01" })).toThrow(/profil/);
  });

  it("exige un motif pour supprimer une donnée sensible", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    expect(() => d.supprimer("contrats", "c1")).toThrow(/motif/);
    d.supprimer("contrats", "c1", { motif: "Doublon" });
    expect(d.tous("contrats")).toHaveLength(0);
  });

  it("fige un projet archivé", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.modifier("projets", "p1", { archive: { date: "2026-11-11", empreinte: "abc" } });
    expect(() => d.ajouter("contrats", contrat("c1", "p1"))).toThrow(/archivé/);
    d.modifier("projets", "p1", { archive: undefined });
    d.ajouter("contrats", contrat("c1", "p1"));
  });
});

describe("dépôt : groupes et annulation", () => {
  it("regroupe plusieurs écritures en une entrée et les défait toutes en cas d'échec", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.grouper("Adjudication", () => {
      d.ajouter("contrats", contrat("c1", "p1"));
      d.modifier("projets", "p1", { lieu: "Morat" });
    });
    expect(d.journal).toHaveLength(2);
    expect(d.journal[1]).toMatchObject({ libelle: "Adjudication" });
    expect(d.journal[1].changements).toHaveLength(2);

    expect(() => d.grouper("Échec", () => {
      d.ajouter("contrats", contrat("c2", "p1"));
      d.modifier("projets", "p1", { lieu: "Bulle" });
      d.ajouter("contrats", contrat("c1", "p1"));
    })).toThrow(/existe déjà/);
    expect(d.tous("contrats")).toHaveLength(1);
    expect(d.parId("projets", "p1")?.lieu).toBe("Morat");
    expect(d.journal).toHaveLength(2);
  });

  it("annule une entrée, journalise l'annulation et refuse si la donnée a changé depuis", async () => {
    const d = await nouveau();
    d.acteurId = undefined;
    d.ajouter("projets", projet("p1"));
    const e = d.grouper("Adjudication", () => {
      d.ajouter("contrats", contrat("c1", "p1"));
      d.modifier("projets", "p1", { lieu: "Morat" });
      return d;
    });
    expect(e).toBe(d);
    expect(d.derniereAnnulable()?.libelle).toBe("Adjudication");
    d.annuler(d.journal[1].seq);
    expect(d.tous("contrats")).toHaveLength(0);
    expect(d.parId("projets", "p1")?.lieu).toBe("");
    expect(d.journal[1].annuleePar).toBe(d.journal[2].seq);
    expect(d.derniereAnnulable()?.libelle).toBe("Création : P1 · Projet p1");
    expect(() => d.annuler(d.journal[1].seq)).toThrow(/déjà été annulée/);

    d.modifier("projets", "p1", { nom: "A" });
    const seq = d.journal.at(-1)!.seq;
    d.modifier("projets", "p1", { nom: "B" });
    expect(() => d.annuler(seq)).toThrow(/modifié depuis/);
  });

  it("filtre le journal par objet et par projet", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    d.ajouter("projets", projet("p2"));
    expect(filtrerJournal(d.journal, { projetId: "p1" })).toHaveLength(2);
    expect(filtrerJournal(d.journal, { collection: "contrats", id: "c1" })).toHaveLength(1);
    expect(filtrerJournal(d.journal, { texte: "gros" })).toHaveLength(1);
  });
});

describe("dépôt : persistance", () => {
  it("retrouve données, journal et réglages après réouverture (IndexedDB)", async () => {
    const fabrique = new IDBFactory();
    const d = await nouveau(new StockageIndexedDB("test", fabrique));
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    d.modifier("contrats", "c1", { statut: "En cours" });
    d.supprimer("projets", "p1", { motif: "test" });
    d.ecrireMeta("sharePoint", { hostname: "exemple.sharepoint.com" });
    await d.ajouterFichier({ id: "f1", nom: "photo.jpg", type: "image/jpeg", taille: 3, donnees: new Blob(["abc"]) });
    await d.attendrePersistance();

    const d2 = await nouveau(new StockageIndexedDB("test", fabrique));
    expect(d2.tous("projets")).toHaveLength(0);
    expect(d2.parId("contrats", "c1")?.statut).toBe("En cours");
    expect(d2.journal).toHaveLength(4);
    expect(d2.lireMeta("sharePoint", {})).toEqual({ hostname: "exemple.sharepoint.com" });
    expect((await d2.listerFichiers()).map((f) => f.nom)).toEqual(["photo.jpg"]);
    d2.ajouter("projets", projet("p3"));
    expect(d2.journal.at(-1)!.seq).toBe(5);
  });

  it("ne conserve que les volumes d'une écriture de masse", async () => {
    const d = await nouveau();
    d.executer({ libelle: "Import", origine: "import", sansDetail: true, operations: [1, 2, 3].map((i) => ({ op: "creer" as const, collection: "projets" as const, valeur: projet(`p${i}`) })) });
    expect(d.journal[0]).toMatchObject({ volumes: { crees: 3, modifies: 0, supprimes: 0 }, changements: [], irreversible: true });
  });

  it("exporte puis restaure la base à l'identique", async () => {
    const d = await nouveau();
    d.ajouter("projets", projet("p1"));
    d.ajouter("contrats", contrat("c1", "p1"));
    const copie = JSON.parse(JSON.stringify(d.exporter()));
    const d2 = await nouveau();
    await d2.remplacer(copie);
    expect(d2.exporter()).toEqual(d.exporter());
  });
});
