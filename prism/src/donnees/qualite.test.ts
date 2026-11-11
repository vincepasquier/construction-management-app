import { beforeAll, describe, expect, it } from "vitest";
import { surcharger } from "./connecteurs/synchro";
import { Depot } from "./depot";
import { chargerDemo } from "./demo/charger";
import { bilan, controler } from "./qualite";
import { StockageMemoire } from "./stockage";

const JOUR = "2026-11-11";
let depot: Depot;
beforeAll(async () => {
  depot = new Depot(new StockageMemoire());
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, jour: JOUR });
});

const anomalies = () => controler(depot, depot.tous("projets"), JOUR);
const regles = (prefixe: string) => anomalies().filter((a) => a.cle.includes(prefixe));

describe("contrôles de qualité des données", () => {
  it("relève les anomalies de la démonstration, les plus graves d'abord", () => {
    const a = anomalies();
    expect(a.length).toBeGreaterThan(3);
    const b = bilan(a);
    expect(b.total).toBe(a.length);
    expect(Object.values(b.parDomaine).reduce((s, n) => s + n, 0)).toBe(a.length);
    const rangs = a.map((x) => ["Bloquant", "À corriger", "À vérifier"].indexOf(x.gravite));
    expect([...rangs].sort((x, y) => x - y)).toEqual(rangs);
  });

  it("détecte une facture saisie deux fois et un contrat facturé au-delà de son montant", () => {
    const f = depot.parProjet("factures", "prj-1")[0];
    depot.ajouter("factures", { ...f, id: "fac-doublon" });
    expect(regles("|doublon-").some((x) => x.controle === "Unicité" && x.message.includes("2 fois"))).toBe(true);
    const c = depot.parProjet("contrats", "prj-1").find((x) => x.id === f.contratId)!;
    depot.ajouter("factures", { ...f, id: "fac-enorme", numero: "S99", montantHT: 99_000_000 });
    expect(regles(`|depassement-${c.id}`)).toHaveLength(1);
  });

  it("signale les corrections locales comme à corriger dans le système source", () => {
    const p = depot.tous("projets").find((x) => x.numeroSource === "DDE-2026-0154")!;
    surcharger(depot, p.id, "nom", "Compteurs intelligents – tranche 3", "Libellé erroné dans la source");
    const a = regles(`${p.id}|surcharge-nom`);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ aLaSource: true, domaine: "Fiche projet" });
    expect(a[0].message).toContain("Libellé erroné dans la source");
  });

  it("contrôle la fraîcheur, la cohérence des dates et l'unicité des codes", () => {
    const p = depot.tous("projets").find((x) => x.numeroSource === "DFI-2025-0177")!;
    depot.modifier("projets", p.id, { synchro: { ...p.synchro!, date: "2026-10-01T00:00:00.000Z" }, dateFin: "2020-01-01", code: "RC601" }, { origine: "systeme" });
    expect(regles(`${p.id}|fraicheur`)).toHaveLength(1);
    expect(regles(`${p.id}|dates`)).toHaveLength(1);
    expect(regles("|code").length).toBe(2);
  });

  it("relève un risque sans responsable, une mesure échue et un jalon dépassé", () => {
    const r = depot.parProjet("risques", "prj-1")[0];
    depot.modifier("risques", r.id, { proprietaireId: undefined, mesuresDetail: [{ id: "m1", texte: "Sondages", echeance: "2026-10-01", statut: "En cours" }] });
    expect(regles(`risque-sans-${r.id}`)).toHaveLength(1);
    expect(regles("mesure-m1")).toHaveLength(1);
    depot.ajouter("taches", { id: "jal-x", projetId: "prj-1", nom: "Mise en service", debut: "2026-09-01", fin: "2026-09-01", avancement: 0, jalon: true, dependances: [] });
    expect(regles("jalon-jal-x")).toHaveLength(1);
  });
});
