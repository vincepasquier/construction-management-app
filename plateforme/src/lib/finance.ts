import type { AppelOffres, BudgetLigne, Contrat, Facture, Soumission, Tache } from "../types";
import { cheminCFC } from "../data/cfc";

// ---------------------------------------------------------------------------
// Contrats
// ---------------------------------------------------------------------------

/** Montant contractuel actualisé : montant initial + avenants approuvés */
export function montantContrat(c: Contrat): number {
  return c.montantInitial + c.avenants.filter((a) => a.statut === "Approuvé").reduce((s, a) => s + a.montant, 0);
}

export function avenantsEnAttente(c: Contrat): number {
  return c.avenants.filter((a) => a.statut === "Demandé").reduce((s, a) => s + a.montant, 0);
}

const FACTURES_VALIDES = new Set(["Contrôlée", "Approuvée", "Payée"]);

export function factureDuContrat(c: Contrat, factures: Facture[]) {
  const liees = factures.filter((f) => f.contratId === c.id && f.statut !== "Contestée");
  const facture = liees.filter((f) => FACTURES_VALIDES.has(f.statut)).reduce((s, f) => s + f.montantHT, 0);
  const paye = liees.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0);
  const montant = montantContrat(c);
  const retenue = liees
    .filter((f) => f.type !== "Décompte final" && FACTURES_VALIDES.has(f.statut))
    .reduce((s, f) => s + (f.montantHT * c.retenuePct) / 100, 0);
  return {
    facture,
    paye,
    retenue,
    solde: montant - facture,
    avancementPct: montant > 0 ? (facture / montant) * 100 : 0,
  };
}

// ---------------------------------------------------------------------------
// Soumissions / appels d'offres
// ---------------------------------------------------------------------------

const arrondi5ct = (x: number) => Math.round(x * 20) / 20;

/**
 * Montant brut d'une offre. Pour un descriptif importé d'un CRBX, chaque ligne (subdivision)
 * est arrondie à 5 centimes comme dans les logiciels de soumission, afin de retrouver
 * exactement le total annoncé par l'entreprise.
 */
export function montantBrutSoumission(ao: AppelOffres, s: Soumission): number {
  const total = ao.positions.reduce((sum, p) => {
    const pu = s.prixUnitaires[p.id] ?? 0;
    if (!pu) return sum;
    const lignes = p.quantitesParElevation ? Object.values(p.quantitesParElevation) : null;
    return sum + (lignes ? lignes.reduce((t, q) => t + arrondi5ct(q * pu), 0) : p.quantite * pu);
  }, 0);
  return Math.round(total * 100) / 100;
}

export function montantNetSoumission(ao: AppelOffres, s: Soumission): number {
  const brut = montantBrutSoumission(ao, s);
  return brut * (1 - s.rabaisPct / 100) * (1 - s.escomptePct / 100);
}

/** Positions sans prix : une soumission incomplète doit être signalée */
export function positionsManquantes(ao: AppelOffres, s: Soumission): number {
  return ao.positions.filter((p) => !(s.prixUnitaires[p.id] > 0)).length;
}

export interface Evaluation {
  soumissionId: string;
  montant: number;
  notePrix: number;
  total: number;
  rang: number;
}

/**
 * Évaluation multicritère : notes de 0 à 5, pondérées (total sur 500).
 * Le prix est noté selon la méthode proportionnelle : 5 × prix le plus bas / prix de l'offre.
 */
export function evaluerSoumissions(ao: AppelOffres): Evaluation[] {
  const montants = ao.soumissions.map((s) => ({ s, montant: montantNetSoumission(ao, s) }));
  const valides = montants.filter((m) => m.montant > 0);
  if (valides.length === 0) return [];
  const min = Math.min(...valides.map((m) => m.montant));
  const evals = valides.map(({ s, montant }) => {
    const notePrix = (5 * min) / montant;
    const total = ao.criteres.reduce((sum, c) => {
      const note = c.estPrix ? notePrix : (s.notes[c.id] ?? 0);
      return sum + note * c.poids;
    }, 0);
    return { soumissionId: s.id, montant, notePrix, total, rang: 0 };
  });
  evals.sort((a, b) => b.total - a.total);
  evals.forEach((e, i) => (e.rang = i + 1));
  return evals;
}

// ---------------------------------------------------------------------------
// Suivi budgétaire par CFC
// ---------------------------------------------------------------------------

export interface LigneSuivi {
  cfc: string;
  budget: number;
  engage: number;
  enAttente: number;
  facture: number;
  paye: number;
  prevision: number;
  ecart: number;
}

const vide = (cfc: string): LigneSuivi => ({
  cfc, budget: 0, engage: 0, enAttente: 0, facture: 0, paye: 0, prevision: 0, ecart: 0,
});

/**
 * Calcule le suivi pour chaque code CFC « feuille » (budget, contrat ou AO), puis agrège sur
 * tous les niveaux parents. La prévision (coût final probable) d'une feuille vaut :
 *   – contrats engagés + avenants en attente s'il existe au moins un contrat,
 *   – sinon la meilleure offre reçue d'un appel d'offres en cours,
 *   – sinon le montant estimé de l'appel d'offres,
 *   – sinon le budget.
 */
