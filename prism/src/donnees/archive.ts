// Archivage d'un projet : ses données structurées sont écrites dans un fichier JSON ouvert et
// documenté (identifiants, relations, historique, manifeste), scellé par une empreinte SHA-256.
// Le projet devient alors non modifiable ; l'archive se relit dans le lecteur intégré et sa
// restaurabilité se contrôle à la demande.
import type { ArchiveRegistre } from "../domaine/socle/types";
import type { ID } from "../domaine/types";
import { sha256 } from "../outils/empreinte";
import type { Depot } from "./depot";
import type { EntreeJournal } from "./journal";
import { familleDe } from "./lectures";
import { COLLECTIONS, META, type DocQuelconque, type NomCollection } from "./schema";

export const FORMAT_ARCHIVE = "prism-archive";
export const VERSION_ARCHIVE = 1;

const DESCRIPTION = [
  "Archive d'un projet PRISM, au format JSON (UTF-8).",
  "« projets » : le projet et ses sous-projets (relation par « parentId »).",
  "« collections » : les enregistrements du projet, par collection ; chaque enregistrement porte son identifiant « id » et « projetId ».",
  "« references » : les personnes, entreprises et référentiels cités par ces enregistrements, pour que l'archive se lise seule.",
  "« journal » : l'historique des modifications du projet (auteur, date, origine, ancienne et nouvelle valeur).",
  "« manifeste » : le nombre d'enregistrements par collection, vérifié à chaque contrôle.",
  "Les documents ne sont pas copiés : ils restent dans SharePoint, selon ses règles de conservation ; l'archive garde leurs liens.",
  "L'empreinte SHA-256 du fichier est conservée dans le registre des archives de PRISM.",
].join(" ");

export interface ContenuArchive {
  format: typeof FORMAT_ARCHIVE;
  version: number;
  description: string;
  date: string;
  auteur?: string;
  projet: { id: ID; code: string; nom: string };
  projets: DocQuelconque[];
  collections: Partial<Record<NomCollection, DocQuelconque[]>>;
  references: Partial<Record<NomCollection, DocQuelconque[]>>;
  journal: EntreeJournal[];
  manifeste: Record<string, number>;
}

/** Collections de référence, communes à tous les projets, dont l'archive garde ce qui est cité */
const REFERENCES: NomCollection[] = ["personnes", "entreprises", "directions", "portefeuilles", "programmes", "typesProjet"];

export function construireArchive(depot: Depot, projetId: ID, date: string): ContenuArchive {
  const racine = depot.parId("projets", projetId);
  if (!racine) throw new Error("Projet introuvable.");
  const ids = new Set(familleDe(depot, projetId));
  const collections: ContenuArchive["collections"] = {};
  for (const c of COLLECTIONS) {
    if (c === "projets" || !META[c].parProjet || c === "archives") continue;
    const docs = (depot.tous(c) as DocQuelconque[]).filter((d) => d.projetId && ids.has(d.projetId));
    if (docs.length) collections[c] = docs;
  }
  // Séances transverses (ComInv) : seuls les points qui concernent le projet sont repris
  const seances = depot.tous("seances").filter((s) => (s.projetId && ids.has(s.projetId)) || s.points.some((p) => p.projetId && ids.has(p.projetId)))
    .map((s) => (s.projetId ? s : { ...s, points: s.points.filter((p) => p.projetId && ids.has(p.projetId)) }));
  if (seances.length) collections.seances = seances as unknown as DocQuelconque[];

  const projets = depot.tous("projets").filter((p) => ids.has(p.id)) as unknown as DocQuelconque[];
  const texte = JSON.stringify([projets, collections]);
  const references: ContenuArchive["references"] = {};
  for (const c of REFERENCES) {
    const cites = (depot.tous(c) as DocQuelconque[]).filter((d) => texte.includes(`"${d.id}"`));
    if (cites.length) references[c] = cites.map((d) => (c === "personnes" ? { ...d, acces: undefined } : d));
  }
  const journal = depot.journal.filter((e) => (e.projetId && ids.has(e.projetId)) || e.changements.some((c) => c.projetId && ids.has(c.projetId)));
  const manifeste: Record<string, number> = { projets: projets.length, journal: journal.length };
  for (const [c, docs] of Object.entries(collections)) manifeste[c] = docs!.length;
  return {
    format: FORMAT_ARCHIVE, version: VERSION_ARCHIVE, description: DESCRIPTION, date, auteur: depot.acteur()?.nom,
    projet: { id: racine.id, code: racine.code, nom: racine.nom }, projets, collections, references, journal, manifeste,
  };
}

