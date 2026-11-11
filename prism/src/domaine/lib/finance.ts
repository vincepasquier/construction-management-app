import type { AppelOffres, Contrat, Facture, Soumission, Tache } from "../types";

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
