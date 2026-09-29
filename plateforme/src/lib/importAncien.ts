// Import d'une session exportée depuis l'ancienne application de suivi financier
// (fichier JSON « Export session » : { sessionName, data: { estimations, offres, commandes, … } }).
import type { DonneesDemo } from "../data/demo";
import type { AppelOffres, BudgetLigne, Contrat, Entreprise, Facture, Projet, StatutFacture } from "../types";
import { aujourdhui } from "./format";

type Brut = Record<string, unknown>;
const tab = (v: unknown): Brut[] => (Array.isArray(v) ? (v as Brut[]) : []);
const txt = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => Number.parseFloat(String(v ?? "0")) || 0;
const date = (v: unknown) => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : aujourdhui());

function totalLot(lot: Brut): number {
  return tab(lot.positions0).reduce((s, p0) =>
    s + tab(p0.positions1).reduce((s1, p1) => s1 + tab(p1.lignes).reduce((s2, l) => s2 + num(l.montant), 0), 0), 0);
}

export function importerAncienneSession(json: unknown): Partial<DonneesDemo> & { resume: string } {
  const racine = json as Brut;
  const data = (racine.data ?? racine) as Brut;
  const prefixe = `imp${Date.now().toString(36)}`;
  const projetId = `${prefixe}-prj`;
  const debut = aujourdhui();

  const projet: Projet = {
    id: projetId, code: "IMPORT", nom: txt(racine.sessionName) || "Projet importé", maitreOuvrage: "", lieu: "",
    phase: "52 Exécution de l'ouvrage", dateDebut: debut, dateFin: `${Number(debut.slice(0, 4)) + 1}${debut.slice(4)}`,
    tauxTVA: 8.1, couleur: "#475569", description: "Importé depuis l'ancienne application de suivi financier.",
  };

  // Lots de l'estimation → lignes budgétaires (le numéro de lot sert de code CFC)
  const lotsAnciens = tab(data.estimations).flatMap((e) => tab(e.lots));
  const cfcDeLot = new Map<string, string>();
  for (const l of lotsAnciens) cfcDeLot.set(txt(l.id), txt(l.numero));
  // Les anciens documents référencent les lots par identifiant (ou directement par numéro)
  const cfcDe = (lots: unknown) => {
    const premier = Array.isArray(lots) ? (lots as unknown[])[0] : undefined;
    const cle = premier && typeof premier === "object" ? txt((premier as Brut).id ?? (premier as Brut).numero) : txt(premier);
    return cfcDeLot.get(cle) ?? cle;
  };
  const budget: BudgetLigne[] = lotsAnciens.map((l, i) => ({
    id: `${prefixe}-bud-${i}`, projetId, cfc: txt(l.numero) || String(i + 1), libelle: txt(l.nom) || `Lot ${l.numero}`, montant: totalLot(l),
  }));

  // Entreprises : dédoublonnées par nom de fournisseur
  const entreprises = new Map<string, Entreprise>();
  const entrepriseId = (nom: unknown) => {
    const n = txt(nom).trim() || "Fournisseur inconnu";
    if (!entreprises.has(n)) entreprises.set(n, { id: `${prefixe}-ent-${entreprises.size}`, nom: n, localite: "", contact: "", email: "", telephone: "", specialites: [] });
    return entreprises.get(n)!.id;
  };

  const offres = tab(data.offres);
  const appelsOffres: AppelOffres[] = tab(data.appelOffres).map((a) => {
    const liees = offres.filter((o) => txt(o.appelOffreId) === txt(a.id));
    const posId = `${prefixe}-pos-${txt(a.id)}`;
    return {
      id: `${prefixe}-${txt(a.id)}`, projetId, numero: txt(a.numero), objet: txt(a.designation), cfc: cfcDe(a.lots),
      procedure: "Sur invitation", statut: txt(a.statut) === "Attribué" ? "Adjugé" : "Évaluation",
      dateEnvoi: date(a.dateCreation), dateRetour: date(a.dateLimite), montantEstime: num(a.budget),
      positions: [{ id: posId, chapitre: "", numero: "—", libelle: "Offre globale (import)", unite: "gl", quantite: 1 }],
      criteres: [{ id: `${prefixe}-cr`, nom: "Prix", poids: 100, estPrix: true }],
      entreprisesInvitees: [],
      soumissions: liees.map((o) => ({
        id: `${prefixe}-${txt(o.id)}`, entrepriseId: entrepriseId(o.fournisseur), dateReception: date(o.dateOffre),
        prixUnitaires: { [posId]: num(o.montant) }, rabaisPct: 0, escomptePct: 0, notes: {},
      })),
    };
  });

  const complementaires = tab(data.offresComplementaires);
  const contrats: Contrat[] = tab(data.commandes).map((c) => {
    const ids = new Set([...(Array.isArray(c.offresComplementairesIds) ? (c.offresComplementairesIds as unknown[]) : []), c.offreComplementaireId].map(txt).filter(Boolean));
    return {
      id: `${prefixe}-${txt(c.id)}`, projetId, numero: txt(c.numero), entrepriseId: entrepriseId(c.fournisseur), cfc: cfcDe(c.lots),
      objet: txt(c.description) || txt(c.numero), type: "Contrat d'entreprise", montantInitial: num(c.montant), dateSignature: date(c.dateCommande),
      retenuePct: 10, statut: txt(c.statut) === "Terminée" ? "Réceptionné" : "En cours",
      avenants: complementaires.filter((o) => ids.has(txt(o.id))).map((o, i) => ({
        id: `${prefixe}-${txt(o.id)}`, numero: txt(o.numero) || `AV-${i + 1}`, date: date(o.dateOffre ?? o.date), objet: txt(o.description) || "Offre complémentaire",
        montant: num(o.montant), statut: txt(o.statut) === "Refusée" ? "Refusé" : txt(o.statut) === "En attente" ? "Demandé" : "Approuvé",
      })),
    };
  });

  const statutFacture = (s: string): StatutFacture => (s === "Payée" ? "Payée" : s === "En attente" ? "Reçue" : "Approuvée");
  const factures: Facture[] = tab(data.factures)
    .filter((f) => f.commandeId)
    .map((f) => ({
      id: `${prefixe}-${txt(f.id)}`, projetId, contratId: `${prefixe}-${txt(f.commandeId)}`, numero: txt(f.numero),
      type: f.regieId ? "Régie" : "Situation", date: date(f.dateFacture), echeance: date(f.dateEcheance || f.dateFacture),
      montantHT: num(f.montantHT), statut: statutFacture(txt(f.statut)),
    }));

  const ignorees = tab(data.factures).length - factures.length;
  return {
    projets: [projet], budget, entreprises: [...entreprises.values()], appelsOffres, contrats, factures,
    resume: `${budget.length} ligne(s) budgétaire(s), ${appelsOffres.length} AO, ${contrats.length} contrat(s), ${factures.length} facture(s), ${entreprises.size} entreprise(s)` +
      (ignorees ? ` – ${ignorees} facture(s) sans commande non importée(s)` : ""),
  };
}
