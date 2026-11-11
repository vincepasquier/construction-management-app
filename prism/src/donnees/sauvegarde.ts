// Sauvegarde complète de la base dans un fichier ZIP (données, journal, réglages, photographies) et
// restauration. Dans une application sans serveur, c'est la seule protection contre l'effacement
// des données du navigateur : elle doit rester simple et toujours accessible.
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { Depot } from "./depot";
import type { EntreeJournal } from "./journal";
import { importerAncienneSession } from "../domaine/lib/importAncien";
import { lireChantierPlus } from "./reprise";
import type { DocQuelconque, NomCollection } from "./schema";
import type { FichierStocke } from "./stockage";

export const FORMAT_SAUVEGARDE = "prism-sauvegarde";
export const VERSION_SAUVEGARDE = 1;

interface ContenuSauvegarde {
  format: typeof FORMAT_SAUVEGARDE;
  version: number;
  date: string;
  docs: Partial<Record<NomCollection, DocQuelconque[]>>;
  journal: EntreeJournal[];
  meta: Record<string, unknown>;
  fichiers: Omit<FichierStocke, "donnees">[];
}

export async function creerSauvegarde(depot: Depot, date = new Date().toISOString()): Promise<Uint8Array> {
  await depot.attendrePersistance();
  const metaFichiers = await depot.listerFichiers();
  const contenu: ContenuSauvegarde = { format: FORMAT_SAUVEGARDE, version: VERSION_SAUVEGARDE, date, ...depot.exporter(), fichiers: metaFichiers };
  const archive: Record<string, Uint8Array> = { "prism.json": strToU8(JSON.stringify(contenu)) };
  for (const m of metaFichiers) {
    const f = await depot.lireFichier(m.id);
    if (f) archive[`fichiers/${m.id}`] = new Uint8Array(await f.donnees.arrayBuffer());
  }
  return zipSync(archive, { level: 6 });
}

export interface ResumeSauvegarde {
  type: "prism" | "chantier-plus";
  date?: string;
  projets: number;
  enregistrements: number;
  fichiers: number;
}

export type SauvegardeLue =
  | { type: "prism"; resume: ResumeSauvegarde; contenu: ContenuSauvegarde; binaires: Record<string, Uint8Array> }
  | { type: "chantier-plus"; resume: ResumeSauvegarde; brut: unknown };

/** Lit un fichier de sauvegarde PRISM (ZIP ou JSON) ou un export Chantier+, sans rien modifier */
export function lireSauvegarde(octets: Uint8Array): SauvegardeLue {
  let json: string;
  let binaires: Record<string, Uint8Array> = {};
  if (octets[0] === 0x50 && octets[1] === 0x4b) {
    const zip = unzipSync(octets);
    if (!zip["prism.json"]) throw new Error("Ce fichier ZIP n'est pas une sauvegarde PRISM (prism.json absent).");
    json = strFromU8(zip["prism.json"]);
    binaires = zip;
  } else {
    json = strFromU8(octets);
  }
  let o: unknown;
  try { o = JSON.parse(json); } catch { throw new Error("Fichier illisible : ce n'est ni une sauvegarde PRISM ni un export Chantier+."); }
  const c = o as Partial<ContenuSauvegarde>;
  if (c.format === FORMAT_SAUVEGARDE && c.docs) {
    if ((c.version ?? 0) > VERSION_SAUVEGARDE) throw new Error("Cette sauvegarde vient d'une version plus récente de PRISM.");
    const enregistrements = Object.values(c.docs).reduce((s, l) => s + (l?.length ?? 0), 0);
    return {
      type: "prism", contenu: c as ContenuSauvegarde, binaires,
      resume: { type: "prism", date: c.date, projets: c.docs.projets?.length ?? 0, enregistrements, fichiers: c.fichiers?.length ?? 0 },
    };
  }
  const ancien = lireChantierPlus(o);
  if (ancien) {
    const enregistrements = Object.values(ancien.donnees).reduce((s, l) => s + (l?.length ?? 0), 0);
    return { type: "chantier-plus", brut: o, resume: { type: "chantier-plus", projets: ancien.donnees.projets?.length ?? 0, enregistrements, fichiers: 0 } };
  }
  // Export « session » de l'ancienne application de suivi financier : converti en projet Chantier+
  try {
    const { resume: _resume, ...donnees } = importerAncienneSession(o);
    const enregistrements = Object.values(donnees).reduce((s, l) => s + (l?.length ?? 0), 0);
    return { type: "chantier-plus", brut: { donnees }, resume: { type: "chantier-plus", projets: donnees.projets?.length ?? 0, enregistrements, fichiers: 0 } };
  } catch { /* ce n'est pas non plus une session de l'ancienne application */ }
  throw new Error("Fichier non reconnu : ce n'est ni une sauvegarde PRISM, ni un export Chantier+, ni une session de l'ancienne application.");
}

/** Remplace toute la base par le contenu d'une sauvegarde PRISM */
export async function restaurerSauvegarde(depot: Depot, s: Extract<SauvegardeLue, { type: "prism" }>): Promise<void> {
  for (const f of await depot.listerFichiers()) await depot.supprimerFichier(f.id);
  await depot.remplacer({ docs: s.contenu.docs, journal: s.contenu.journal, meta: s.contenu.meta });
  for (const m of s.contenu.fichiers ?? []) {
    const octets = s.binaires[`fichiers/${m.id}`];
    if (octets) await depot.ajouterFichier({ ...m, donnees: new Blob([octets as BlobPart], { type: m.type }) });
  }
}
