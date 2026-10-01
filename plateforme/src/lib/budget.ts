import type {
  Ajustement, AppelOffres, BudgetLigne, Cloture, Contrat, Facture, FactureHorsCommande, ID, Lot, ModeResteAEngager,
  Mutation, OffreAttendue, Repartition, ValeursPosition,
} from "../types";
import { avenantsEnAttente, montantContrat, montantNetSoumission } from "./finance";

// ---------------------------------------------------------------------------
// Suivi budgétaire par position
//
//   Budget révisé       = budget initial + mutations validées
//   Engagé              = commandes (montant initial + avenants approuvés) + factures hors commande
//   Attendu             = offres en cours / reçues / retenues + avenants demandés + meilleure offre des AO en cours
//   Reste à engager     = selon la règle de la position (voir resteAEngager)
//   Ajustements         = estimations, plus-values, risques et corrections pondérés, moins les opportunités
//   Atterrissage        = engagé + attendu + reste à engager + ajustements
//   Écart               = budget révisé − atterrissage (négatif = dépassement)
// ---------------------------------------------------------------------------

export interface DonneesBudget {
  budget: BudgetLigne[];
  lots: Lot[];
  contrats: Contrat[];
  factures: Facture[];
  facturesHorsCommande: FactureHorsCommande[];
  offres: OffreAttendue[];
  ajustements: Ajustement[];
  mutations: Mutation[];
  appelsOffres: AppelOffres[];
}

export interface PositionCalculee extends ValeursPosition {
  id: ID;
  ligne: BudgetLigne;
  /** Position créée pour un engagement sans position correspondante */
  virtuelle: boolean;
  lotId?: ID;
  mutations: number;
  engageCommandes: number;
  horsCommande: number;
  ajustementsDefavorables: number;
  atterrissageDefavorable: number;
  ecart: number;
  mode: ModeResteAEngager;
}

export const STATUTS_OFFRE_ACTIFS = new Set(["En cours", "Reçue", "Retenue"]);
const FACTURES_VALIDES = new Set(["Contrôlée", "Approuvée", "Payée"]);
export const ID_NON_AFFECTE = "__non-affecte__";

/** Signe d'un ajustement : une opportunité réduit l'atterrissage */
export const signeAjustement = (a: Ajustement) => (a.type === "Opportunité" ? -1 : 1);

/** Montant pris en compte dans l'atterrissage probable et dans l'atterrissage défavorable */
export function effetAjustement(a: Ajustement): { probable: number; defavorable: number } {
  if (a.statut !== "Active") return { probable: 0, defavorable: 0 };
  const s = signeAjustement(a);
  return {
    probable: (s * a.montant * a.probabilite) / 100,
    defavorable: a.type === "Opportunité" ? 0 : a.montant,
  };
}

export const sommeRepartition = (r: Repartition[] | undefined) => (r ?? []).reduce((s, x) => s + x.montant, 0);

/** Lot d'une position : celui indiqué, sinon le lot dont un préfixe CFC correspond au code */
export function lotDeLigne(l: BudgetLigne, lots: Lot[]): ID | undefined {
  if (l.lotId) return l.lotId;
  if (!l.cfc) return undefined;
  let meilleur: { id: ID; n: number } | undefined;
  for (const lot of lots) {
    if (lot.projetId !== l.projetId) continue;
    for (const p of lot.cfc) if (l.cfc.startsWith(p) && (!meilleur || p.length > meilleur.n)) meilleur = { id: lot.id, n: p.length };
  }
  return meilleur?.id;
}

function vierge(ligne: BudgetLigne, virtuelle: boolean): PositionCalculee {
  return {
    id: ligne.id, ligne, virtuelle, initial: virtuelle ? 0 : ligne.montant, mutations: 0, revise: 0,
    engageCommandes: 0, horsCommande: 0, engage: 0, attendu: 0, rae: 0, ajustements: 0, ajustementsDefavorables: 0,
    atterrissage: 0, atterrissageDefavorable: 0, ecart: 0, facture: 0, paye: 0, mode: ligne.raeMode ?? "auto",
  };
}

/**
 * Reste à engager selon la règle de la position.
 * « auto » reproduit le classeur de suivi : tant que rien n'est commandé, attendu ou prévu sur la position,
 * le budget restant est réservé ; dès qu'un montant y est imputé, la position est considérée comme soldée.
 */
