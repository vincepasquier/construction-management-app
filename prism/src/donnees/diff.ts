// Comparaison de deux versions d'un enregistrement, pour le journal d'audit.

export interface ChangementChamp {
  /** Chemin du champ modifié, ex. « statut » ou « avenants[av-3].montant » */
  chemin: string;
  avant: unknown;
  apres: unknown;
}

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const estListeIdentifiee = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => estObjet(x) && typeof x.id === "string");

export const egal = (a: unknown, b: unknown): boolean => a === b || JSON.stringify(a) === JSON.stringify(b);

/** Champs de premier niveau qui diffèrent entre deux enregistrements */
export function champsModifies(avant: object, apres: object): ChangementChamp[] {
  const a = avant as Record<string, unknown>;
  const b = apres as Record<string, unknown>;
  const out: ChangementChamp[] = [];
  for (const cle of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!egal(a[cle], b[cle])) out.push({ chemin: cle, avant: a[cle], apres: b[cle] });
  }
  return out;
}

/**
 * Détaille un changement pour l'affichage : descend dans les objets et dans les listes d'éléments
 * identifiés (avenants, étapes, conditions…) pour montrer le champ réellement modifié.
 */
export function detailler(c: ChangementChamp, profondeur = 2): ChangementChamp[] {
  const { chemin, avant, apres } = c;
  if (profondeur > 0 && (estListeIdentifiee(avant) || estListeIdentifiee(apres)) && (Array.isArray(avant) || avant === undefined) && (Array.isArray(apres) || apres === undefined)) {
    const a = new Map(((avant as { id: string }[] | undefined) ?? []).map((x) => [x.id, x]));
    const b = new Map(((apres as { id: string }[] | undefined) ?? []).map((x) => [x.id, x]));
    const out: ChangementChamp[] = [];
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const x = a.get(id), y = b.get(id);
      if (x && y) for (const d of champsModifies(x, y)) out.push(...detailler({ ...d, chemin: `${chemin}[${id}].${d.chemin}` }, profondeur - 1));
      else out.push({ chemin: `${chemin}[${id}]`, avant: x, apres: y });
    }
    return out;
  }
  if (profondeur > 0 && estObjet(avant) && estObjet(apres)) {
    return champsModifies(avant, apres).flatMap((d) => detailler({ ...d, chemin: `${chemin}.${d.chemin}` }, profondeur - 1));
  }
  return [c];
}

/** Valeur présentée en une ligne dans l'historique */
export function resumerValeur(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "number") return new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "string") return v.length > 80 ? `${v.slice(0, 77)}…` : v;
  if (Array.isArray(v)) return `${v.length} élément${v.length > 1 ? "s" : ""}`;
  const o = v as Record<string, unknown>;
  const etiquette = [o.numero, o.nom, o.titre, o.libelle, o.objet, o.texte].find((x) => typeof x === "string" && x);
  return typeof etiquette === "string" ? etiquette : "(objet)";
}
