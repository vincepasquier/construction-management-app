// Stockage IndexedDB : chaque enregistrement est écrit individuellement (plus de réécriture de toute
// la base à chaque modification), et les fichiers volumineux vivent dans leur propre magasin.
import type { ID } from "../domaine/types";
import type { EntreeJournal } from "./journal";
import type { DocQuelconque, NomCollection } from "./schema";
import type { ContenuBase, FichierStocke, LotEcriture, Stockage } from "./stockage";

const VERSION_STRUCTURE = 1;

const attendre = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const terminer = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction interrompue"));
  });

export class StockageIndexedDB implements Stockage {
  private base: Promise<IDBDatabase> | null = null;

  constructor(private nom = "prism", private fabrique: IDBFactory = indexedDB) {}

  private connexion(): Promise<IDBDatabase> {
    this.base ??= new Promise((resolve, reject) => {
      const req = this.fabrique.open(this.nom, VERSION_STRUCTURE);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: ["c", "id"] });
        if (!db.objectStoreNames.contains("journal")) db.createObjectStore("journal", { keyPath: "seq" });
        if (!db.objectStoreNames.contains("fichiers")) db.createObjectStore("fichiers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "cle" });
      };
      req.onblocked = () => reject(new Error("La base est ouverte dans un autre onglet avec une version plus ancienne. Fermez les autres onglets PRISM, puis rechargez."));
      req.onsuccess = () => {
        // Un autre onglet demande une mise à niveau : on libère la base pour ne pas le bloquer
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error ?? new Error("Ouverture de la base impossible"));
    });
    return this.base;
  }

  async ouvrir(): Promise<ContenuBase> {
    const db = await this.connexion();
    const tx = db.transaction(["docs", "journal", "meta"], "readonly");
    const [docs, journal, meta] = await Promise.all([
      attendre(tx.objectStore("docs").getAll() as IDBRequest<{ c: NomCollection; id: ID; d: DocQuelconque }[]>),
      attendre(tx.objectStore("journal").getAll() as IDBRequest<EntreeJournal[]>),
      attendre(tx.objectStore("meta").getAll() as IDBRequest<{ cle: string; valeur: unknown }[]>),
    ]);
    return {
      docs: docs.map((x) => ({ collection: x.c, doc: x.d })),
      journal,
      meta: Object.fromEntries(meta.map((x) => [x.cle, x.valeur])),
    };
  }

  async ecrire(lot: LotEcriture): Promise<void> {
    const db = await this.connexion();
    const tx = db.transaction(["docs", "journal", "meta"], "readwrite");
    const docs = tx.objectStore("docs");
    for (const e of lot.docs ?? []) {
      if (e.doc) docs.put({ c: e.collection, id: e.id, d: e.doc });
      else docs.delete([e.collection, e.id]);
    }
    for (const j of lot.journal ?? []) tx.objectStore("journal").put(j);
    for (const [cle, valeur] of Object.entries(lot.meta ?? {})) tx.objectStore("meta").put({ cle, valeur });
    await terminer(tx);
  }

  async ecrireFichier(f: FichierStocke) {
    const db = await this.connexion();
    const tx = db.transaction("fichiers", "readwrite");
    tx.objectStore("fichiers").put(f);
    await terminer(tx);
  }

  async lireFichier(id: ID) {
    const db = await this.connexion();
    return attendre(db.transaction("fichiers").objectStore("fichiers").get(id) as IDBRequest<FichierStocke | undefined>);
  }

  async supprimerFichier(id: ID) {
    const db = await this.connexion();
    const tx = db.transaction("fichiers", "readwrite");
    tx.objectStore("fichiers").delete(id);
    await terminer(tx);
  }

  async listerFichiers() {
    const db = await this.connexion();
    const tous = await attendre(db.transaction("fichiers").objectStore("fichiers").getAll() as IDBRequest<FichierStocke[]>);
    return tous.map(({ donnees: _d, ...reste }) => reste);
  }

  async vider() {
    const db = await this.connexion();
    const tx = db.transaction(["docs", "journal", "meta", "fichiers"], "readwrite");
    for (const s of ["docs", "journal", "meta", "fichiers"]) tx.objectStore(s).clear();
    await terminer(tx);
  }
}
