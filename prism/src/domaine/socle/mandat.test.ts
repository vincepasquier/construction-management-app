import { describe, expect, it } from "vitest";
import type { Personne, Projet } from "../types";
import { contenuInitial, creerMandat, empreinte, integre, mandatEnVigueur, manques, nouvelleVersion, refuser, relancer, signer, soumettre } from "./mandat";
import type { ContenuMandat } from "./types";

const projet: Projet = { id: "p1", code: "NUM-1", nom: "Plateforme de pilotage", maitreOuvrage: "", lieu: "", phase: "11 Énoncé des besoins", dateDebut: "2026-12-01", dateFin: "2027-09-30", tauxTVA: 8.1, couleur: "#000", description: "Outil commun de pilotage des projets.", classification: "Renouvellement" };
const personne = (id: string, nom: string): Personne => ({ id, nom, role: "Directeur de projet", organisation: "", email: "", capacite: 100 });
const personnes = [personne("a", "Amélie Dubois"), personne("b", "Isabelle Roten")];

function complet(): ContenuMandat {
  const c = contenuInitial(projet, { auteur: personnes[0], chef: personnes[0], sponsor: personnes[1], budget: 250_000 });
  c.motifs.efficience = true;
  c.benefices = "Moins de ressaisies."; c.impactsEnvironnementaux = "Aucun"; c.impactsSociaux = "Positif";
  c.objectifs = [{ id: "o1", objectif: "Outil adapté aux métiers", critere: "Deux directions pilotes l'utilisent", approbateur: "Sponsor" }];
  c.phases = c.phases.map((p) => (p.applicable ? { ...p, debut: "2026-12-01", fin: "2027-02-01" } : p));
  c.ressources = [{ id: "r1", provenance: "Chefferie de projet", joursHommes: 70, confirmee: true }];
  return c;
}

describe("mandat de projet", () => {
  it("préremplit le contenu depuis la fiche du projet", () => {
    const c = contenuInitial(projet, { chef: personnes[0], sponsor: personnes[1], budget: 250_000.4 });
    expect(c).toMatchObject({ nomProjet: "Plateforme de pilotage", chefProjet: "Amélie Dubois", commanditaire: "Isabelle Roten", budget: 250_000 });
    expect(c.motifs.maintenance).toBe(true);
    expect(c.phases.filter((p) => p.applicable).map((p) => p.phase)).toEqual(["Définition des objectifs", "Étude du projet", "Réalisation"]);
  });

  it("liste les rubriques obligatoires manquantes et refuse de soumettre un mandat incomplet", () => {
    const vide = contenuInitial(projet);
    expect(manques(vide).map((m) => m.cle)).toEqual(expect.arrayContaining(["auteur", "commanditaire", "chefProjet", "benefices", "objectifs", "impacts", "budget", "ressources", "phase-Réalisation"]));
    expect(() => soumettre(creerMandat("p1", vide, { date: "2026-11-01" }), personnes, "2026-11-02")).toThrow(/incomplet/);
    expect(manques(complet())).toEqual([]);
    const inverse = complet();
    inverse.phases[0] = { ...inverse.phases[0], debut: "2027-01-01", fin: "2026-12-01" };
    expect(manques(inverse).map((m) => m.cle)).toContain("phases");
  });

  it("recueille les signatures et fige le mandat à la dernière", () => {
    let m = soumettre(creerMandat("p1", complet(), { date: "2026-11-01" }), personnes, "2026-11-02");
    expect(m.statut).toBe("Soumis");
    expect(m.signatures.map((s) => s.role)).toEqual(["Commanditaire", "Chef de projet"]);
    expect(m.signatures[0].personneId).toBe("b");
    m = relancer(m, "Commanditaire", "2026-11-09");
    m = signer(m, "Chef de projet", "2026-11-03");
    expect(m.statut).toBe("Soumis");
    m = signer(m, "Commanditaire", "2026-11-10");
    expect(m).toMatchObject({ statut: "Signé", decision: "Autorisé" });
    expect(m.signatures[0].relances).toEqual(["2026-11-09"]);
    expect(integre(m)).toBe(true);
    expect(integre({ ...m, contenu: { ...m.contenu, budget: 1 } })).toBe(false);
    expect(() => signer(m, "Commanditaire", "2026-11-11")).toThrow();
  });

  it("ajoute le client aux signataires lorsqu'il est désigné, et rend le mandat sur demande de complément", () => {
    const c = { ...complet(), client: "Direction Finance" };
    let m = soumettre(creerMandat("p1", c, { date: "2026-11-01" }), personnes, "2026-11-02");
    expect(m.signatures.map((s) => s.role)).toEqual(["Commanditaire", "Client", "Chef de projet"]);
    m = refuser(signer(m, "Client", "2026-11-03"), "Complément demandé");
    expect(m).toMatchObject({ statut: "Brouillon", decision: "Complément demandé", signatures: [] });
  });

  it("crée une nouvelle version sans toucher à la version signée", () => {
    let v1 = soumettre(creerMandat("p1", complet(), { date: "2026-11-01" }), personnes, "2026-11-02");
    v1 = signer(signer(v1, "Chef de projet", "2026-11-03"), "Commanditaire", "2026-11-04");
    const v2 = nouvelleVersion(v1, [v1], { date: "2027-01-10" });
    expect(v2).toMatchObject({ version: 2, statut: "Brouillon", signatures: [] });
    v2.contenu.budget = 300_000;
    expect(v1.contenu.budget).toBe(250_000);
    expect(mandatEnVigueur([v1, v2])?.version).toBe(1);
    expect(mandatEnVigueur([v2])?.version).toBe(2);
  });

  it("calcule une empreinte indépendante de l'ordre des clés", () => {
    const c = complet();
    const melange = Object.fromEntries(Object.entries(c).reverse()) as unknown as ContenuMandat;
    expect(empreinte(melange)).toBe(empreinte(c));
    expect(empreinte({ ...c, contexte: `${c.contexte} ` })).not.toBe(empreinte(c));
    expect(empreinte(c)).toMatch(/^[0-9a-f]{16}$/);
  });
});