export function resteAEngager(p: Pick<PositionCalculee, "revise" | "engage" | "engageCommandes" | "attendu" | "ajustementsDefavorables">, mode: ModeResteAEngager, saisi?: number): number {
  switch (mode) {
    case "solde": return 0;
    case "saisi": return Math.max(0, saisi ?? 0);
    case "budget": return Math.max(0, p.revise - p.engage - p.attendu);
    case "auto":
    default:
      return p.engageCommandes + p.attendu + p.ajustementsDefavorables > 0.005 ? 0 : Math.max(0, p.revise - p.engage);
  }
}

/** Répartit `montant` sur des parts pondérées par `poids` */
function ventiler(montant: number, parts: { id: ID; poids: number }[]): { id: ID; montant: number }[] {
  const total = parts.reduce((s, p) => s + p.poids, 0);
  if (!parts.length) return [];
  if (Math.abs(total) < 1e-9) return parts.map((p) => ({ id: p.id, montant: montant / parts.length }));
  return parts.map((p) => ({ id: p.id, montant: (montant * p.poids) / total }));
}

/**
 * Calcule toutes les positions d'un projet. Les montants sans position (contrat dont le CFC ne correspond
 * à aucune ligne, offre non répartie…) apparaissent sur des positions « virtuelles » pour ne jamais disparaître.
 */
export function calculerBudget(d: DonneesBudget): PositionCalculee[] {
  const positions = new Map<ID, PositionCalculee>();
  for (const l of d.budget) positions.set(l.id, vierge(l, false));
  const projetId = d.budget[0]?.projetId ?? d.contrats[0]?.projetId ?? "";

  const virtuelle = (cle: string, libelle: string, cfc = ""): PositionCalculee => {
    const id = `${ID_NON_AFFECTE}${cle}`;
    if (!positions.has(id)) positions.set(id, vierge({ id, projetId, cfc, libelle, montant: 0, groupe: "Hors budget" }, true));
    return positions.get(id)!;
  };

  // Révisé = initial + mutations validées
  for (const m of d.mutations) {
    if (m.statut !== "Validée") continue;
    for (const l of m.lignes) {
      const p = positions.get(l.budgetId) ?? virtuelle("mut", "Mutations sur positions supprimées");
      p.mutations += l.montant;
    }
  }
  for (const p of positions.values()) p.revise = p.initial + p.mutations;

  /** Parts d'imputation d'un engagement : répartition explicite, sinon lignes du même code CFC */
  const parts = (repartition: Repartition[] | undefined, cfc: string | undefined, libelle: string): { id: ID; poids: number }[] => {
    if (repartition && repartition.length && Math.abs(sommeRepartition(repartition)) > 0.005) {
      return repartition.map((r) => ({ id: positions.has(r.budgetId) ? r.budgetId : virtuelle("rep", "Positions supprimées").id, poids: r.montant }));
    }
    if (cfc) {
      const reelles = d.budget;
      let cible = reelles.filter((l) => l.cfc === cfc);
      if (!cible.length) {
        // CFC le plus proche : la ligne budgétaire dont le code est le plus long préfixe du CFC (ou l'inverse)
        const candidats = reelles.filter((l) => l.cfc && (cfc.startsWith(l.cfc) || l.cfc.startsWith(cfc)));
        const n = Math.max(0, ...candidats.map((l) => Math.min(l.cfc.length, cfc.length)));
        cible = candidats.filter((l) => Math.min(l.cfc.length, cfc.length) === n);
      }
      if (cible.length) return cible.map((l) => ({ id: l.id, poids: Math.max(0, positions.get(l.id)!.revise) }));
      return [{ id: virtuelle(`cfc-${cfc}`, `CFC ${cfc} sans budget`, cfc).id, poids: 1 }];
    }
    return [{ id: virtuelle("na", libelle).id, poids: 1 }];
  };

  // Commandes, avenants, factures sur commande
  for (const c of d.contrats) {
    if (c.statut === "Annulé") continue;
    const ps = parts(c.repartition, c.cfc, "Commandes non réparties");
    for (const v of ventiler(montantContrat(c), ps)) positions.get(v.id)!.engageCommandes += v.montant;
    for (const v of ventiler(avenantsEnAttente(c), ps)) positions.get(v.id)!.attendu += v.montant;
    const liees = d.factures.filter((f) => f.contratId === c.id && FACTURES_VALIDES.has(f.statut));
    const facture = liees.reduce((s, f) => s + f.montantHT, 0);
    const paye = liees.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0);
    for (const v of ventiler(facture, ps)) positions.get(v.id)!.facture += v.montant;
    for (const v of ventiler(paye, ps)) positions.get(v.id)!.paye += v.montant;
  }

  // Factures hors commande : engagées et facturées
  for (const f of d.facturesHorsCommande) {
    const ps = parts(f.repartition, undefined, "Factures hors commande à affecter");
    for (const v of ventiler(f.montantHT, ps)) {
      const p = positions.get(v.id)!;
      p.horsCommande += v.montant;
      p.facture += v.montant;
      if (f.paye) p.paye += v.montant;
    }
  }

  // Offres attendues
  for (const o of d.offres) {
    if (!STATUTS_OFFRE_ACTIFS.has(o.statut)) continue;
    for (const v of ventiler(o.montant, parts(o.repartition, undefined, "Offres non réparties"))) positions.get(v.id)!.attendu += v.montant;
  }

  // Appels d'offres en cours : meilleure offre reçue, sinon estimation
  for (const ao of d.appelsOffres) {
    if (ao.statut === "Annulé" || ao.statut === "Adjugé") continue;
    const montants = ao.soumissions.map((s) => montantNetSoumission(ao, s)).filter((m) => m > 0);
    const estimation = montants.length ? Math.min(...montants) : ao.montantEstime;
    if (estimation > 0) for (const v of ventiler(estimation, parts(undefined, ao.cfc, "Appels d'offres"))) positions.get(v.id)!.attendu += v.montant;
  }

  // Ajustements
  for (const a of d.ajustements) {
    const e = effetAjustement(a);
    if (!e.probable && !e.defavorable) continue;
    const ps = parts(a.repartition, undefined, "Ajustements non répartis");
    for (const v of ventiler(e.probable, ps)) positions.get(v.id)!.ajustements += v.montant;
    for (const v of ventiler(e.defavorable, ps)) positions.get(v.id)!.ajustementsDefavorables += v.montant;
  }

  for (const p of positions.values()) {
    p.engage = p.engageCommandes + p.horsCommande;
    p.rae = p.virtuelle ? 0 : resteAEngager(p, p.mode, p.ligne.raeMontant);
    p.atterrissage = p.engage + p.attendu + p.rae + p.ajustements;
    p.atterrissageDefavorable = p.engage + p.attendu + p.rae + p.ajustementsDefavorables;
    p.ecart = p.revise - p.atterrissage;
    p.lotId = lotDeLigne(p.ligne, d.lots);
  }
  return [...positions.values()];
}

