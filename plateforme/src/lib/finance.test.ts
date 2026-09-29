import { describe, expect, it } from "vitest";
import type { AppelOffres, Contrat, Facture, Tache } from "../types";
import {
  avancementPlanning, evaluerSoumissions, factureDuContrat, montantContrat, montantNetSoumission, suiviParCFC, tachesEnRetard, totauxSuivi,
} from "./finance";
import { importerAncienneSession } from "./importAncien";
import { donneesDemo } from "../data/demo";
import { construireContexte } from "./contexteIA";

const contrat = (p: Partial<Contrat> = {}): Contrat => ({
  id: "c1", projetId: "p", numero: "C1", entrepriseId: "e1", cfc: "211", objet: "", type: "Contrat d'entreprise",
  montantInitial: 100_000, dateSignature: "2026-01-01", retenuePct: 10, statut: "En cours", avenants: [], ...p,
});
const facture = (p: Partial<Facture>): Facture => ({
  id: "f", projetId: "p", contratId: "c1", numero: "S1", type: "Situation", date: "2026-02-01", echeance: "2026-03-01", montantHT: 0, statut: "Approuvée", ...p,
});

describe("contrats", () => {
  it("n'intègre que les avenants approuvés au montant actualisé", () => {
    const c = contrat({ avenants: [
      { id: "a", numero: "1", date: "", objet: "", montant: 10_000, statut: "Approuvé" },
      { id: "b", numero: "2", date: "", objet: "", montant: 5_000, statut: "Demandé" },
      { id: "c", numero: "3", date: "", objet: "", montant: 7_000, statut: "Refusé" },
    ] });
    expect(montantContrat(c)).toBe(110_000);
  });

  it("calcule facturé, payé et retenue (hors décompte final et factures non validées)", () => {
    const f = factureDuContrat(contrat(), [
      facture({ id: "1", montantHT: 20_000, statut: "Payée" }),
      facture({ id: "2", montantHT: 30_000, statut: "Approuvée" }),
      facture({ id: "3", montantHT: 99_000, statut: "Reçue" }),
      facture({ id: "4", montantHT: 10_000, statut: "Approuvée", type: "Décompte final" }),
      facture({ id: "5", montantHT: 5_000, statut: "Contestée" }),
    ]);
    expect(f.facture).toBe(60_000);
    expect(f.paye).toBe(20_000);
    expect(f.retenue).toBe(5_000);
    expect(f.solde).toBe(40_000);
  });
});

const ao: AppelOffres = {
  id: "ao", projetId: "p", numero: "AO1", objet: "", cfc: "461", procedure: "Ouverte", statut: "Évaluation", dateEnvoi: "", dateRetour: "",
  montantEstime: 50_000, entreprisesInvitees: [],
  positions: [{ id: "p1", chapitre: "223", numero: "223.1", libelle: "", unite: "t", quantite: 100 }],
  criteres: [{ id: "prix", nom: "Prix", poids: 60, estPrix: true }, { id: "q", nom: "Qualité", poids: 40 }],
  soumissions: [
    { id: "s1", entrepriseId: "e1", dateReception: "", prixUnitaires: { p1: 400 }, rabaisPct: 0, escomptePct: 0, notes: { q: 2 } },
    { id: "s2", entrepriseId: "e2", dateReception: "", prixUnitaires: { p1: 500 }, rabaisPct: 10, escomptePct: 2, notes: { q: 5 } },
  ],
};

describe("appels d'offres", () => {
  it("applique rabais puis escompte", () => {
    expect(montantNetSoumission(ao, ao.soumissions[1])).toBeCloseTo(50_000 * 0.9 * 0.98);
  });

  it("classe selon la note pondérée (prix proportionnel)", () => {
    const ev = evaluerSoumissions(ao);
    // s1 : prix 5 × 60 + 2 × 40 = 380 ; s2 : 5 × 40000/44100 × 60 + 5 × 40 ≈ 472
    expect(ev[0].soumissionId).toBe("s2");
    expect(ev[1].total).toBeCloseTo(380);
    expect(ev[0].rang).toBe(1);
  });
});

