// Commentaires, mentions et notifications. Les notifications naissent des événements du journal
// (une validation qui attend quelqu'un, un mandat soumis à signature, une mention, une tâche
// attribuée) : aucun écran n'a à penser à prévenir qui que ce soit.
import type { ID, Personne, RefObjet } from "../types";
import type { CanalNotification, Commentaire, Notification } from "./types";

/**
 * Personnes mentionnées dans un texte par « @Prénom Nom ». Les noms les plus longs sont cherchés
 * d'abord et « consomment » le texte : « @Anne Martin » ne mentionne pas aussi « Anne ».
 */
export function extraireMentions(texte: string, personnes: Pick<Personne, "id" | "nom">[]): ID[] {
  const bas = texte.toLowerCase();
  const pris: [number, number][] = [];
  const trouves: { id: ID; position: number }[] = [];
  for (const p of [...personnes].filter((x) => x.nom.trim()).sort((a, b) => b.nom.length - a.nom.length)) {
    const motif = `@${p.nom.toLowerCase()}`;
    for (let i = bas.indexOf(motif); i >= 0; i = bas.indexOf(motif, i + 1)) {
      const fin = i + motif.length;
      // Le nom doit être entier (« @Anne » n'est pas dans « @Annette ») et ne pas chevaucher un nom plus long
      if (/[\p{L}\p{N}]/u.test(bas[fin] ?? "") || pris.some(([a, b]) => i < b && fin > a)) continue;
      pris.push([i, fin]);
      if (!trouves.some((t) => t.id === p.id)) trouves.push({ id: p.id, position: i });
    }
  }
  return trouves.sort((a, b) => a.position - b.position).map((t) => t.id);
}

export function creerCommentaire(o: { id: ID; cible: RefObjet; projetId?: ID; texte: string; auteurId?: ID; date: string }, personnes: Pick<Personne, "id" | "nom">[]): Commentaire {
  return { ...o, texte: o.texte.trim(), mentions: extraireMentions(o.texte, personnes).filter((id) => id !== o.auteurId) };
}

/** Modifie un commentaire en gardant sa version précédente */
export function modifierCommentaire(c: Commentaire, texte: string, date: string, personnes: Pick<Personne, "id" | "nom">[]): Commentaire {
  if (texte.trim() === c.texte) return c;
  return { ...c, texte: texte.trim(), modifieLe: date, mentions: extraireMentions(texte, personnes).filter((id) => id !== c.auteurId), historique: [...(c.historique ?? []), { date: c.modifieLe ?? c.date, texte: c.texte }] };
}

export const filDe = (commentaires: Commentaire[], cible: RefObjet) => commentaires.filter((c) => c.cible.collection === cible.collection && c.cible.id === cible.id).sort((a, b) => a.date.localeCompare(b.date));

export type TypeNotification = Notification["type"];
export const TYPES_NOTIFICATION: TypeNotification[] = ["Validation", "Signature", "Mention", "Tâche", "Échéance", "Partage", "Information"];
export const CANAUX: CanalNotification[] = ["Application", "Teams (simulé)", "Courriel (simulé)"];

/** Préférences d'une personne : pour chaque type d'événement, les canaux retenus */
export type Preferences = Partial<Record<TypeNotification, CanalNotification[]>>;
export const PREFERENCES_DEFAUT: Preferences = { Validation: ["Application", "Courriel (simulé)"], Signature: ["Application", "Courriel (simulé)"], Mention: ["Application", "Teams (simulé)"], "Tâche": ["Application"], "Échéance": ["Application"], Partage: ["Application", "Courriel (simulé)"], Information: ["Application"] };

export const canauxDe = (preferences: Preferences | undefined, type: TypeNotification): CanalNotification[] => preferences?.[type] ?? PREFERENCES_DEFAUT[type] ?? ["Application"];

export interface Evenement {
  destinataireId: ID;
  type: TypeNotification;
  titre: string;
  texte?: string;
  lien?: string;
  projetId?: ID;
}

/**
 * Notifications à émettre pour un événement : une par canal retenu par le destinataire. Hors de
 * l'application, le message ne porte ni montant ni contenu : seulement l'objet et le lien.
 */
export function notificationsPour(e: Evenement, preferences: Preferences | undefined, date: string, nouvelId: () => ID): Notification[] {
  return canauxDe(preferences, e.type).map((canal) => ({
    id: nouvelId(), destinataireId: e.destinataireId, date, type: e.type, titre: e.titre, lien: e.lien, projetId: e.projetId, lu: false, canal,
    texte: canal === "Application" ? e.texte : undefined,
  }));
}
