// Photographies du chantier : rangées dans le magasin de fichiers du navigateur, à part des données.
// Un constat, une réserve ou une journée du journal n'en garde que les identifiants.
import { nouvelId } from "../domaine/lib/id";
import type { ID } from "../domaine/types";
import { compresserPhoto } from "../outils/photo";
import type { Depot } from "./depot";
import type { FichierStocke } from "./stockage";

const PREFIXE = "photo";
export const estPhoto = (f: { id: ID }) => f.id.startsWith(`${PREFIXE}-`);

/** Compresse puis range une photo ; rend son identifiant */
export async function ajouterPhoto(depot: Depot, fichier: Blob & { name?: string }, projetId: ID): Promise<ID> {
  const donnees = await compresserPhoto(fichier);
  const id = nouvelId(PREFIXE);
  await depot.ajouterFichier({ id, nom: fichier.name ?? `${id}.jpg`, type: donnees.type || fichier.type || "image/jpeg", taille: donnees.size, projetId, donnees });
  return id;
}

/** Identifiants de toutes les photos citées par un constat, une réserve ou le journal */
export function photosReferencees(depot: Depot): Set<ID> {
  const ids = new Set<ID>();
  for (const c of depot.tous("constats")) for (const p of c.photos) ids.add(p.fichierId);
  for (const r of depot.tous("reserves")) for (const p of r.photos) ids.add(p);
  for (const j of depot.tous("journalChantier")) for (const p of j.photos) ids.add(p);
  return ids;
}

export interface EspacePhotos { nombre: number; octets: number; orphelines: Omit<FichierStocke, "donnees">[]; quota?: number; utilise?: number }

/** Place prise par les photos (d'un projet, ou de toute la base) et photos que plus rien ne cite */
export async function espacePhotos(depot: Depot, projetId?: ID): Promise<EspacePhotos> {
  const toutes = (await depot.listerFichiers()).filter(estPhoto);
  const citees = photosReferencees(depot);
  const photos = projetId ? toutes.filter((f) => f.projetId === projetId) : toutes;
  const out: EspacePhotos = { nombre: photos.length, octets: photos.reduce((t, f) => t + f.taille, 0), orphelines: photos.filter((f) => !citees.has(f.id)) };
  try {
    const e = await globalThis.navigator?.storage?.estimate?.();
    if (e) { out.quota = e.quota; out.utilise = e.usage; }
  } catch { /* estimation indisponible : on s'en passe */ }
  return out;
}

/** Supprime les photos que plus aucun enregistrement ne cite ; rend leur nombre */
export async function purgerPhotosOrphelines(depot: Depot, projetId?: ID): Promise<number> {
  const { orphelines } = await espacePhotos(depot, projetId);
  for (const f of orphelines) await depot.supprimerFichier(f.id);
  return orphelines.length;
}

/** Supprime toutes les photos d'un ensemble de projets (élimination définitive) */
export async function supprimerPhotosDesProjets(depot: Depot, projetIds: Iterable<ID>): Promise<number> {
  const ids = new Set(projetIds);
  const cibles = (await depot.listerFichiers()).filter((f) => estPhoto(f) && f.projetId && ids.has(f.projetId));
  for (const f of cibles) await depot.supprimerFichier(f.id);
  return cibles.length;
}

/** Part du quota du navigateur déjà utilisée, de 0 à 1 (indéfini si le navigateur ne le dit pas) */
export const partQuota = (e: EspacePhotos) => (e.quota && e.utilise !== undefined ? e.utilise / e.quota : undefined);
