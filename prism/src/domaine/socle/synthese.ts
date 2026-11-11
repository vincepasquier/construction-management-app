// Synthèse financière d'un projet : la lecture unique que consomment le portefeuille, la fiche projet,
// les rapports et les vues de direction, quelle que soit la source des chiffres.
//
//   Mode « positions » (construction) : tout est calculé par le moteur par position ; les valeurs
//     du système source servent de contrôle et n'écrasent jamais le calcul.
//   Mode « synthèse » : budget, engagé et réalisé viennent du système source ; l'atterrissage vient
//     de la source si elle en tient un, sinon de la saisie commentée du responsable.
import { calculerBudget, totaux, type DonneesBudget } from "../lib/budget";
import type { AtterrissageSaisi, ModeFinancier, ReleveSource, ScenarioAtterrissage, ValeursSynthese } from "./types";

export type OrigineValeur = "source" | "calcul" | "saisie";

export interface SyntheseFinanciere extends ValeursSynthese {
  mode: ModeFinancier;
  /** Budget approuvé − atterrissage ; négatif = dépassement */
  ecart: number;
  ecartPct: number;
  origines: Record<keyof ValeursSynthese, OrigineValeur>;
  /** Date de valeur des chiffres venus de la source */
  dateSource?: string;
  /** Valeurs de la source, pour le rapprochement */
  reference?: ReleveSource;
  /** Commentaire de l'atterrissage saisi */
  commentaireAtterrissage?: string;
  /** La synthèse additionne des sous-projets */
  consolidee: boolean;
  /** Aucune donnée financière n'est disponible */
  vide: boolean;
}

export interface DonneesSynthese {
  mode: ModeFinancier;
  positions?: DonneesBudget;
  releve?: ReleveSource;
  atterrissagesSaisis?: AtterrissageSaisi[];
  scenarios?: ScenarioAtterrissage[];
}

const CHAMPS: (keyof ValeursSynthese)[] = ["budgetInitial", "budgetApprouve", "engage", "realise", "paye", "atterrissage", "atterrissageDefavorable"];

const partout = (o: OrigineValeur) => Object.fromEntries(CHAMPS.map((c) => [c, o])) as Record<keyof ValeursSynthese, OrigineValeur>;

function completer(v: ValeursSynthese, reste: Omit<SyntheseFinanciere, keyof ValeursSynthese | "ecart" | "ecartPct">): SyntheseFinanciere {
  const ecart = v.budgetApprouve - v.atterrissage;
  return { ...v, ...reste, ecart, ecartPct: v.budgetApprouve ? (ecart / v.budgetApprouve) * 100 : 0 };
}

/** Dernier atterrissage saisi par le responsable */
export const dernierAtterrissage = (saisis: AtterrissageSaisi[] | undefined) =>
  [...(saisis ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

export const totalScenario = (s: ScenarioAtterrissage) => s.lignes.reduce((t, l) => t + l.montant, 0);

/** Synthèse d'un projet seul, sans ses sous-projets */
export function syntheseDe(d: DonneesSynthese): SyntheseFinanciere {
  if (d.mode === "positions") {
    const t = totaux(calculerBudget(d.positions ?? { budget: [], lots: [], contrats: [], factures: [], facturesHorsCommande: [], offres: [], ajustements: [], mutations: [], appelsOffres: [] }));
    const vide = !d.positions?.budget.length && !d.positions?.contrats.length;
    return completer(
      { budgetInitial: t.initial, budgetApprouve: t.revise, engage: t.engage, realise: t.facture, paye: t.paye, atterrissage: t.atterrissage, atterrissageDefavorable: t.atterrissageDefavorable },
      { mode: "positions", origines: partout("calcul"), reference: d.releve, dateSource: d.releve?.date, consolidee: false, vide },
    );
  }
  const r = d.releve;
  const saisi = dernierAtterrissage(d.atterrissagesSaisis);
  const defavorable = d.scenarios?.filter((s) => s.type === "Défavorable").map(totalScenario).sort((a, b) => b - a)[0];
  // Sans atterrissage dans la source ni saisie, on retient le budget approuvé : aucun écart annoncé
  const atterrissage = r?.atterrissage ?? saisi?.montant ?? r?.budgetApprouve ?? 0;
  const origines = partout(r ? "source" : "saisie");
  origines.atterrissage = r?.atterrissage !== undefined ? "source" : saisi ? "saisie" : "calcul";
  origines.atterrissageDefavorable = defavorable !== undefined ? "saisie" : "calcul";
  return completer(
    {
      budgetInitial: r?.budgetInitial ?? 0, budgetApprouve: r?.budgetApprouve ?? 0, engage: r?.engage ?? 0, realise: r?.realise ?? 0, paye: r?.paye ?? 0,
      atterrissage, atterrissageDefavorable: Math.max(atterrissage, defavorable ?? atterrissage),
    },
    { mode: "synthese", origines, reference: r, dateSource: r?.date, commentaireAtterrissage: r?.atterrissage === undefined ? saisi?.commentaire : undefined, consolidee: false, vide: !r && !saisi },
  );
}

/**
 * Additionne les synthèses d'un projet et de ses sous-projets. En mode « synthèse », le total que la
 * source donne pour le parent reste une valeur de contrôle : ce sont les sous-projets qui s'additionnent.
 */
export function consolider(propre: SyntheseFinanciere, enfants: SyntheseFinanciere[]): SyntheseFinanciere {
  if (enfants.length === 0) return propre;
  const base = propre.mode === "synthese" || propre.vide ? [] : [propre];
  const tous = [...base, ...enfants];
  const somme = Object.fromEntries(CHAMPS.map((c) => [c, tous.reduce((s, x) => s + x[c], 0)])) as unknown as ValeursSynthese;
  const origines = Object.fromEntries(CHAMPS.map((c) => {
    const o = new Set(tous.map((x) => x.origines[c]));
    return [c, o.size === 1 ? [...o][0] : "calcul"];
  })) as Record<keyof ValeursSynthese, OrigineValeur>;
  return completer(somme, {
    mode: propre.mode, origines, reference: propre.reference, dateSource: propre.dateSource, consolidee: true, vide: tous.every((x) => x.vide),
  });
}

export type Sante = "bon" | "alerte" | "mauvais";

/** Santé d'un projet : dépassement prévu et retards, selon les seuils de la configuration */
export function sante(s: Pick<SyntheseFinanciere, "ecartPct" | "vide">, retards: number, seuils: { surveiller: number; critique: number }): Sante {
  const depassement = s.vide ? 0 : -s.ecartPct;
  if (depassement > seuils.critique || retards >= 3) return "mauvais";
  if (depassement > seuils.surveiller || retards > 0) return "alerte";
  return "bon";
}

export const LIBELLE_SANTE: Record<Sante, string> = { bon: "Conforme", alerte: "À surveiller", mauvais: "Critique" };

/** Écart entre le calcul PRISM et la source, champ par champ (rapprochement) */
export function rapprochement(s: SyntheseFinanciere): { champ: string; prism: number; source: number; ecart: number }[] {
  const r = s.reference;
  if (!r || s.mode !== "positions") return [];
  const ligne = (champ: string, prism: number, source: number) => ({ champ, prism, source, ecart: prism - source });
  return [
    ligne("Budget approuvé", s.budgetApprouve, r.budgetApprouve),
    ligne("Engagé", s.engage, r.engage),
    ligne("Réalisé (facturé)", s.realise, r.realise),
    ligne("Payé", s.paye, r.paye),
  ];
}
