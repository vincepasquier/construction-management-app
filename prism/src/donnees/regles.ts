// Droits et règles d'intégrité appliqués par le dépôt à chaque écriture.
import { peut } from "../domaine/socle/droits";
import { commentaireExige, precedente, variation } from "../domaine/socle/periodes";
import type { Mandat, PeriodeFinanciere } from "../domaine/socle/types";
import type { EntreeJournalChantier } from "../domaine/types-chantier";
import type { Regle } from "./depot";
import { META, moduleDe } from "./schema";

/** L'acteur a-t-il le droit d'écrire cet enregistrement ? */
export const autoriser: Regle = (o, _commande, depot) => {
  const acteur = depot.acteur();
  if (!acteur) return undefined;
  const meta = META[o.collection];
  if (meta.personnelle) return undefined;
  const reference = (o.apres ?? o.avant)!;
  const projetId = o.collection === "projets" ? o.id : reference.projetId;
  const projet = projetId ? depot.parId("projets", projetId) ?? (o.collection === "projets" ? (reference as never) : undefined) : undefined;
  const module = moduleDe(o.collection, reference);
  if (peut(acteur, "ecrire", module, projet)) return undefined;
  return `Votre profil ne permet pas de modifier « ${meta.libelle.toLowerCase()} »${projet ? " sur ce projet" : ""}.`;
};

/** Un projet archivé est figé : seule sa désarchivation reste possible */
const projetArchive: Regle = (o, commande, depot) => {
  if (commande.origine === "systeme" || o.collection === "archives") return undefined;
  const reference = (o.apres ?? o.avant)!;
  const projetId = o.collection === "projets" ? o.id : reference.projetId;
  const projet = projetId ? depot.parId("projets", projetId) : undefined;
  if (!projet?.archive) return undefined;
  if (o.collection === "projets" && o.op === "modifier" && !(o.apres as { archive?: unknown }).archive) return undefined;
  return "Ce projet est archivé : il n'est plus modifiable.";
};

/** Une clôture mensuelle et une période financière sont des photos : seul leur commentaire se corrige */
const photosFigees: Regle = (o) => {
  if ((o.collection !== "clotures" && o.collection !== "periodesFinancieres") || o.op !== "modifier") return undefined;
  const a = o.avant as unknown as Record<string, unknown>, b = o.apres as unknown as Record<string, unknown>;
  const autres = Object.keys({ ...a, ...b }).filter((k) => k !== "commentaire" && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  return autres.length ? "Une clôture est une photo figée : seul son commentaire peut être corrigé." : undefined;
};

/** Un mandat signé ne se modifie plus : on en crée une nouvelle version */
const mandatSigne: Regle = (o, commande) => {
  // L'élimination d'un projet entier (fin de conservation, suppression par un administrateur) passe par le système
  if (o.collection !== "mandats" || o.op === "creer" || commande.origine === "systeme") return undefined;
  const avant = o.avant as unknown as Mandat;
  if (avant.statut !== "Signé" && avant.statut !== "Remplacé") return undefined;
  if (o.op === "supprimer") return "Un mandat signé est conservé : il ne peut pas être supprimé.";
  const apres = o.apres as unknown as Mandat;
  return JSON.stringify(avant.contenu) !== JSON.stringify(apres.contenu) || JSON.stringify(avant.signatures) !== JSON.stringify(apres.signatures)
    ? "Un mandat signé ne se modifie plus : créez une nouvelle version."
    : undefined;
};

const journalVerrouille: Regle = (o, commande) => {
  if (o.collection !== "journalChantier" || o.op === "creer" || commande.origine === "systeme") return undefined;
  return (o.avant as unknown as EntreeJournalChantier).verrouillee ? "Cette journée du journal de chantier est verrouillée." : undefined;
};

/** La suppression d'une donnée sensible exige un motif, conservé dans le journal */
const motifObligatoire: Regle = (o, commande) => {
  if (o.op !== "supprimer" || !META[o.collection].sensible) return undefined;
  if (commande.origine && commande.origine !== "saisie") return undefined;
  return commande.motif?.trim() ? undefined : `Un motif est exigé pour supprimer « ${META[o.collection].libelle.toLowerCase()} ».`;
};

/** Arrêter une période dont l'atterrissage a bougé au-delà du seuil exige un commentaire */
const periodeCommentee: Regle = (o, commande, depot) => {
  if (o.collection !== "periodesFinancieres" || o.op !== "creer") return undefined;
  if (commande.origine && commande.origine !== "saisie") return undefined;
  const p = o.apres as unknown as PeriodeFinanciere;
  if (p.commentaire?.trim()) return undefined;
  const seuil = depot.parId("configurations", "courante")?.seuilVariationPct ?? 2;
  const v = variation(precedente(depot.parProjet("periodesFinancieres", p.projetId), p.mois)?.valeurs, p.valeurs);
  return commentaireExige(v, seuil) ? `L'atterrissage a varié de plus de ${seuil} % depuis la période précédente : un commentaire est exigé.` : undefined;
};

export const REGLES: Regle[] = [projetArchive, photosFigees, mandatSigne, journalVerrouille, motifObligatoire, periodeCommentee];
