// Stockage persistant de la base : enregistrements, journal d'audit, fichiers (photos, archives) et
// réglages. Deux réalisations : IndexedDB dans le navigateur, mémoire pour les tests et les archives.
import type { ID } from "../domaine/types";
import type { EntreeJournal } from "./journal";
import type { DocQuelconque, NomCollection } from "./schema";

export interface EcritureDoc {
  collection: NomCollection;
  id: ID;
  /** `null` supprime l'enregistrement */
  doc: DocQuelconque | null;
}

export interface LotEcriture {
  docs?: EcritureDoc[];
  journal?: EntreeJournal[];
  meta?: Record<string, unknown>;
}

export interface FichierStocke {
  id: ID;
  nom: string;
  type: string;
  taille: number;
  date: string;
  projetId?: ID;
  donnees: Blob;
}

export interface ContenuBase {
  docs: { collection: NomCollection; doc: DocQuelconque }[];
  journal: EntreeJournal[];
  meta: Record<string, unknown>;
}

export interface Stockage {
  /** Lit toute la base (hors fichiers) */
  ouvrir(): Promise<ContenuBase>;
  /** Écrit un lot en une seule transaction */
  ecrire(lot: LotEcriture): Promise<void>;
  ecrireFichier(f: FichierStocke): Promise<void>;
  lireFichier(id: ID): Promise<FichierStocke | undefined>;
  supprimerFichier(id: ID): Promise<void>;
  listerFichiers(): Promise<Omit<FichierStocke, "donnees">[]>;
  /** Efface toute la base */
  vider(): Promise<void>;
}

export class StockageMemoire implements Stockage {
  private docs = new Map<string, { collection: NomCollection; doc: DocQuelconque }>();
  private journal: EntreeJournal[] = [];
  private meta: Record<string, unknown> = {};
  private fichiers = new Map<ID, FichierStocke>();

  constructor(initial?: Partial<ContenuBase>) {
    for (const d of initial?.docs ?? []) this.docs.set(`${d.collection}|${d.doc.id}`, d);
    this.journal = [...(initial?.journal ?? [])];
    this.meta = { ...(initial?.meta ?? {}) };
  }

  async ouvrir(): Promise<ContenuBase> {
    return { docs: [...this.docs.values()], journal: [...this.journal], meta: { ...this.meta } };
  }

  async ecrire(lot: LotEcriture): Promise<void> {
    for (const e of lot.docs ?? []) {
      const cle = `${e.collection}|${e.id}`;
      if (e.doc) this.docs.set(cle, { collection: e.collection, doc: e.doc });
      else this.docs.delete(cle);
    }
    for (const j of lot.journal ?? []) {
      const i = this.journal.findIndex((x) => x.seq === j.seq);
      if (i >= 0) this.journal[i] = j;
      else this.journal.push(j);
    }
    Object.assign(this.meta, lot.meta ?? {});
  }

  async ecrireFichier(f: FichierStocke) { this.fichiers.set(f.id, f); }
  async lireFichier(id: ID) { return this.fichiers.get(id); }
  async supprimerFichier(id: ID) { this.fichiers.delete(id); }
  async listerFichiers() { return [...this.fichiers.values()].map(({ donnees: _d, ...reste }) => reste); }
  async vider() { this.docs.clear(); this.journal = []; this.meta = {}; this.fichiers.clear(); }
}
