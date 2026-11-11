// Dépôt de données : cache en mémoire de toute la base, et SEUL point d'écriture de l'application.
// Chaque écriture vérifie les droits et les règles d'intégrité, laisse une entrée dans le journal
// d'audit, puis n'enregistre que ce qui a changé.
import type { ID, Personne } from "../domaine/types";
import { champsModifies, egal } from "./diff";
import type { Changement, EntreeJournal, Origine } from "./journal";
import { COLLECTIONS, designation, type Doc, type DocQuelconque, type NomCollection } from "./schema";
import type { EcritureDoc, FichierStocke, LotEcriture, Stockage } from "./stockage";

export type Operation =
  | { op: "creer"; collection: NomCollection; valeur: DocQuelconque }
  | { op: "modifier"; collection: NomCollection; id: ID; patch: Record<string, unknown> }
  | { op: "supprimer"; collection: NomCollection; id: ID };

export interface OptionsEcriture {
  origine?: Origine;
  motif?: string;
  irreversible?: boolean;
  /** Écriture de masse : le journal ne garde que les volumes */
  sansDetail?: boolean;
  projetId?: ID;
}

export interface Commande extends OptionsEcriture {
  libelle: string;
  operations: Operation[];
}

/** Opération accompagnée de l'état avant et après, telle que la voient les droits et les gardes */
export interface OperationResolue {
  op: Operation["op"];
  collection: NomCollection;
  id: ID;
  avant?: DocQuelconque;
  apres?: DocQuelconque;
}

export type Regle = (o: OperationResolue, commande: Commande, depot: Depot) => string | undefined;

export class ErreurDepot extends Error {
  constructor(message: string, public code: "droit" | "regle" | "introuvable" | "annulation") {
    super(message);
    this.name = "ErreurDepot";
  }
}

export interface OptionsDepot {
  /** Date et heure courantes, au format ISO */
  horloge?: () => string;
  /** Renvoie un message si l'acteur n'a pas le droit de faire l'opération */
  autoriser?: Regle;
  /** Règles d'intégrité : renvoient un message si l'opération est refusée */
  regles?: Regle[];
  /** Canal de diffusion entre onglets */
  canal?: { postMessage(m: unknown): void; addEventListener(type: "message", rappel: (e: { data: unknown }) => void): void } | null;
}

interface MessageDiffusion {
  docs: EcritureDoc[];
  journal: EntreeJournal[];
  meta: Record<string, unknown>;
}

const ORIGINES_SYSTEME: Origine[] = ["migration", "systeme"];

export class Depot {
  private docs = new Map<NomCollection, Map<ID, DocQuelconque>>();
  private versions = new Map<string, number>();
  private listes = new Map<string, { version: number; liste: DocQuelconque[] }>();
  private abonnes = new Set<() => void>();
  private ecouteurs = new Set<(e: EntreeJournal) => void>();
  private meta: Record<string, unknown> = {};
  private seq = 0;
  private file: Promise<void> = Promise.resolve();
  private groupe: { entree: EntreeJournal; ecritures: Map<string, EcritureDoc>; commande: Commande } | null = null;
  private horloge: () => string;

  journal: EntreeJournal[] = [];
  /** Personne au nom de laquelle les écritures sont faites */
  acteurId: ID | undefined;
  /** Dernière erreur d'enregistrement (quota dépassé, base inaccessible…) */
  erreurPersistance: Error | null = null;
  ouvert = false;

  constructor(private stockage: Stockage, private options: OptionsDepot = {}) {
    this.horloge = options.horloge ?? (() => new Date().toISOString());
    for (const c of COLLECTIONS) this.docs.set(c, new Map());
    options.canal?.addEventListener("message", (e) => this.recevoir(e.data as MessageDiffusion));
  }

  // -------------------------------------------------------------------------
  // Ouverture
  // -------------------------------------------------------------------------

  async ouvrir(): Promise<void> {
    const contenu = await this.stockage.ouvrir();
    for (const c of COLLECTIONS) this.docs.get(c)!.clear();
    for (const { collection, doc } of contenu.docs) this.docs.get(collection)?.set(doc.id, doc);
    this.journal = contenu.journal.sort((a, b) => a.seq - b.seq);
    this.seq = this.journal.at(-1)?.seq ?? 0;
    this.meta = contenu.meta;
    this.ouvert = true;
    this.versions.clear();
    this.listes.clear();
    this.notifier();
  }

