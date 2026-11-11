// Reprise des données de Chantier+ (application précédente) : lecture du stockage du navigateur ou
// d'un fichier exporté, puis conversion vers le modèle PRISM. Rien n'est modifié côté Chantier+.
import type { DonneesDemo } from "../domaine/data/demo";
import type { Personne, Projet } from "../domaine/types";
import { TYPE_CONSTRUCTION } from "./demo/referentiels";
import { META, type DocQuelconque, type NomCollection } from "./schema";

export const CLE_CHANTIER_PLUS = "chantier-plus";

const COLLECTIONS_CHANTIER_PLUS: (keyof DonneesDemo)[] = [
  "projets", "lots", "budget", "entreprises", "appelsOffres", "contrats", "factures", "taches", "documents", "personnes", "affectations",
  "organigramme", "validations", "risques", "actions", "autorisations", "servitudes", "mutations", "offres", "ajustements",
  "facturesHorsCommande", "clotures",
];

export interface DonneesChantierPlus {
  donnees: Partial<DonneesDemo>;
  utilisateurId?: string;
  sharePoint?: unknown;
  version?: number;
}

/**
 * Reconnaît des données Chantier+ sous leurs trois formes : stockage du navigateur (`{state, version}`),
 * fichier de sauvegarde ou de projet (`{format, donnees}`), ou collections à la racine.
 */
export function lireChantierPlus(brut: unknown): DonneesChantierPlus | null {
  let o = brut;
  if (typeof o === "string") {
    try { o = JSON.parse(o); } catch { return null; }
  }
  if (!o || typeof o !== "object") return null;
  const racine = o as Record<string, unknown>;
  const objet = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
  const etat = objet(racine.state) ?? objet(racine.donnees) ?? racine;
  if (!Array.isArray(etat.projets)) return null;
  const donnees: Partial<DonneesDemo> = {};
  for (const c of COLLECTIONS_CHANTIER_PLUS) if (Array.isArray(etat[c])) (donnees as Record<string, unknown>)[c] = etat[c];
  return {
    donnees,
    utilisateurId: typeof etat.utilisateurId === "string" ? etat.utilisateurId : undefined,
    sharePoint: etat.sharePoint,
    version: typeof racine.version === "number" ? racine.version : undefined,
  };
}

/** Données Chantier+ présentes dans ce navigateur, s'il y en a */
export function detecterChantierPlus(): DonneesChantierPlus | null {
  try {
    const brut = globalThis.localStorage?.getItem(CLE_CHANTIER_PLUS);
    return brut ? lireChantierPlus(brut) : null;
  } catch {
    return null;
  }
}

export type DocsParCollection = Partial<Record<NomCollection, DocQuelconque[]>>;

/**
 * Convertit des données Chantier+ en enregistrements PRISM. Les projets deviennent des projets de
 * construction ; toutes les autres collections sont reprises telles quelles (même structure).
 */
export function convertirChantierPlus(d: Partial<DonneesDemo>): DocsParCollection {
  const docs: DocsParCollection = {};
  for (const c of COLLECTIONS_CHANTIER_PLUS) {
    const liste = d[c];
    if (!liste?.length || !(c in META)) continue;
    docs[c as NomCollection] = liste as DocQuelconque[];
  }
  docs.projets = (d.projets ?? []).map((p): Projet => ({
    typeProjetId: TYPE_CONSTRUCTION, statut: "En cours", priorite: "Normale", confidentialite: "Interne",
    ...p,
  }));
  return docs;
}

/** Le propriétaire des données reprises doit pouvoir tout voir dans PRISM : il devient administrateur */
export function promouvoirAdministrateur(personnes: Personne[], id: string | undefined): Personne[] {
  return personnes.map((p) => (p.id === id ? { ...p, acces: { profil: "Administrateur", projets: "tous", modules: {} } } : p));
}
