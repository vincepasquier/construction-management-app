import { beforeEach, describe, expect, it } from "vitest";
import { projetVisible } from "../domaine/socle/droits";
import { Depot } from "./depot";
import { chargerDemo } from "./demo/charger";
import { brancherNotifications } from "./notifications";
import { deciderPartage, demanderAcces, demandesADecider } from "./partage";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";
import { dupliquerStructure } from "./structure";

let depot: Depot;
beforeEach(async () => {
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, jour: "2026-11-11" });
  brancherNotifications(depot);
});

describe("demande d'accès à un projet", () => {
  it("le responsable du projet accorde l'accès : le projet entre dans le périmètre du demandeur, qui est prévenu", () => {
    const nadia = () => depot.parId("personnes", "per-5")!;
    const projet = depot.parId("projets", "prj-1")!;
    expect(projetVisible(nadia(), projet)).toBe(false);
    depot.acteurId = "per-5";
    expect(() => demanderAcces(depot, "prj-1", "per-5", " ", "2026-11-11")).toThrow();
    const d = demanderAcces(depot, "prj-1", "per-5", "Coordination des réseaux avec le collecteur", "2026-11-11");
    expect(demanderAcces(depot, "prj-1", "per-5", "Encore", "2026-11-11").id).toBe(d.id);
    // Le responsable est prévenu ; la demandeuse ne peut pas se l'accorder elle-même
    expect(depot.tous("notifications").some((n) => n.destinataireId === projet.directeurId && n.type === "Partage")).toBe(true);
    expect(() => deciderPartage(depot, d.id, true, "2026-11-11")).toThrow(/responsable du projet/);
    depot.acteurId = projet.directeurId;
    expect(demandesADecider(depot, depot.acteur()).map((x) => x.id)).toEqual([d.id]);
    deciderPartage(depot, d.id, true, "2026-11-12");
    expect(projetVisible(nadia(), projet)).toBe(true);
    expect(depot.parId("demandesPartage", d.id)).toMatchObject({ statut: "Accordé", decideParId: projet.directeurId });
    expect(depot.tous("notifications").some((n) => n.destinataireId === "per-5" && n.titre.includes("accordé"))).toBe(true);
    expect(() => deciderPartage(depot, d.id, false, "2026-11-12")).toThrow(/déjà été traitée/);
  });

  it("un refus ne change pas le périmètre", () => {
    depot.acteurId = "per-5";
    const d = demanderAcces(depot, "prj-1", "per-5", "Curiosité", "2026-11-11");
    depot.acteurId = "p20133-vincent-pasquier";
    deciderPartage(depot, d.id, false, "2026-11-12");
    expect(projetVisible(depot.parId("personnes", "per-5"), depot.parId("projets", "prj-1")!)).toBe(false);
  });
});

describe("reprise de la structure d'un projet", () => {
  it("copie lots, fonctions, parties prenantes, jalons et risques, sans finances ni titulaires", () => {
    depot.ajouter("projets", { id: "nouveau", code: "DSE-2027-0001", nom: "Réaménagement RC 602", maitreOuvrage: "", lieu: "", phase: "11 Énoncé des besoins", dateDebut: "2027-02-02", dateFin: "2028-06-30", tauxTVA: 8.1, couleur: "#000", description: "", provisoire: true });
    const r = dupliquerStructure(depot, "prj-1", "nouveau", "2026-11-11");
    expect(r.lots).toBe(depot.parProjet("lots", "prj-1").length);
    expect(r.fonctions).toBe(depot.parProjet("organigramme", "prj-1").length);
    expect(r.risques).toBe(depot.parProjet("risques", "prj-1").length);
    const lots = depot.parProjet("lots", "nouveau");
    expect(lots.every((l) => !l.responsableId && l.projetId === "nouveau")).toBe(true);
    const noeuds = depot.parProjet("organigramme", "nouveau");
    expect(noeuds.every((n) => !n.personneId && !n.entrepriseId && (!n.parentId || noeuds.some((x) => x.id === n.parentId)))).toBe(true);
    // Les jalons sont décalés du même nombre de jours que le début du projet (365 jours ; 2028 est bissextile)
    const jalon = depot.parProjet("taches", "nouveau").find((t) => t.nom === "Réception de l'ouvrage")!;
    expect(jalon).toMatchObject({ fin: "2028-06-29", avancement: 0, jalon: true });
    const risques = depot.parProjet("risques", "nouveau");
    expect(risques.every((x) => x.statut === "Ouvert" && x.impactFinancier === 0 && !x.proprietaireId && (!x.lotId || lots.some((l) => l.id === x.lotId)))).toBe(true);
    expect(depot.parProjet("budget", "nouveau")).toHaveLength(0);
    expect(depot.parProjet("contrats", "nouveau")).toHaveLength(0);
    // Une seule opération, annulable
    depot.annuler(depot.derniereAnnulable()!.seq);
    expect(depot.parProjet("lots", "nouveau")).toHaveLength(0);
  });
});