  estVide(): boolean {
    return COLLECTIONS.every((c) => this.docs.get(c)!.size === 0);
  }

  // -------------------------------------------------------------------------
  // Lecture
  // -------------------------------------------------------------------------

  version(cle: string): number {
    return this.versions.get(cle) ?? 0;
  }

  private liste(cle: string, calcul: () => DocQuelconque[]): DocQuelconque[] {
    const v = this.version(cle);
    const cache = this.listes.get(cle);
    if (cache && cache.version === v) return cache.liste;
    const liste = calcul();
    this.listes.set(cle, { version: v, liste });
    return liste;
  }

  /** Tous les enregistrements d'une collection (tableau stable tant que rien ne change) */
  tous<C extends NomCollection>(c: C): Doc<C>[] {
    return this.liste(c, () => [...this.docs.get(c)!.values()]) as Doc<C>[];
  }

  /** Enregistrements d'une collection rattachés à un projet */
  parProjet<C extends NomCollection>(c: C, projetId: ID): Doc<C>[] {
    return this.liste(`${c}|${projetId}`, () => [...this.docs.get(c)!.values()].filter((d) => d.projetId === projetId)) as Doc<C>[];
  }

  parId<C extends NomCollection>(c: C, id: ID | undefined | null): Doc<C> | undefined {
    return id ? (this.docs.get(c)!.get(id) as Doc<C> | undefined) : undefined;
  }

  acteur(): Personne | undefined {
    return this.parId("personnes", this.acteurId);
  }

  lireMeta<T>(cle: string, defaut: T): T {
    return (this.meta[cle] as T | undefined) ?? defaut;
  }

  ecrireMeta(cle: string, valeur: unknown): void {
    this.meta[cle] = valeur;
    this.incrementer(`meta|${cle}`);
    this.persister({ meta: { [cle]: valeur } });
    this.notifier();
  }

  abonner(rappel: () => void): () => void {
    this.abonnes.add(rappel);
    return () => this.abonnes.delete(rappel);
  }

  /** Appelé après chaque entrée de journal (notifications, index de recherche…) */
  surEntree(rappel: (e: EntreeJournal) => void): () => void {
    this.ecouteurs.add(rappel);
    return () => this.ecouteurs.delete(rappel);
  }

  // -------------------------------------------------------------------------
  // Écriture
  // -------------------------------------------------------------------------

  ajouter<C extends NomCollection>(c: C, valeur: Doc<C>, options: OptionsEcriture & { libelle?: string } = {}): Doc<C> {
    this.executer({ ...options, libelle: options.libelle ?? `Création : ${designation(c, valeur)}`, operations: [{ op: "creer", collection: c, valeur }] });
    return valeur;
  }

  modifier<C extends NomCollection>(c: C, id: ID, patch: Partial<Doc<C>>, options: OptionsEcriture & { libelle?: string } = {}): void {
    const avant = this.parId(c, id);
    this.executer({ ...options, libelle: options.libelle ?? `Modification : ${avant ? designation(c, avant) : id}`, operations: [{ op: "modifier", collection: c, id, patch: patch as Record<string, unknown> }] });
  }

  supprimer<C extends NomCollection>(c: C, id: ID, options: OptionsEcriture & { libelle?: string } = {}): void {
    const avant = this.parId(c, id);
    this.executer({ ...options, libelle: options.libelle ?? `Suppression : ${avant ? designation(c, avant) : id}`, operations: [{ op: "supprimer", collection: c, id }] });
  }

  /**
   * Regroupe plusieurs écritures en une seule entrée de journal, annulable en une fois.
   * Si `action` échoue, tout ce qu'elle a écrit est défait.
   */
  grouper<T>(libelle: string, action: () => T, options: OptionsEcriture = {}): T {
    if (this.groupe) return action();
    const commande: Commande = { ...options, libelle, operations: [] };
    this.groupe = { entree: this.nouvelleEntree(commande), ecritures: new Map(), commande };
    const g = this.groupe;
    try {
      const resultat = action();
      this.groupe = null;
      this.cloturer(g.entree, [...g.ecritures.values()], commande);
      return resultat;
    } catch (erreur) {
      this.groupe = null;
      for (const c of [...g.entree.changements].reverse()) this.defaire(c);
      this.notifier();
      throw erreur;
    }
  }

