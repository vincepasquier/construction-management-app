import { describe, expect, it } from "vitest";
import { importerContacts, lireContacts, organisationsProbablementInternes, roleDepuisFonction } from "./importContacts";
import { importerPlanner } from "./importPlanner";
import { lireCsv } from "./lectureCsv";

const csv = `"Nom","Prénom","Société","Fonction","Adresse mail","Téléphone","Remarques"
"Rochat","Claire","Énergie Romande SA","Chef de projet","claire.rochat@energie-romande.ch","079 000 00 01",
"Favre","Luc","Énergie Romande SA","Responsable lot électrique","luc.favre@energie-romande.ch",,
"Morel","Anne","Bureau Morel Ingénieurs","Ingénieure structure","a.morel@morel-ing.ch",,"Contact principal"
"Blanc","Paul","Bureau Morel Ingénieurs","Dessinateur","p.blanc@morel-ing.ch",,
"Perrin","Jean","Commune d'Exemple","Syndic","syndic@exemple.ch",,
"Muller","Hans","-","-",,,"Propriétaire riverain"
`;

describe("import des parties prenantes", () => {
  const lignes = lireContacts(lireCsv(csv));
  it("propose comme internes les organisations du domaine e-mail le plus fréquent", () => {
    expect(lignes).toHaveLength(6);
    expect(organisationsProbablementInternes(lignes)).toEqual(["Énergie Romande SA"]);
  });
  it("crée les membres de l'équipe et les contacts d'entreprise", () => {
    const r = importerContacts(lignes, { internes: ["Énergie Romande SA"], personnes: [], entreprises: [] });
    expect(r.personnes.map((p) => [p.nom, p.role])).toEqual([["Claire Rochat", "Directeur de projet"], ["Luc Favre", "Responsable de lot"]]);
    const morel = r.entreprises.find((e) => e.nom === "Bureau Morel Ingénieurs")!;
    expect(morel.contacts!.map((c) => c.nom)).toEqual(["Anne Morel", "Paul Blanc"]);
    expect(r.entreprises.find((e) => e.nom.startsWith("Commune"))?.categorie).toBe("Autorité");
    expect(r.entreprises.find((e) => e.categorie === "Particulier")?.contacts?.[0].remarques).toBe("Propriétaire riverain");
  });
  it("met à jour une personne existante au lieu de la dupliquer", () => {
    const r = importerContacts(lignes, { internes: ["Énergie Romande SA"], personnes: [{ id: "p1", nom: "Claire Rochat", role: "Directeur de projet", email: "", organisation: "", capacite: 100 }], entreprises: [] });
    expect(r.personnes).toHaveLength(1);
    expect(r.personnesMaj[0]).toMatchObject({ id: "p1", patch: { email: "claire.rochat@energie-romande.ch", fonction: "Chef de projet" } });
  });
  it("déduit le rôle de la fonction", () => {
    expect(roleDepuisFonction("Représentant MO")).toBe("Maître d'ouvrage");
    expect(roleDepuisFonction("Conducteur de travaux")).toBe("Conducteur de travaux");
  });
});

describe("import Planner", () => {
  it("reprend responsables, échéances, avancement et compartiments", () => {
    const data = [
      ["Nom du projet", "Plan test"], [],
      ["Numéro de tâche", "Nom", "Fin", "Attribuée à", "Début", "Compartiment", "% achevé", "Priorité", "Notes", "Éléments de la liste de contrôle"],
      [1, "Commander les PAC", new Date("2026-11-30"), "Claire Rochat, Luc Favre", new Date("2026-10-01"), "Lot Électricité", 0.5, "Urgent", "Voir offre", "Offre;Visa"],
      [2, "Plan des fouilles", new Date("2026-09-01"), "Inconnu Dupont", null, "Général", 1, "Moyen", null, null],
    ];
    const r = importerPlanner([{ sheet: "Tâches", data }], {
      projetId: "p", aujourdhui: "2026-10-01",
      personnes: [{ id: "c", nom: "Claire Rochat", role: "Directeur de projet", email: "", organisation: "", capacite: 100 }],
      lots: [{ id: "l1", projetId: "p", code: "L1", nom: "Électricité", cfc: [] }],
    });
    expect(r.actions[0]).toMatchObject({ titre: "Commander les PAC", assigneId: "c", echeance: "2026-11-30", statut: "En cours", priorite: "Urgente", lotId: "l1", origine: "Planner – Lot Électricité" });
    expect(r.actions[0].description).toContain("Avec : Luc Favre");
    expect(r.actions[1].statut).toBe("Terminé");
    expect(r.personnesInconnues).toEqual(["Luc Favre", "Inconnu Dupont"]);
  });
});