// ---------------------------------------------------------------------------
// Agrégations
// ---------------------------------------------------------------------------

export interface Totaux extends ValeursPosition {
  mutations: number;
  engageCommandes: number;
  horsCommande: number;
  ajustementsDefavorables: number;
  atterrissageDefavorable: number;
  ecart: number;
  nombre: number;
}

const CHAMPS = [
  "initial", "mutations", "revise", "engageCommandes", "horsCommande", "engage", "attendu", "rae", "ajustements",
  "ajustementsDefavorables", "atterrissage", "atterrissageDefavorable", "ecart", "facture", "paye",
] as const;

export function totaux(ps: PositionCalculee[]): Totaux {
  const t = Object.fromEntries(CHAMPS.map((c) => [c, 0])) as unknown as Totaux;
  t.nombre = ps.length;
  for (const p of ps) for (const c of CHAMPS) t[c] += p[c];
  return t;
}

/** Regroupe les positions selon une clé (lot, groupe, étape…) en conservant l'ordre d'apparition */
export function grouper<K extends string>(ps: PositionCalculee[], cle: (p: PositionCalculee) => K): { cle: K; positions: PositionCalculee[]; totaux: Totaux }[] {
  const m = new Map<K, PositionCalculee[]>();
  for (const p of ps) {
    const k = cle(p);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(p);
  }
  return [...m].map(([k, v]) => ({ cle: k, positions: v, totaux: totaux(v) }));
}