  /** Exécute une commande : droits, règles, journal, enregistrement. Synchrone en mémoire. */
  executer(commande: Commande): EntreeJournal | null {
    if (this.groupe) {
      const g = this.groupe;
      const { changements, ecritures } = this.appliquer(commande);
      g.entree.changements.push(...changements);
      for (const e of ecritures) g.ecritures.set(`${e.collection}|${e.id}`, e);
      this.notifier();
      return null;
    }
    const entree = this.nouvelleEntree(commande);
    const { changements, ecritures } = this.appliquer(commande);
    if (changements.length === 0) return null;
    entree.changements = changements;
    this.cloturer(entree, ecritures, commande);
    return entree;
  }

  private nouvelleEntree(c: Commande): EntreeJournal {
    return {
      seq: 0, date: this.horloge(), acteurId: this.acteurId, origine: c.origine ?? "saisie", libelle: c.libelle,
      projetId: c.projetId, motif: c.motif, changements: [], irreversible: c.irreversible || c.sansDetail || undefined,
    };
  }

  /** Vérifie puis applique en mémoire les opérations d'une commande */
  private appliquer(commande: Commande): { changements: Changement[]; ecritures: EcritureDoc[] } {
    const resolues: OperationResolue[] = [];
    // 1. Résolution et contrôles, sans rien modifier : une commande refusée ne laisse aucune trace
    const vue = new Map<string, DocQuelconque | undefined>();
    const lire = (c: NomCollection, id: ID) => (vue.has(`${c}|${id}`) ? vue.get(`${c}|${id}`) : this.docs.get(c)!.get(id));
    for (const o of commande.operations) {
      const id = o.op === "creer" ? o.valeur.id : o.id;
      const avant = lire(o.collection, id);
      let apres: DocQuelconque | undefined;
      if (o.op === "creer") {
        if (avant) throw new ErreurDepot(`Un enregistrement « ${id} » existe déjà.`, "regle");
        apres = o.valeur;
      } else if (!avant) {
        throw new ErreurDepot(`Enregistrement introuvable : ${o.collection} ${id}.`, "introuvable");
      } else if (o.op === "modifier") {
        apres = { ...avant } as DocQuelconque;
        for (const [k, v] of Object.entries(o.patch)) {
          if (v === undefined) delete (apres as Record<string, unknown>)[k];
          else (apres as Record<string, unknown>)[k] = v;
        }
        if (egal(avant, apres)) continue;
      }
      const r: OperationResolue = { op: o.op, collection: o.collection, id, avant, apres };
      this.controler(r, commande);
      vue.set(`${o.collection}|${id}`, apres);
      resolues.push(r);
    }
    // 2. Application
    const changements: Changement[] = [];
    const ecritures: EcritureDoc[] = [];
    for (const r of resolues) {
      const magasin = this.docs.get(r.collection)!;
      if (r.apres) magasin.set(r.id, r.apres);
      else magasin.delete(r.id);
      this.toucher(r.collection, r.avant?.projetId, r.apres?.projetId);
      ecritures.push({ collection: r.collection, id: r.id, doc: r.apres ?? null });
      const reference = (r.apres ?? r.avant)!;
      changements.push({
        collection: r.collection, id: r.id, op: r.op, objet: designation(r.collection, reference),
        projetId: r.collection === "projets" ? r.id : reference.projetId,
        champs: r.op === "modifier" ? champsModifies(r.avant!, r.apres!) : undefined,
        avant: r.op === "supprimer" ? r.avant : undefined,
      });
    }
    return { changements, ecritures };
  }

  private controler(r: OperationResolue, commande: Commande): void {
    if (!ORIGINES_SYSTEME.includes(commande.origine ?? "saisie")) {
      const refus = this.options.autoriser?.(r, commande, this);
      if (refus) throw new ErreurDepot(refus, "droit");
    }
    for (const regle of this.options.regles ?? []) {
      const refus = regle(r, commande, this);
      if (refus) throw new ErreurDepot(refus, "regle");
    }
  }

