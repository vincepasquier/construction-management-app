import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { Contrat, Entreprise, Projet } from "@/domaine/types";
import { creerDocx } from "@/outils/docx";
import { blocsAvenant, blocsContrat, elementsContrat } from "./exportContrat";

const projet = { id: "p", code: "RC601", nom: "Traversée du village", maitreOuvrage: "Groupe (démonstration)", tauxTVA: 8.1 } as Projet;
const entreprise = { id: "e", nom: "Routes SA", localite: "Sion", ide: "CHE-100.000.001" } as Entreprise;
const contrat = (x: Partial<Contrat> = {}): Contrat => ({
  id: "c", projetId: "p", numero: "C-RC601-01", entrepriseId: "e", cfc: "461", objet: "Génie civil et chaussée", type: "Contrat d'entreprise", montantInitial: 2_000_000, dateSignature: "2026-01-15", retenuePct: 10, statut: "En cours",
  avenants: [{ id: "a1", numero: "AV-01", date: "2026-04-20", objet: "Purge de sol", montant: 86_500, statut: "Approuvé" }, { id: "a2", numero: "AV-02", date: "2026-08-12", objet: "Déplacement du giratoire", montant: 142_000, statut: "Demandé", motif: "Demande de la commune", incidenceDelaiJours: 15 }], ...x,
});
const texte = (blocs: Parameters<typeof creerDocx>[0]) => strFromU8(unzipSync(creerDocx(blocs))["word/document.xml"]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("contrat d'entreprise", () => {
  it("suit la structure de la SIA 118 et reprend les conditions saisies", () => {
    const t = texte(blocsContrat(projet, contrat({ conditions: { typePrix: "Prix unitaires", debutTravaux: "2026-02-02", finTravaux: "2027-05-28", peineParJour: 2000, peinePlafondPct: 5, delaiPaiementJours: 45, surete: "Cautionnement solidaire", suretePct: 10, directionTravaux: "Ingénieurs Associés SA" } }), { entreprise }));
    expect(t).toContain("Contrat d'entreprise C-RC601-01");
    expect(t).toContain("Routes SA, Sion, IDE CHE-100.000.001");
    for (const renvoi of ["art. 21", "art. 44 ss", "art. 92 ss", "art. 141 ss", "art. 149 ss", "art. 153 ss", "art. 157 ss", "art. 172", "art. 180", "art. 181", "art. 84 ss"]) expect(t).toContain(renvoi);
    expect(t).toContain("02.02.2026");
    expect(t).toMatch(/par jour ouvrable de retard, au plus 5 % du montant du contrat/);
    expect(t).toContain("45 jours");
    expect(t).toContain("Cautionnement solidaire de 10 %");
    expect(t).toMatch(/avenants approuvés compris\s+2[\s’' ]?086[\s’' ]?500\.00/);
  });

  it("donne la liste usuelle des pièces, ou celle qui a été saisie", () => {
    expect(elementsContrat(contrat())).toHaveLength(6);
    expect(elementsContrat(contrat())[4]).toContain("SIA 118");
    expect(elementsContrat(contrat({ conditions: { elements: "Contrat\n\nOffre du 12 mars\n" } }))).toEqual(["Contrat", "Offre du 12 mars"]);
  });

  it("écrit un mandat sans réception ni retenue, avec le règlement SIA du métier", () => {
    const t = texte(blocsContrat(projet, contrat({ type: "Mandat", retenuePct: 0, avenants: [], objet: "Mandat d'ingénieur civil", conditions: { reglement: "SIA 103 (ingénieurs civils)", phases: "31 à 53", typePrix: "Honoraires au temps" } }), { entreprise }));
    expect(t).toContain("Contrat de mandat");
    expect(t).toContain("SIA 103 (ingénieurs civils)");
    expect(t).toContain("pour les phases 31 à 53");
    expect(t).not.toContain("Retenue");
    expect(t).not.toContain("art. 157");
    expect(t).not.toContain("édition 2013");
  });
});

describe("avenant", () => {
  it("part du montant du contrat avec les avenants approuvés antérieurs et dit l'effet sur le délai", () => {
    const c = contrat();
    const t = texte(blocsAvenant(projet, c, c.avenants[1], { entreprise }));
    expect(t).toContain("Avenant AV-02 au contrat C-RC601-01");
    expect(t).toContain("Motif : Demande de la commune");
    expect(t).toMatch(/avant le présent avenant\s+2[\s’' ]?086[\s’' ]?500\.00/);
    expect(t).toMatch(/Nouveau montant du contrat, hors TVA\s+2[\s’' ]?228[\s’' ]?500\.00/);
    expect(t).toContain("prolongé de 15 jour(s) ouvrable(s)");
    expect(t).toContain("art. 84 ss");
    // Le premier avenant ne compte pas le second, postérieur
    expect(texte(blocsAvenant(projet, c, c.avenants[0], { entreprise }))).toMatch(/Nouveau montant du contrat, hors TVA\s+2[\s’' ]?086[\s’' ]?500\.00/);
    expect(texte(blocsAvenant(projet, c, c.avenants[0], { entreprise }))).toContain("sans effet sur les délais");
  });
});