const idFichier = (archiveId: ID) => `archive-${archiveId}`;

/** Archive le projet : écrit le fichier, l'inscrit au registre et fige le projet et ses sous-projets */
export async function archiverProjet(depot: Depot, projetId: ID, o: { motif?: string; date?: string } = {}): Promise<ArchiveRegistre> {
  const date = o.date ?? new Date().toISOString();
  const contenu = construireArchive(depot, projetId, date);
  const texte = JSON.stringify(contenu, null, 1);
  const id = `arc-${projetId}-${date.replace(/\D/g, "").slice(0, 14)}`;
  const registre: ArchiveRegistre = {
    id, projetId, code: contenu.projet.code, nom: contenu.projet.nom, date, auteurId: depot.acteurId,
    empreinte: await sha256(texte), taille: new TextEncoder().encode(texte).length, manifeste: contenu.manifeste, fichierId: idFichier(id),
  };
  await depot.ajouterFichier({ id: registre.fichierId, nom: `${contenu.projet.code}-archive.json`, type: "application/json", taille: registre.taille, projetId, donnees: new Blob([texte], { type: "application/json" }) });
  depot.grouper(`Archivage du projet ${contenu.projet.code}`, () => {
    depot.ajouter("archives", registre, { motif: o.motif });
    for (const p of contenu.projets) depot.modifier("projets", p.id, { archive: { date, empreinte: registre.empreinte } }, { motif: o.motif });
  }, { motif: o.motif, irreversible: true });
  return registre;
}

async function texteDe(depot: Depot, a: ArchiveRegistre): Promise<string> {
  const f = await depot.lireFichier(a.fichierId);
  if (!f) throw new Error("Le fichier de cette archive est introuvable dans ce navigateur.");
  return f.donnees.text();
}

export interface ResultatControle {
  conforme: boolean;
  /** Ce qui ne correspond pas : empreinte, format, manifeste */
  ecarts: string[];
  contenu?: ContenuArchive;
}

/** Relit l'archive et vérifie qu'elle est intacte et complète (empreinte, format, manifeste) */
export async function verifierArchive(depot: Depot, a: ArchiveRegistre): Promise<ResultatControle> {
  const ecarts: string[] = [];
  let texte: string;
  try { texte = await texteDe(depot, a); } catch (e) { return { conforme: false, ecarts: [e instanceof Error ? e.message : "Fichier illisible."] }; }
  if ((await sha256(texte)) !== a.empreinte) ecarts.push("L'empreinte du fichier ne correspond plus à celle du registre : le fichier a été modifié.");
  let contenu: ContenuArchive | undefined;
  try {
    contenu = JSON.parse(texte) as ContenuArchive;
    if (contenu.format !== FORMAT_ARCHIVE) ecarts.push("Format d'archive inconnu.");
    if ((contenu.version ?? 0) > VERSION_ARCHIVE) ecarts.push("Archive produite par une version plus récente.");
    const reel: Record<string, number> = { projets: contenu.projets.length, journal: contenu.journal.length };
    for (const [c, docs] of Object.entries(contenu.collections)) reel[c] = docs!.length;
    for (const c of new Set([...Object.keys(a.manifeste), ...Object.keys(reel)])) if ((a.manifeste[c] ?? 0) !== (reel[c] ?? 0)) ecarts.push(`« ${c} » : ${reel[c] ?? 0} enregistrement(s) lu(s), ${a.manifeste[c] ?? 0} attendu(s).`);
  } catch { ecarts.push("Le fichier n'est pas un JSON lisible."); contenu = undefined; }
  return { conforme: ecarts.length === 0, ecarts, contenu };
}