  private cloturer(entree: EntreeJournal, ecritures: EcritureDoc[], commande: Commande): void {
    if (entree.changements.length === 0) return;
    entree.seq = ++this.seq;
    entree.projetId ??= entree.changements.find((c) => c.projetId)?.projetId;
    if (commande.sansDetail) {
      const compter = (op: Changement["op"]) => entree.changements.filter((c) => c.op === op).length;
      entree.volumes = { crees: compter("creer"), modifies: compter("modifier"), supprimes: compter("supprimer") };
      entree.changements = [];
    }
    this.journal.push(entree);
    this.incrementer("journal");
    this.persister({ docs: ecritures, journal: [entree] });
    this.notifier();
    for (const e of this.ecouteurs) e(entree);
  }

  /** Défait un changement en mémoire (échec d'un groupe) */
  private defaire(c: Changement): void {
    const magasin = this.docs.get(c.collection)!;
    const courant = magasin.get(c.id);
    if (c.op === "creer") magasin.delete(c.id);
    else if (c.op === "supprimer" && c.avant) magasin.set(c.id, c.avant);
    else if (c.op === "modifier" && courant) {
      const restaure = { ...courant } as Record<string, unknown>;
      for (const ch of c.champs ?? []) {
        if (ch.avant === undefined) delete restaure[ch.chemin];
        else restaure[ch.chemin] = ch.avant;
      }
      magasin.set(c.id, restaure as DocQuelconque);
    }
    this.toucher(c.collection, c.projetId, magasin.get(c.id)?.projetId);
  }

  // -------------------------------------------------------------------------
  // Annulation
  // -------------------------------------------------------------------------

  /** Dernière entrée que l'acteur courant peut annuler */
  derniereAnnulable(): EntreeJournal | undefined {
    for (let i = this.journal.length - 1; i >= 0 && i >= this.journal.length - 50; i--) {
      const e = this.journal[i];
      if (e.acteurId !== this.acteurId || e.annule || e.annuleePar) continue;
      return e.irreversible ? undefined : e;
    }
    return undefined;
  }

  /** Annule une entrée du journal par l'écriture inverse, elle-même journalisée */
  annuler(seq: number): EntreeJournal {
    const cible = this.journal.find((e) => e.seq === seq);
    if (!cible) throw new ErreurDepot("Entrée de journal introuvable.", "annulation");
    if (cible.irreversible) throw new ErreurDepot("Cette opération ne peut pas être annulée.", "annulation");
    if (cible.annuleePar) throw new ErreurDepot("Cette opération a déjà été annulée.", "annulation");
    const operations: Operation[] = [];
    for (const c of [...cible.changements].reverse()) {
      const courant = this.docs.get(c.collection)!.get(c.id) as Record<string, unknown> | undefined;
      if (c.op === "creer") {
        if (courant) operations.push({ op: "supprimer", collection: c.collection, id: c.id });
      } else if (c.op === "supprimer") {
        if (courant) throw new ErreurDepot(`« ${c.objet} » a été recréé depuis.`, "annulation");
        operations.push({ op: "creer", collection: c.collection, valeur: c.avant! });
      } else {
        if (!courant) throw new ErreurDepot(`« ${c.objet} » a été supprimé depuis.`, "annulation");
        const patch: Record<string, unknown> = {};
        for (const ch of c.champs ?? []) {
          if (!egal(courant[ch.chemin], ch.apres)) throw new ErreurDepot(`« ${c.objet} » a été modifié depuis : annulation impossible.`, "annulation");
          patch[ch.chemin] = ch.avant;
        }
        operations.push({ op: "modifier", collection: c.collection, id: c.id, patch });
      }
    }
    const commande: Commande = { libelle: `Annulation : ${cible.libelle}`, operations, motif: "Annulation", projetId: cible.projetId };
    const entree = this.nouvelleEntree(commande);
    const { changements, ecritures } = this.appliquer(commande);
    entree.changements = changements;
    entree.annule = cible.seq;
    entree.irreversible = true;
    entree.seq = ++this.seq;
    cible.annuleePar = entree.seq;
    this.journal.push(entree);
    this.incrementer("journal");
    this.persister({ docs: ecritures, journal: [entree, cible] });
    this.notifier();
    return entree;
  }

