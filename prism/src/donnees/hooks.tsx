// Accès aux données depuis les composants. Un composant ne se redessine que si une collection
// qu'il a réellement lue change : l'abonnement se déduit des lectures faites pendant le rendu.
import { createContext, useCallback, useContext, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { cfcCorrespond } from "../domaine/data/cfc";
import { niveau } from "../domaine/socle/droits";
import type { ID, ModuleApp, Personne, Projet } from "../domaine/types";
import { Depot, ErreurDepot, type Operation, type OptionsEcriture } from "./depot";
import { COLLECTIONS, META, type Doc, type DocQuelconque, type NomCollection } from "./schema";
import { session } from "./session";

const ContexteDepot = createContext<Depot | null>(null);
const ContexteProjet = createContext<ID | null>(null);

/** Message d'erreur présenté à l'utilisateur ; branché sur les notifications par l'application */
let signalerErreur: (message: string) => void = (m) => console.error(m);
export const brancherErreurs = (f: (message: string) => void) => { signalerErreur = f; };

export function FournisseurDepot({ depot, children }: { depot: Depot; children: ReactNode }) {
  return <ContexteDepot.Provider value={depot}>{children}</ContexteDepot.Provider>;
}

export function FournisseurProjet({ projetId, children }: { projetId: ID; children: ReactNode }) {
  return <ContexteProjet.Provider value={projetId}>{children}</ContexteProjet.Provider>;
}

export function useDepot(): Depot {
  const d = useContext(ContexteDepot);
  if (!d) throw new Error("Aucun dépôt de données : le composant doit être sous <FournisseurDepot>.");
  return d;
}

export const useProjetId = () => useContext(ContexteProjet);

/** Suit les clés de version lues pendant le rendu et redessine quand l'une d'elles change */
function useSuivi(depot: Depot): (cle: string) => void {
  const suivies = useRef(new Map<string, number>());
  const tic = useRef(0);
  // Chaque rendu repart d'une liste vide : seules les lectures du dernier rendu comptent
  suivies.current = new Map();
  const abonner = useCallback((rappel: () => void) => {
    const verifier = () => {
      for (const [cle, v] of suivies.current) {
        if (depot.version(cle) !== v) { tic.current++; rappel(); return; }
      }
    };
    const desabonner = depot.abonner(verifier);
    verifier();
    return desabonner;
  }, [depot]);
  useSyncExternalStore(abonner, () => tic.current);
  return useCallback((cle: string) => { suivies.current.set(cle, depot.version(cle)); }, [depot]);
}

// ---------------------------------------------------------------------------
// Écritures
// ---------------------------------------------------------------------------

export interface Actions {
  ajouter: <C extends NomCollection>(c: C, valeur: Doc<C>, options?: OptionsEcriture & { libelle?: string }) => void;
  modifier: <C extends NomCollection>(c: C, id: ID, patch: Partial<Doc<C>>, options?: OptionsEcriture & { libelle?: string }) => void;
  supprimer: <C extends NomCollection>(c: C, id: ID, options?: OptionsEcriture & { libelle?: string }) => void;
  /** Regroupe plusieurs écritures en une seule opération, annulable en une fois */
  grouper: <T>(libelle: string, action: () => T, options?: OptionsEcriture) => T | undefined;
  /** Import : ajoute les enregistrements fournis, ou remplace ceux de même identifiant */
  fusionnerDonnees: (docs: { [C in NomCollection]?: Doc<C>[] }, libelle?: string) => void;
}

const actionsParDepot = new WeakMap<Depot, Actions>();

/** Écritures protégées : un refus (droit, règle) est présenté à l'utilisateur au lieu de faire planter l'écran */
export function actionsDe(depot: Depot): Actions {
  let a = actionsParDepot.get(depot);
  if (a) return a;
  let profondeur = 0;
  const proteger = <A extends unknown[], R>(f: (...args: A) => R) => (...args: A): R | undefined => {
    try {
      return f(...args);
    } catch (e) {
      // Dans un groupe, l'erreur doit remonter pour que tout le groupe soit défait
      if (!(e instanceof ErreurDepot) || profondeur > 0) throw e;
      signalerErreur(e.message);
      return undefined;
    }
  };
  a = {
    ajouter: proteger((c, v, o) => { depot.ajouter(c, v, o); }),
    modifier: proteger((c, id, p, o) => { depot.modifier(c, id, p, o); }),
    supprimer: proteger((c, id, o) => { depot.supprimer(c, id, o); }),
    grouper: (libelle, action, options) => {
      try {
        return depot.grouper(libelle, () => {
          profondeur++;
          try { return action(); } finally { profondeur--; }
        }, options);
      } catch (e) {
        if (!(e instanceof ErreurDepot)) throw e;
        signalerErreur(e.message);
        return undefined;
      }
    },
    fusionnerDonnees: proteger((docs, libelle) => {
      const operations: Operation[] = [];
      for (const c of COLLECTIONS) {
        for (const doc of (docs[c] ?? []) as DocQuelconque[]) {
          operations.push(depot.parId(c, doc.id)
            ? { op: "modifier", collection: c, id: doc.id, patch: doc as unknown as Record<string, unknown> }
            : { op: "creer", collection: c, valeur: doc });
        }
      }
      if (operations.length) depot.executer({ libelle: libelle ?? "Import de données", origine: "import", operations, sansDetail: operations.length > 40 });
    }),
  } as Actions;
  actionsParDepot.set(depot, a);
  return a;
}

export function useActions(): Actions {
  return actionsDe(useDepot());
}

// ---------------------------------------------------------------------------
// Lecture de toute la base
// ---------------------------------------------------------------------------

export type Donnees = { [C in NomCollection]: Doc<C>[] } & Actions & { /** Utilisateur choisi dans la barre du haut */ utilisateurId: ID | null };

/** Collections complètes et écritures : `const { projets, ajouter } = useDonnees()` */
export function useDonnees(): Donnees {
  const depot = useDepot();
  const suivre = useSuivi(depot);
  const utilisateurId = session.utiliser((s) => s.utilisateurId);
  return useMemo(() => {
    const actions = actionsDe(depot) as unknown as Record<string, unknown>;
    return new Proxy({} as Donnees, {
      get(_cible, cle) {
        if (typeof cle !== "string") return undefined;
        if (cle === "utilisateurId") return utilisateurId;
        if (cle in META) { suivre(cle); return depot.tous(cle as NomCollection); }
        return actions[cle];
      },
    });
  }, [depot, suivre, utilisateurId]);
}

/** Un enregistrement par son identifiant */
export function useDoc<C extends NomCollection>(c: C, id: ID | undefined | null): Doc<C> | undefined {
  const depot = useDepot();
  const suivre = useSuivi(depot);
  suivre(c);
  return depot.parId(c, id);
}

/** Valeur conservée hors collections (réglages SharePoint, conversations de l'assistant…) */
export function useMeta<T>(cle: string, defaut: T): [T, (v: T) => void] {
  const depot = useDepot();
  const suivre = useSuivi(depot);
  suivre(`meta|${cle}`);
  const ecrire = useCallback((v: T) => depot.ecrireMeta(cle, v), [depot, cle]);
  return [depot.lireMeta(cle, defaut), ecrire];
}

/** Journal d'audit (toutes les entrées) */
export function useJournal() {
  const depot = useDepot();
  const suivre = useSuivi(depot);
  suivre("journal");
  return depot.journal;
}

// ---------------------------------------------------------------------------
// Utilisateur et droits
// ---------------------------------------------------------------------------

/** Membre de l'équipe actuellement connecté (sélecteur en haut à droite) */
export function useUtilisateur(): Personne | undefined {
  const utilisateurId = session.utiliser((s) => s.utilisateurId);
  return useDoc("personnes", utilisateurId);
}

/** Niveau d'accès de l'utilisateur courant sur un module */
export function useDroit(module: ModuleApp) {
  const u = useUtilisateur();
  const n = niveau(u, module);
  return { niveau: n, lire: n !== "aucun", ecrire: n === "ecriture" };
}

// ---------------------------------------------------------------------------
// Lecture d'un projet
// ---------------------------------------------------------------------------

type CollectionsProjet = { [C in NomCollection]: Doc<C>[] };

export type DonneesProjet = Omit<CollectionsProjet, "projets"> & {
  projet: Projet | null;
  /** Le filtre « Mes lots » est actif et s'applique */
  filtreActif: boolean;
  mesLots: Doc<"lots">[];
};

type AvecLot = { lotId?: ID; cfc?: string; contratId?: ID };

/**
 * Données du projet courant (celui de l'adresse) ou du projet indiqué. Si le filtre « Mes lots » est
 * actif, seules les données des lots dont l'utilisateur est responsable sont retournées.
 */
export function useProjet(projetIdExplicite?: ID | null): DonneesProjet {
  const depot = useDepot();
  const contexte = useContext(ContexteProjet);
  const pid = projetIdExplicite ?? contexte ?? "";
  const suivre = useSuivi(depot);
  const utilisateurId = session.utiliser((s) => s.utilisateurId);
  const vueMesLots = session.utiliser((s) => s.vueMesLots);
  const cache = useRef(new Map<string, { source: unknown; resultat: unknown }>());

  return useMemo(() => {
    cache.current.clear();
    const lire = <C extends NomCollection>(c: C): Doc<C>[] => {
      suivre(`${c}|${pid}`);
      return depot.parProjet(c, pid);
    };
    const memo = <T,>(cle: string, source: unknown, calcul: () => T): T => {
      const c = cache.current.get(cle);
      if (c && c.source === source) return c.resultat as T;
      const resultat = calcul();
      cache.current.set(cle, { source, resultat });
      return resultat;
    };
    const mesLots = () => {
      const lots = lire("lots");
      return memo("mesLots", lots, () => lots.filter((l) => l.responsableId === utilisateurId));
    };
    const filtreActif = () => vueMesLots && mesLots().length > 0;

    const filtrer = (c: NomCollection): DocQuelconque[] => {
      const liste = lire(c) as DocQuelconque[];
      if (c === "clotures") return memo(c, liste, () => [...(liste as unknown as Doc<"clotures">[])].sort((a, b) => a.mois.localeCompare(b.mois))) as unknown as DocQuelconque[];
      if (!filtreActif()) return liste;
      const lots = mesLots();
      return memo(c, liste, () => {
        const lotIds = new Set(lots.map((l) => l.id));
        const prefixes = lots.flatMap((l) => l.cfc);
        const parLotOuCfc = (x: AvecLot) => (x.lotId ? lotIds.has(x.lotId) : cfcCorrespond(x.cfc ?? "", prefixes));
        const parLot = (x: AvecLot) => !x.lotId || lotIds.has(x.lotId);
        switch (c) {
          case "lots": return lots;
          case "budget": case "appelsOffres": case "contrats": return liste.filter((x) => parLotOuCfc(x as AvecLot));
          case "factures": {
            const contrats = new Set((lire("contrats") as AvecLot[]).filter(parLotOuCfc).map((x) => (x as DocQuelconque).id));
            return liste.filter((x) => contrats.has((x as AvecLot).contratId ?? ""));
          }
          case "taches": case "risques": case "actions": case "autorisations": case "servitudes": case "reserves": case "constats":
            return liste.filter((x) => parLot(x as AvecLot));
          case "documents": return liste.filter((x) => !(x as AvecLot).cfc || cfcCorrespond((x as AvecLot).cfc!, prefixes));
          default: return liste;
        }
      });
    };

    return new Proxy({} as DonneesProjet, {
      get(_cible, cle) {
        if (typeof cle !== "string") return undefined;
        if (cle === "projet") { suivre("projets"); return depot.parId("projets", pid) ?? null; }
        if (cle === "filtreActif") return filtreActif();
        if (cle === "mesLots") return mesLots();
        if (cle in META) return filtrer(cle as NomCollection);
        return undefined;
      },
    });
  }, [depot, pid, suivre, utilisateurId, vueMesLots]);
}

/** Valeur calculée à partir du dépôt, recalculée seulement quand les collections lues changent */
export function useDerive<T>(calcul: (depot: Depot, suivre: (cle: string) => void) => T, dependances: unknown[] = []): T {
  const depot = useDepot();
  const suivre = useSuivi(depot);
  const cache = useRef<{ cles: Map<string, number>; deps: unknown[]; valeur: T } | null>(null);
  const c = cache.current;
  if (c && c.deps.length === dependances.length && c.deps.every((d, i) => d === dependances[i]) && [...c.cles].every(([cle, v]) => depot.version(cle) === v)) {
    for (const cle of c.cles.keys()) suivre(cle);
    return c.valeur;
  }
  const cles = new Map<string, number>();
  const valeur = calcul(depot, (cle) => { cles.set(cle, depot.version(cle)); suivre(cle); });
  cache.current = { cles, deps: dependances, valeur };
  return valeur;
}

export { COLLECTIONS };