/** Contrôle de restaurabilité : vérifie l'archive et consigne le résultat au registre et au journal */
export async function controlerArchive(depot: Depot, a: ArchiveRegistre, date = new Date().toISOString()): Promise<ResultatControle> {
  const r = await verifierArchive(depot, a);
  depot.modifier("archives", a.id, { dernierControle: { date, conforme: r.conforme } }, { libelle: `Contrôle de l'archive ${a.code} : ${r.conforme ? "conforme" : "non conforme"}`, irreversible: true });
  return r;
}

/** Ouvre une archive pour le lecteur ; la consultation est consignée au journal */
export async function ouvrirArchive(depot: Depot, a: ArchiveRegistre): Promise<ResultatControle> {
  const r = await verifierArchive(depot, a);
  depot.consigner(`Consultation de l'archive ${a.code}`, { projetId: a.projetId });
  return r;
}

/** Rend le projet de nouveau modifiable ; l'archive reste au registre */
export function desarchiver(depot: Depot, a: ArchiveRegistre, motif: string): void {
  depot.grouper(`Désarchivage du projet ${a.code}`, () => {
    for (const id of familleDe(depot, a.projetId)) if (depot.parId("projets", id)?.archive) depot.modifier("projets", id, { archive: undefined }, { motif });
  }, { motif });
}

/** Fin de la durée de conservation de l'archive */
export function finConservation(a: ArchiveRegistre, annees: number): string {
  const d = new Date(a.date);
  d.setFullYear(d.getFullYear() + annees);
  return d.toISOString().slice(0, 10);
}

/** Supprime l'archive et les données du projet, une fois la durée de conservation écoulée */
export async function eliminerArchive(depot: Depot, a: ArchiveRegistre, motif: string, jour: string): Promise<void> {
  const annees = depot.parId("configurations", "courante")?.conservationAnnees ?? 10;
  if (jour < finConservation(a, annees)) throw new Error(`Cette archive doit être conservée jusqu'au ${finConservation(a, annees)}.`);
  const ids = new Set(familleDe(depot, a.projetId));
  depot.grouper(`Élimination de l'archive ${a.code}`, () => {
    for (const c of COLLECTIONS) {
      if (c === "projets" || !META[c].parProjet || c === "archives") continue;
      for (const d of depot.tous(c) as DocQuelconque[]) if (d.projetId && ids.has(d.projetId)) depot.supprimer(c, d.id, { origine: "systeme", motif });
    }
    for (const id of ids) depot.supprimer("projets", id, { origine: "systeme", motif });
    depot.supprimer("archives", a.id, { origine: "systeme", motif });
  }, { origine: "systeme", motif, sansDetail: true });
  await depot.supprimerFichier(a.fichierId);
}

export interface ResultatRecherche { collection: string; id: ID; extrait: string }

/** Recherche plein texte dans le contenu d'une archive */
export function chercherDansArchive(contenu: ContenuArchive, requete: string, max = 50): ResultatRecherche[] {
  const termes = requete.toLowerCase().split(/\s+/).filter(Boolean);
  if (!termes.length) return [];
  const out: ResultatRecherche[] = [];
  const examiner = (collection: string, docs: DocQuelconque[]) => {
    for (const d of docs) {
      const texte = JSON.stringify(d);
      const bas = texte.toLowerCase();
      if (!termes.every((t) => bas.includes(t))) continue;
      const i = bas.indexOf(termes[0]);
      out.push({ collection, id: d.id, extrait: texte.slice(Math.max(0, i - 60), i + 100).replace(/[{}"\\]/g, " ").replace(/\s+/g, " ").trim() });
      if (out.length >= max) return;
    }
  };
  examiner("projets", contenu.projets);
  for (const [c, docs] of Object.entries(contenu.collections)) { if (out.length >= max) break; examiner(c, docs!); }
  return out;
}