export function suiviParCFC(
  budget: BudgetLigne[],
  contrats: Contrat[],
  factures: Facture[],
  aos: AppelOffres[],
): Map<string, LigneSuivi> {
  const feuilles = new Map<string, LigneSuivi>();
  const get = (cfc: string) => {
    if (!feuilles.has(cfc)) feuilles.set(cfc, vide(cfc));
    return feuilles.get(cfc)!;
  };

  for (const b of budget) get(b.cfc).budget += b.montant;

  const aContrat = new Set<string>();
  for (const c of contrats) {
    const l = get(c.cfc);
    l.engage += montantContrat(c);
    l.enAttente += avenantsEnAttente(c);
    const f = factureDuContrat(c, factures);
    l.facture += f.facture;
    l.paye += f.paye;
    aContrat.add(c.cfc);
  }

  const aoParCfc = new Map<string, number>();
  for (const ao of aos) {
    if (ao.statut === "Annulé" || ao.statut === "Adjugé") continue;
    const montants = ao.soumissions.map((s) => montantNetSoumission(ao, s)).filter((m) => m > 0);
    const estimation = montants.length ? Math.min(...montants) : ao.montantEstime;
    if (estimation > 0) aoParCfc.set(ao.cfc, (aoParCfc.get(ao.cfc) ?? 0) + estimation);
    get(ao.cfc);
  }

  for (const l of feuilles.values()) {
    if (aContrat.has(l.cfc)) l.prevision = l.engage + l.enAttente;
    else if (aoParCfc.has(l.cfc)) l.prevision = aoParCfc.get(l.cfc)!;
    else l.prevision = l.budget;
    l.ecart = l.budget - l.prevision;
  }

  // Agrégation sur les niveaux parents (1, 2, 3 chiffres…)
  const arbre = new Map<string, LigneSuivi>();
  for (const f of feuilles.values()) {
    for (const code of cheminCFC(f.cfc)) {
      const n = arbre.get(code) ?? vide(code);
      n.budget += f.budget;
      n.engage += f.engage;
      n.enAttente += f.enAttente;
      n.facture += f.facture;
      n.paye += f.paye;
      n.prevision += f.prevision;
      n.ecart += f.ecart;
      arbre.set(code, n);
    }
  }
  return arbre;
}

export function totauxSuivi(suivi: Map<string, LigneSuivi>): LigneSuivi {
  const t = vide("Total");
  for (const [code, l] of suivi) {
    if (code.length !== 1) continue;
    t.budget += l.budget;
    t.engage += l.engage;
    t.enAttente += l.enAttente;
    t.facture += l.facture;
    t.paye += l.paye;
    t.prevision += l.prevision;
    t.ecart += l.ecart;
  }
  return t;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/** Avancement global pondéré par la durée des tâches (hors jalons) */
export function avancementPlanning(taches: Tache[]): number {
  let poids = 0;
  let fait = 0;
  for (const t of taches) {
    if (t.jalon) continue;
    const d = Math.max(1, (new Date(t.fin).getTime() - new Date(t.debut).getTime()) / 86_400_000);
    poids += d;
    fait += (d * t.avancement) / 100;
  }
  return poids ? (fait / poids) * 100 : 0;
}

/** Tâches dont la fin est dépassée sans être terminées, ou démarrées en retard */
export function tachesEnRetard(taches: Tache[], aujourdhui: string): Tache[] {
  return taches.filter((t) => {
    if (t.avancement >= 100) return false;
    if (t.fin < aujourdhui) return true;
    // Avancement attendu au prorata du temps écoulé
    const total = new Date(t.fin).getTime() - new Date(t.debut).getTime();
    const ecoule = new Date(aujourdhui).getTime() - new Date(t.debut).getTime();
    if (total <= 0 || ecoule <= 0) return false;
    const attendu = Math.min(100, (ecoule / total) * 100);
    return attendu - t.avancement > 25;
  });
}

// ---------------------------------------------------------------------------
// Courbe en S : planifié vs réalisé (facturé cumulé)
// ---------------------------------------------------------------------------

export interface PointCourbe {
  mois: string;
  planifie: number;
  realise: number | null;
}

export function courbeEnS(
  debut: string,
  fin: string,
  montantTotal: number,
  factures: Facture[],
  aujourdhui: string,
): PointCourbe[] {
  const d0 = new Date(debut.slice(0, 7) + "-01");
  const d1 = new Date(fin.slice(0, 7) + "-01");
  const mois: string[] = [];
  for (const d = new Date(d0); d <= d1; d.setMonth(d.getMonth() + 1)) mois.push(d.toISOString().slice(0, 7));
  const n = Math.max(1, mois.length - 1);
  // Sigmoïde normalisée : dépenses lentes au démarrage, rapides au milieu, lentes en fin
  const sig = (x: number) => 1 / (1 + Math.exp(-7 * (x - 0.5)));
  const s0 = sig(0);
  const s1 = sig(1);
  const valides = factures.filter((f) => f.statut !== "Contestée" && f.statut !== "Reçue");
  const moisCourant = aujourdhui.slice(0, 7);
  return mois.map((m, i) => ({
    mois: m,
    planifie: (montantTotal * (sig(i / n) - s0)) / (s1 - s0),
    realise: m <= moisCourant ? valides.filter((f) => f.date.slice(0, 7) <= m).reduce((s, f) => s + f.montantHT, 0) : null,
  }));
}