  // -------------------------------------------------------------------------
  // Fichiers (photographies, archives)
  // -------------------------------------------------------------------------

  async ajouterFichier(f: Omit<FichierStocke, "date">): Promise<void> {
    await this.stockage.ecrireFichier({ ...f, date: this.horloge() });
    this.incrementer("fichiers");
    this.notifier();
  }

  lireFichier(id: ID) { return this.stockage.lireFichier(id); }
  listerFichiers() { return this.stockage.listerFichiers(); }

  async supprimerFichier(id: ID): Promise<void> {
    await this.stockage.supprimerFichier(id);
    this.incrementer("fichiers");
    this.notifier();
  }

  // -------------------------------------------------------------------------
  // Sauvegarde et restauration
  // -------------------------------------------------------------------------

  /** Contenu complet de la base (hors fichiers), pour l'export */
  exporter(): { docs: Partial<Record<NomCollection, DocQuelconque[]>>; journal: EntreeJournal[]; meta: Record<string, unknown> } {
    const docs: Partial<Record<NomCollection, DocQuelconque[]>> = {};
    for (const c of COLLECTIONS) if (this.docs.get(c)!.size) docs[c] = [...this.docs.get(c)!.values()];
    return { docs, journal: this.journal, meta: this.meta };
  }

  /** Remplace toute la base par le contenu fourni */
  async remplacer(contenu: { docs: Partial<Record<NomCollection, DocQuelconque[]>>; journal?: EntreeJournal[]; meta?: Record<string, unknown> }): Promise<void> {
    await this.file;
    await this.stockage.vider();
    const docs: EcritureDoc[] = [];
    for (const c of COLLECTIONS) for (const doc of contenu.docs[c] ?? []) docs.push({ collection: c, id: doc.id, doc });
    await this.stockage.ecrire({ docs, journal: contenu.journal ?? [], meta: contenu.meta ?? {} });
    await this.ouvrir();
  }

  async vider(): Promise<void> {
    await this.remplacer({ docs: {} });
  }

  // -------------------------------------------------------------------------
  // Mécanique interne
  // -------------------------------------------------------------------------

  private incrementer(cle: string): void {
    this.versions.set(cle, this.version(cle) + 1);
  }

  private toucher(c: NomCollection, ...projets: (ID | undefined)[]): void {
    this.incrementer(c);
    for (const p of new Set(projets)) if (p) this.incrementer(`${c}|${p}`);
  }

  private notifier(): void {
    for (const a of this.abonnes) a();
  }

  private persister(lot: LotEcriture): void {
    this.file = this.file
      .then(() => this.stockage.ecrire(lot))
      .then(() => { this.options.canal?.postMessage({ docs: lot.docs ?? [], journal: lot.journal ?? [], meta: lot.meta ?? {} } satisfies MessageDiffusion); })
      .catch((e: unknown) => {
        this.erreurPersistance = e instanceof Error ? e : new Error(String(e));
        this.incrementer("erreur");
        this.notifier();
      });
  }

  /** Attend que toutes les écritures en cours soient enregistrées */
  attendrePersistance(): Promise<void> {
    return this.file;
  }

  /** Applique les écritures faites dans un autre onglet */
  private recevoir(m: MessageDiffusion): void {
    for (const e of m.docs) {
      const magasin = this.docs.get(e.collection);
      if (!magasin) continue;
      const avant = magasin.get(e.id);
      if (e.doc) magasin.set(e.id, e.doc);
      else magasin.delete(e.id);
      this.toucher(e.collection, avant?.projetId, e.doc?.projetId);
    }
    for (const j of m.journal) {
      const i = this.journal.findIndex((x) => x.seq === j.seq);
      if (i >= 0) this.journal[i] = j;
      else this.journal.push(j);
      this.seq = Math.max(this.seq, j.seq);
    }
    for (const [cle, valeur] of Object.entries(m.meta)) {
      this.meta[cle] = valeur;
      this.incrementer(`meta|${cle}`);
    }
    if (m.journal.length) this.incrementer("journal");
    this.notifier();
  }
}
