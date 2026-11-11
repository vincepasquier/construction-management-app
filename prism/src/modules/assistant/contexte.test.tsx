// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Personne } from "@/domaine/types";
import { Depot } from "@/donnees/depot";
import { FournisseurDepot, useDonnees, useProjet } from "@/donnees/hooks";
import { chargerDemo } from "@/donnees/demo/charger";
import { StockageMemoire } from "@/donnees/stockage";
import { contexteAssistant } from "./contexte";

let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire());
  await depot.ouvrir();
  await chargerDemo(depot);
});
afterEach(cleanup);

function contexteDe(utilisateur: Personne | undefined, projetId = "prj-1"): string {
  let texte = "";
  function Sonde() {
    const d = useProjet(projetId);
    const { entreprises, personnes } = useDonnees();
    texte = contexteAssistant(d, utilisateur, entreprises, personnes, "2026-11-11");
    return null;
  }
  render(<FournisseurDepot depot={depot}><Sonde /></FournisseurDepot>);
  return texte;
}

describe("contexte de l'assistant", () => {
  it("résume le projet pour un utilisateur qui a tous les droits", () => {
    const texte = contexteDe(depot.parId("personnes", "p20133-vincent-pasquier"));
    expect(texte).toContain("RC601");
    expect(texte).toMatch(/atterrissage/i);
    expect(texte).toMatch(/Routes & Génie/);
    expect(texte.length).toBeGreaterThan(3000);
  });

  it("ne transmet rien d'un projet hors périmètre", () => {
    // Nadia Perret n'a accès qu'au projet prj-2
    expect(contexteDe(depot.parId("personnes", "per-5"))).toBe("");
  });

  it("retire les modules fermés à l'utilisateur", () => {
    const admin = depot.parId("personnes", "p20133-vincent-pasquier")!;
    const sansFinances: Personne = { ...admin, acces: { ...admin.acces!, profil: "Administrateur", modules: { finances: "aucun", contrats: "aucun", risques: "aucun" } } };
    const complet = contexteDe(admin);
    const reduit = contexteDe(sansFinances);
    expect(reduit.length).toBeLessThan(complet.length);
    const section = (texte: string, titre: string) => texte.split(`## ${titre}`)[1]?.split("\n## ")[0] ?? "";
    expect(section(complet, "Contrats")).toContain("C-RC601-01");
    expect(section(reduit, "Contrats")).not.toContain("C-RC601-01");
    expect(section(complet, "Synthèse financière (HT)")).toMatch(/7.715.000/);
    expect(section(reduit, "Synthèse financière (HT)")).not.toMatch(/7.715.000/);
    expect(reduit).not.toContain("Conduites existantes non répertoriées");
    expect(reduit).toContain("Modules non accessibles");
  });
});
