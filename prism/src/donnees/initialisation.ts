// Mise en place de la base : référentiels indispensables, puis l'un des trois départs possibles —
// démonstration, reprise de Chantier+ ou base vide.
import type { Personne, Projet } from "../domaine/types";
import { dataPlatformSimulee } from "./connecteurs/dataPlatformSimulee";
import { importerProjet, synchroniser } from "./connecteurs/synchro";
import { COMPLEMENTS_SOURCE, docsDemo, NUMEROS_DEMO, UTILISATEUR_DEMO } from "./demo";
import { CONFIGURATION, DIRECTIONS, PORTEFEUILLES, PROGRAMMES, TYPES_PROJET } from "./demo/referentiels";
import type { Depot, Operation } from "./depot";
import { convertirChantierPlus, promouvoirAdministrateur, type DocsParCollection, type DonneesChantierPlus } from "./reprise";
import { COLLECTIONS, META } from "./schema";
import { session } from "./session";

/** Crée les référentiels sans lesquels l'application ne peut pas fonctionner */
export function installerReferentiels(depot: Depot, avecExemples = true): void {
  const ops: Operation[] = [];
  for (const t of TYPES_PROJET) if (!depot.parId("typesProjet", t.id)) ops.push({ op: "creer", collection: "typesProjet", valeur: t });
  if (!depot.parId("configurations", CONFIGURATION.id)) ops.push({ op: "creer", collection: "configurations", valeur: CONFIGURATION });
  if (avecExemples && depot.tous("directions").length === 0) {
    for (const d of DIRECTIONS) ops.push({ op: "creer", collection: "directions", valeur: d });
    for (const p of PORTEFEUILLES) ops.push({ op: "creer", collection: "portefeuilles", valeur: p });
    for (const p of PROGRAMMES) ops.push({ op: "creer", collection: "programmes", valeur: p });
  }
  if (ops.length) depot.executer({ libelle: "Installation des référentiels", origine: "systeme", operations: ops, sansDetail: true });
}

function importer(depot: Depot, docs: DocsParCollection, libelle: string): void {
  const operations: Operation[] = [];
  for (const c of COLLECTIONS) {
    for (const doc of docs[c] ?? []) {
      operations.push(depot.parId(c, doc.id)
        ? { op: "modifier", collection: c, id: doc.id, patch: doc as unknown as Record<string, unknown> }
        : { op: "creer", collection: c, valeur: doc });
    }
  }
  if (operations.length) depot.executer({ libelle, origine: "import", operations, sansDetail: true });
}

/** Charge le jeu de démonstration (fictif) et le synchronise avec la source simulée */
export async function chargerDemo(depot: Depot): Promise<void> {
  installerReferentiels(depot);
  importer(depot, docsDemo(), "Chargement des données de démonstration");
  const horodatage = new Date().toISOString();
  for (const numero of NUMEROS_DEMO) await importerProjet(depot, dataPlatformSimulee, numero, horodatage);
  const complements: Operation[] = [];
  for (const p of depot.tous("projets")) {
    const c = p.numeroSource ? COMPLEMENTS_SOURCE[p.numeroSource] : undefined;
    if (c) complements.push({ op: "modifier", collection: "projets", id: p.id, patch: c as Record<string, unknown> });
  }
  depot.executer({ libelle: "Compléments de démonstration", origine: "systeme", operations: complements, sansDetail: true });
  await synchroniser(depot, dataPlatformSimulee, { horodatage });
  session.ecrire({ utilisateurId: UTILISATEUR_DEMO, dernierProjetId: null });
  depot.acteurId = UTILISATEUR_DEMO;
}

export interface RapportReprise {
  projets: number;
  enregistrements: number;
  parCollection: Record<string, number>;
}

/** Reprend des données Chantier+ dans la base (les enregistrements de même identifiant sont remplacés) */
export function reprendreChantierPlus(depot: Depot, source: DonneesChantierPlus): RapportReprise {
  installerReferentiels(depot);
  const docs = convertirChantierPlus(source.donnees);
  const personnes = (docs.personnes ?? []) as Personne[];
  const utilisateurId = source.utilisateurId && personnes.some((p) => p.id === source.utilisateurId) ? source.utilisateurId : personnes[0]?.id;
  if (personnes.length) docs.personnes = promouvoirAdministrateur(personnes, utilisateurId);
  importer(depot, docs, "Reprise des données Chantier+");
  if (source.sharePoint && typeof source.sharePoint === "object") depot.ecrireMeta("sharePoint", source.sharePoint);
  if (utilisateurId && !session.lire().utilisateurId) {
    session.ecrire({ utilisateurId });
    depot.acteurId = utilisateurId;
  }
  const parCollection = Object.fromEntries(Object.entries(docs).map(([c, l]) => [c, l?.length ?? 0]));
  return { projets: (docs.projets as Projet[] | undefined)?.length ?? 0, enregistrements: Object.values(parCollection).reduce((s, n) => s + n, 0), parCollection };
}

/** Base vide : seuls les référentiels et le premier utilisateur, administrateur, sont créés */
export function demarrerVide(depot: Depot, nom: string): void {
  installerReferentiels(depot);
  const id = "per-admin";
  depot.ajouter("personnes", { id, nom: nom.trim() || "Administrateur", role: "Directeur de projet", email: "", organisation: "", capacite: 100, acces: { profil: "Administrateur", projets: "tous", modules: {} } }, { origine: "systeme" });
  session.ecrire({ utilisateurId: id, dernierProjetId: null });
  depot.acteurId = id;
}

/**
 * Supprime un projet, ses sous-projets et toutes leurs données, en une seule opération inscrite au
 * journal avec son motif. Renvoie le nombre d'enregistrements supprimés.
 */
export function supprimerProjet(depot: Depot, projetId: string, motif: string): number {
  const ids = new Set<string>([projetId]);
  for (let ajout = true; ajout;) {
    ajout = false;
    for (const p of depot.tous("projets")) if (p.parentId && ids.has(p.parentId) && !ids.has(p.id)) { ids.add(p.id); ajout = true; }
  }
  const racine = depot.parId("projets", projetId);
  let n = 0;
  depot.grouper(`Suppression du projet ${racine?.code ?? projetId}`, () => {
    for (const c of COLLECTIONS) {
      if (c === "projets" || !META[c].parProjet) continue;
      for (const doc of depot.tous(c) as { id: string; projetId?: string }[]) {
        if (doc.projetId && ids.has(doc.projetId)) { depot.supprimer(c, doc.id, { motif }); n++; }
      }
    }
    for (const id of ids) { depot.supprimer("projets", id, { motif }); n++; }
  }, { motif, sansDetail: true });
  return n;
}
