import { beforeEach, describe, expect, it } from "vitest";
import { nouvelId } from "../domaine/lib/id";
import { creerCommentaire, extraireMentions, modifierCommentaire } from "../domaine/socle/collaboration";
import { contenuInitial, creerMandat, soumettre } from "../domaine/socle/mandat";
import { Depot } from "./depot";
import { chargerDemo } from "./initialisation";
import { brancherNotifications, clePreferences, rappelsDuJour } from "./notifications";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";

let depot: Depot;
const notifs = (id: string) => depot.tous("notifications").filter((n) => n.destinataireId === id);

beforeEach(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot);
  brancherNotifications(depot);
});

describe("commentaires et mentions", () => {
  const personnes = [{ id: "a", nom: "Anne Martin" }, { id: "b", nom: "Anne" }, { id: "c", nom: "Luc Favre" }];
  it("repère les personnes mentionnées, sans confondre un nom et son préfixe", () => {
    expect(extraireMentions("Merci @Anne Martin, et @luc favre pour la suite", personnes)).toEqual(["a", "c"]);
    expect(extraireMentions("@Anne seule, puis @Anne Martin", personnes)).toEqual(["b", "a"]);
    expect(extraireMentions("@Annette n'est personne", personnes)).toEqual([]);
    expect(extraireMentions("Sans mention, anne@exemple.ch", personnes)).toEqual([]);
  });
  it("garde l'historique d'un commentaire modifié et ne mentionne pas son auteur", () => {
    const c = creerCommentaire({ id: "c1", cible: { collection: "risques", id: "r1" }, texte: " @Luc Favre peux-tu confirmer ? @Anne Martin ", auteurId: "a", date: "2026-11-01T10:00:00Z" }, personnes);
    // L'auteur (Anne Martin) se mentionne lui-même : il n'est pas retenu
    expect(c.mentions).toEqual(["c"]);
    const m = modifierCommentaire(c, "@Luc Favre : confirmé.", "2026-11-02T08:00:00Z", personnes);
    expect(m).toMatchObject({ texte: "@Luc Favre : confirmé.", modifieLe: "2026-11-02T08:00:00Z", mentions: ["c"] });
    expect(m.historique).toEqual([{ date: "2026-11-01T10:00:00Z", texte: c.texte }]);
    expect(modifierCommentaire(m, m.texte, "2026-11-03T00:00:00Z", personnes)).toBe(m);
  });
});

describe("moteur de notifications", () => {
  it("prévient la personne mentionnée, sur les canaux de ses préférences, sans contenu hors de l'application", () => {
    const personnes = depot.tous("personnes");
    depot.ajouter("commentaires", creerCommentaire({ id: "c1", projetId: "prj-1", cible: { collection: "risques", id: "rsk-1" }, texte: "@Hélène Marchand : le montant de 180'000 est-il confirmé ?", auteurId: depot.acteurId, date: new Date().toISOString() }, personnes));
    const recues = notifs("per-pmo");
    expect(recues.map((n) => n.canal).sort()).toEqual(["Application", "Teams (simulé)"]);
    expect(recues.find((n) => n.canal === "Application")).toMatchObject({ type: "Mention", lien: "/projets/prj-1/risques", lu: false });
    expect(recues.find((n) => n.canal === "Teams (simulé)")?.texte).toBeUndefined();
    // Les notifications ne s'annulent pas et n'apparaissent pas comme une action de l'utilisateur
    expect(depot.derniereAnnulable()?.changements[0]?.collection).toBe("commentaires");
  });

  it("respecte les préférences et ne notifie pas l'auteur de l'action", () => {
    depot.ecrireMeta(clePreferences("per-pmo"), { Mention: ["Application"] });
    depot.ajouter("commentaires", creerCommentaire({ id: "c2", cible: { collection: "projets", id: "prj-1" }, projetId: "prj-1", texte: `@Hélène Marchand et @${depot.acteur()!.nom}`, auteurId: depot.acteurId, date: new Date().toISOString() }, depot.tous("personnes")));
    expect(notifs("per-pmo")).toHaveLength(1);
    expect(notifs(depot.acteurId!)).toHaveLength(0);
  });

  it("prévient les signataires d'un mandat soumis, puis à chaque relance", () => {
    const projet = depot.tous("projets").find((p) => p.code === "NUM-2026-0021")!;
    const personnes = depot.tous("personnes");
    const contenu = contenuInitial(projet, { auteur: depot.acteur(), sponsor: personnes.find((p) => p.id === "per-pmo"), chef: personnes.find((p) => p.id === "per-dubois"), budget: 250_000 });
    Object.assign(contenu, { benefices: "x", impactsEnvironnementaux: "Aucun", impactsSociaux: "x", motifs: { ...contenu.motifs, efficience: true }, objectifs: [{ id: "o", objectif: "x", critere: "y", approbateur: "" }], ressources: [{ id: "r", provenance: "x", joursHommes: 10, confirmee: true }], phases: contenu.phases.map((p) => (p.applicable ? { ...p, debut: "2026-12-01", fin: "2027-06-01" } : p)) });
    const m = creerMandat(projet.id, contenu, { id: nouvelId("man"), date: "2026-11-01", auteurId: depot.acteurId });
    depot.ajouter("mandats", m);
    expect(notifs("per-dubois")).toHaveLength(0);
    depot.modifier("mandats", m.id, soumettre(m, personnes, "2026-11-02"));
    expect(notifs("per-dubois").filter((n) => n.type === "Signature" && n.canal === "Application")).toHaveLength(1);
    expect(notifs("per-pmo").some((n) => n.titre.includes("Mandat à signer"))).toBe(true);
  });

  it("prévient le validateur dont c'est le tour et la personne à qui une tâche est attribuée", () => {
    depot.ajouter("actions", { id: "act-x", projetId: "prj-1", titre: "Relancer l'entreprise", assigneId: "per-fin", priorite: "Normale", statut: "À faire", dateCreation: "2026-11-01" });
    expect(notifs("per-fin").filter((n) => n.type === "Tâche" && n.canal === "Application")).toHaveLength(1);
    depot.ajouter("validations", { id: "val-x", projetId: "prj-1", titre: "Plan d'exécution", objet: { type: "Document" }, version: 1, demandeurId: depot.acteurId!, statut: "En cours", dateCreation: "2026-11-01", historique: [], mode: "parallele", etapes: [{ id: "e1", personneId: "per-fin", statut: "En attente" }, { id: "e2", personneId: "per-pmo", statut: "En attente" }] });
    expect(notifs("per-fin").filter((n) => n.type === "Validation" && n.canal === "Application")).toHaveLength(1);
    expect(notifs("per-pmo").filter((n) => n.type === "Validation" && n.canal === "Application")).toHaveLength(1);
  });

  it("n'émet les rappels d'échéance qu'une fois par jour", () => {
    depot.ajouter("actions", { id: "act-y", projetId: "prj-1", titre: "Remettre le rapport", assigneId: "per-fin", priorite: "Normale", statut: "À faire", dateCreation: "2026-11-01", echeance: "2026-11-11" });
    const avant = notifs("per-fin").length;
    expect(rappelsDuJour(depot, "2026-11-11")).toBeGreaterThan(0);
    expect(rappelsDuJour(depot, "2026-11-11")).toBe(0);
    expect(notifs("per-fin").length).toBeGreaterThan(avant);
  });
});