/** Réserve (divers et imprévus) : budget révisé, consommé (engagé, attendu, prévu) et disponible */
export function reserve(ps: PositionCalculee[]) {
  const r = ps.filter((p) => p.ligne.reserve);
  const t = totaux(r);
  const consomme = t.engage + t.attendu + t.ajustements;
  return { initial: t.initial, revise: t.revise, consomme, restant: t.revise - consomme, nombre: r.length };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function equilibreMutation(m: Pick<Mutation, "lignes">) {
  const debits = m.lignes.filter((l) => l.montant < 0).reduce((s, l) => s - l.montant, 0);
  const credits = m.lignes.filter((l) => l.montant > 0).reduce((s, l) => s + l.montant, 0);
  return { debits, credits, solde: credits - debits, equilibree: Math.abs(credits - debits) < 0.005 && debits > 0 };
}

// ---------------------------------------------------------------------------
// Clôtures et explication des écarts
// ---------------------------------------------------------------------------

const valeurs = (p: ValeursPosition): ValeursPosition => ({
  initial: p.initial, revise: p.revise, engage: p.engage, attendu: p.attendu, rae: p.rae,
  ajustements: p.ajustements, atterrissage: p.atterrissage, facture: p.facture, paye: p.paye,
});

export function photographier(ps: PositionCalculee[]): Pick<Cloture, "positions" | "totaux"> {
  const t = totaux(ps);
  return {
    positions: Object.fromEntries(ps.map((p) => [p.id, valeurs(p)])),
    totaux: { ...valeurs(t), atterrissageDefavorable: t.atterrissageDefavorable },
  };
}

export interface EtapeCascade {
  libelle: string;
  /** Variation (étapes intermédiaires) ou niveau (première et dernière étape) */
  valeur: number;
  type: "niveau" | "variation";
}

/** Décomposition exacte de la variation d'atterrissage entre deux états */
export function cascade(avant: ValeursPosition, apres: ValeursPosition, libelles = { avant: "Clôture", apres: "Actuel" }): EtapeCascade[] {
  return [
    { libelle: libelles.avant, valeur: avant.atterrissage, type: "niveau" },
    { libelle: "Engagé", valeur: apres.engage - avant.engage, type: "variation" },
    { libelle: "Attendu", valeur: apres.attendu - avant.attendu, type: "variation" },
    { libelle: "Reste à eng.", valeur: apres.rae - avant.rae, type: "variation" },
    { libelle: "Ajust.", valeur: apres.ajustements - avant.ajustements, type: "variation" },
    { libelle: libelles.apres, valeur: apres.atterrissage, type: "niveau" },
  ];
}

/** Positions dont l'atterrissage a le plus varié entre deux états */
export function principalesVariations(avant: Record<ID, ValeursPosition>, ps: PositionCalculee[], n = 8) {
  return ps
    .map((p) => ({ p, delta: p.atterrissage - (avant[p.id]?.atterrissage ?? 0) }))
    .filter((x) => Math.abs(x.delta) > 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Répartition au prorata
// ---------------------------------------------------------------------------

/** Répartit un montant sur des positions au prorata de leur budget révisé, arrondi au centime */
export function repartirAuProrata(montant: number, ids: ID[], ps: PositionCalculee[]): Repartition[] {
  const poids = ids.map((id) => ({ id, poids: Math.max(0, ps.find((p) => p.id === id)?.revise ?? 0) }));
  const brut = ventiler(montant, poids).map((v) => ({ budgetId: v.id, montant: Math.round(v.montant * 100) / 100 }));
  const reste = Math.round((montant - sommeRepartition(brut)) * 100) / 100;
  if (brut.length && reste) brut[brut.length - 1].montant = Math.round((brut[brut.length - 1].montant + reste) * 100) / 100;
  return brut;
}

/** Libellé court d'une position : « L1 · Groupe · Libellé [Ét. 1] » */
export function libellePosition(l: BudgetLigne, lots: Lot[]): string {
  const lot = lots.find((x) => x.id === l.lotId);
  return [lot?.code, l.groupe, l.libelle].filter(Boolean).join(" · ") + (l.etape ? ` [Ét. ${l.etape}]` : "") + (l.cfc && !l.groupe ? ` (${l.cfc})` : "");
}