describe("suivi par CFC", () => {
  it("agrège les niveaux et calcule la prévision selon la priorité contrat > offre > budget", () => {
    const budget = [
      { id: "b1", projetId: "p", cfc: "211", libelle: "", montant: 120_000 },
      { id: "b2", projetId: "p", cfc: "461", libelle: "", montant: 30_000 },
      { id: "b3", projetId: "p", cfc: "583", libelle: "", montant: 10_000 },
    ];
    const s = suiviParCFC(budget, [contrat({ avenants: [{ id: "a", numero: "1", date: "", objet: "", montant: 8_000, statut: "Demandé" }] })], [], [ao]);
    expect(s.get("211")!.prevision).toBe(108_000);
    expect(s.get("461")!.prevision).toBe(40_000);
    expect(s.get("583")!.prevision).toBe(10_000);
    expect(s.get("2")!.budget).toBe(120_000);
    const t = totauxSuivi(s);
    expect(t.budget).toBe(160_000);
    expect(t.prevision).toBe(158_000);
    expect(t.ecart).toBe(2_000);
  });
});

describe("planning", () => {
  const t = (p: Partial<Tache>): Tache => ({ id: "t", projetId: "p", nom: "", debut: "2026-01-01", fin: "2026-01-31", avancement: 0, jalon: false, dependances: [], ...p });
  it("pondère l'avancement par la durée et ignore les jalons", () => {
    expect(avancementPlanning([t({ avancement: 100 }), t({ debut: "2026-02-01", fin: "2026-02-01", avancement: 0 }), t({ jalon: true })])).toBeGreaterThan(90);
  });
  it("détecte les retards", () => {
    const r = tachesEnRetard([t({ id: "a", avancement: 50 }), t({ id: "b", avancement: 100 }), t({ id: "c", fin: "2026-12-31", avancement: 0 })], "2026-06-15");
    expect(r.map((x) => x.id)).toEqual(["a", "c"]);
  });
});

describe("import de l'ancienne application", () => {
  it("convertit estimations, AO, commandes et factures", () => {
    const r = importerAncienneSession({
      sessionName: "Villa Test",
      data: {
        estimations: [{ id: "E", lots: [{ id: "lot-1", numero: "211", nom: "Maçonnerie", positions0: [{ positions1: [{ lignes: [{ montant: "1000" }, { montant: 500 }] }] }] }] }],
        appelOffres: [{ id: "A1", numero: "AO-1", designation: "Maçonnerie", lots: ["lot-1"], budget: 1500, statut: "Attribué" }],
        offres: [{ id: "O1", appelOffreId: "A1", fournisseur: "Maçon SA", montant: 1400 }],
        commandes: [{ id: "C1", numero: "CMD-1", fournisseur: "Maçon SA", lots: ["lot-1"], montant: 1400, offresComplementairesIds: ["OC1"] }],
        offresComplementaires: [{ id: "OC1", montant: 200, statut: "Acceptée" }],
        factures: [{ id: "F1", commandeId: "C1", numero: "F-1", montantHT: 700, statut: "Payée", dateFacture: "2026-03-01" }],
      },
    });
    expect(r.budget![0]).toMatchObject({ cfc: "211", montant: 1500 });
    expect(r.entreprises).toHaveLength(1);
    expect(r.appelsOffres![0]).toMatchObject({ cfc: "211", statut: "Adjugé" });
    expect(r.contrats![0].avenants[0].montant).toBe(200);
    expect(montantContrat(r.contrats![0])).toBe(1600);
    expect(r.factures![0]).toMatchObject({ contratId: r.contrats![0].id, statut: "Payée" });
  });
});

describe("contexte IA", () => {
  it("résume le projet de démonstration", () => {
    const d = donneesDemo();
    const par = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId === "prj-1");
    const ctx = construireContexte({
      projet: d.projets[0], lots: par(d.lots), budget: par(d.budget), appelsOffres: par(d.appelsOffres), contrats: par(d.contrats),
      factures: par(d.factures), taches: par(d.taches), documents: par(d.documents), entreprises: d.entreprises, personnes: d.personnes,
    }, "2026-09-29");
    expect(ctx).toContain("RC601");
    expect(ctx).toContain("Avenant AV-02 (Demandé");
    expect(ctx).toContain("EN RETARD");
  });
});
