import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, ID, ParametresSharePoint } from "../types";
import { cfcCorrespond } from "../data/cfc";
import { donneesDemo, type DonneesDemo } from "../data/demo";

export type Collection = keyof DonneesDemo;
type Element<C extends Collection> = DonneesDemo[C][number];

interface EtatApp extends DonneesDemo {
  projetActifId: ID | null;
  utilisateurId: ID | null;
  sharePoint: ParametresSharePoint;
  conversations: Record<ID, ChatMessage[]>;
  /** Filtre « Mes lots » pour les responsables de lot */
  vueMesLots: boolean;

  setVueMesLots: (v: boolean) => void;
  setProjetActif: (id: ID | null) => void;
  setUtilisateur: (id: ID | null) => void;
  setSharePoint: (p: ParametresSharePoint) => void;
  setConversation: (projetId: ID, messages: ChatMessage[]) => void;

  ajouter: <C extends Collection>(c: C, element: Element<C>) => void;
  modifier: <C extends Collection>(c: C, id: ID, patch: Partial<Element<C>>) => void;
  supprimer: <C extends Collection>(c: C, id: ID) => void;

  remplacerDonnees: (d: DonneesDemo) => void;
  fusionnerDonnees: (d: Partial<DonneesDemo>) => void;
  reinitialiserDemo: () => void;
  viderTout: () => void;
}

const vide: DonneesDemo = {
  projets: [], lots: [], budget: [], entreprises: [], appelsOffres: [], contrats: [],
  factures: [], taches: [], documents: [], personnes: [], affectations: [],
};

export const COLLECTIONS = Object.keys(vide) as Collection[];

export const useStore = create<EtatApp>()(
  persist(
    (set) => ({
      ...donneesDemo(),
      projetActifId: "prj-1",
      utilisateurId: "per-1",
      sharePoint: { clientId: "", tenantId: "", hostname: "", sitePath: "", dossierRacine: "Projets" },
      conversations: {},
      vueMesLots: false,

      setVueMesLots: (v) => set({ vueMesLots: v }),
      setProjetActif: (id) => set({ projetActifId: id }),
      setUtilisateur: (id) => set({ utilisateurId: id }),
      setSharePoint: (p) => set({ sharePoint: p }),
      setConversation: (projetId, messages) =>
        set((s) => ({ conversations: { ...s.conversations, [projetId]: messages } })),

      ajouter: (c, element) => set((s) => ({ [c]: [...s[c], element] }) as Partial<EtatApp>),
      modifier: (c, id, patch) =>
        set((s) => ({
          [c]: (s[c] as { id: ID }[]).map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }) as Partial<EtatApp>),
      supprimer: (c, id) =>
        set((s) => ({ [c]: (s[c] as { id: ID }[]).filter((e) => e.id !== id) }) as Partial<EtatApp>),

      remplacerDonnees: (d) => set({ ...vide, ...d, projetActifId: d.projets[0]?.id ?? null }),
      fusionnerDonnees: (d) =>
        set((s) => {
          const patch: Partial<EtatApp> = {};
          for (const c of COLLECTIONS) {
            const ajout = d[c] as { id: ID }[] | undefined;
            if (!ajout?.length) continue;
            const ids = new Set(ajout.map((e) => e.id));
            (patch as Record<string, unknown>)[c] = [...(s[c] as { id: ID }[]).filter((e) => !ids.has(e.id)), ...ajout];
          }
          return patch;
        }),
      reinitialiserDemo: () => set({ ...donneesDemo(), projetActifId: "prj-1", utilisateurId: "per-1", conversations: {} }),
      viderTout: () => set({ ...vide, projetActifId: null, conversations: {} }),
    }),
    { name: "chantier-plus", version: 1 },
  ),
);

/**
 * Données du projet actif. Si le filtre « Mes lots » est actif, seules les données
 * des lots dont l'utilisateur courant est responsable sont retournées.
 */
export function useProjetActif() {
  const s = useStore();
  const projet = s.projets.find((p) => p.id === s.projetActifId) ?? null;
  const pid = projet?.id;
  const tousLots = s.lots.filter((x) => x.projetId === pid);
  const mesLots = tousLots.filter((l) => l.responsableId === s.utilisateurId);
  const filtre = s.vueMesLots && mesLots.length > 0;
  const lotIds = new Set(mesLots.map((l) => l.id));
  const prefixes = mesLots.flatMap((l) => l.cfc);
  const dansPerimetre = (x: { cfc: string; lotId?: ID }) =>
    !filtre || (x.lotId ? lotIds.has(x.lotId) : cfcCorrespond(x.cfc, prefixes));

  const contrats = s.contrats.filter((x) => x.projetId === pid && dansPerimetre(x));
  const contratIds = new Set(contrats.map((c) => c.id));
  return {
    projet,
    filtreActif: filtre,
    mesLots,
    lots: filtre ? mesLots : tousLots,
    budget: s.budget.filter((x) => x.projetId === pid && dansPerimetre(x)),
    appelsOffres: s.appelsOffres.filter((x) => x.projetId === pid && dansPerimetre(x)),
    contrats,
    factures: s.factures.filter((x) => x.projetId === pid && contratIds.has(x.contratId)),
    taches: s.taches.filter((x) => x.projetId === pid && (!filtre || (x.lotId ? lotIds.has(x.lotId) : true))),
    documents: s.documents.filter((x) => x.projetId === pid && (!filtre || !x.cfc || cfcCorrespond(x.cfc, prefixes))),
    affectations: s.affectations.filter((x) => x.projetId === pid),
  };
}

export function exporterDonnees(): DonneesDemo {
  const s = useStore.getState();
  const d = {} as Record<Collection, unknown>;
  for (const c of COLLECTIONS) d[c] = s[c];
  return d as DonneesDemo;
}
