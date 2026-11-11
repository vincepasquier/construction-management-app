// Droits et règles d'intégrité appliqués par le dépôt à chaque écriture.
import { peut } from "../domaine/socle/droits";
import { commentaireExige, precedente, variation } from "../domaine/socle/periodes";
import type { Mandat, PeriodeFinanciere } from "../domaine/socle/types";
import { regieFigee } from "../domaine/lib/chantier";
import type { EntreeJournalChantier, Regie } from "../domaine/types-chantier";
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

const seulsChamps = (avant: object, apres: object, permis: string[]) => {
  const a = avant as Record<string, unknown>, b = apres as Record<string, unknown>;
  return Object.keys({ ...a, ...b }).every((k) => permis.includes(k) || JSON.stringify(a[k]) === JSON.stringify(b[k]));
};

/**
 * Une journée verrouillée du journal de chantier ne se modifie plus. Seul un administrateur peut la
 * rouvrir, en donnant un motif : la réouverture reste ainsi lisible dans le journal d'audit.
 */
const journalVerrouille: Regle = (o, commande, depot) => {
  if (o.collection !== "journalChantier" || o.op === "creer" || commande.origine === "systeme") return undefined;
  if (!(o.avant as unknown as EntreeJournalChantier).verrouillee) return undefined;
  const reouverture = o.op === "modifier" && (o.apres as unknown as EntreeJournalChantier).verrouillee === false && seulsChamps(o.avant!, o.apres!, ["verrouillee"]);
  if (reouverture) {
    if (depot.acteur()?.acces?.profil !== "Administrateur") return "Seul un administrateur peut rouvrir une journée verrouillée du journal de chantier.";
    return commande.motif?.trim() ? undefined : "Rouvrir une journée verrouillée exige un motif.";
  }
  return "Cette journée du journal de chantier est verrouillée.";
};

/** Un bon de régie validé ou facturé est contradictoire : seuls son statut et sa facture évoluent */
const regieValidee: Regle = (o, commande) => {
  if (o.collection !== "regies" || o.op === "creer" || commande.origine === "systeme") return undefined;
  const avant = o.avant as unknown as Regie;
  if (!regieFigee(avant)) return undefined;
  if (o.op === "supprimer") return "Un bon de régie validé ne se supprime pas : contestez-le ou rouvrez-le d'abord.";
  return seulsChamps(o.avant!, o.apres!, ["statut", "factureId", "remarques", "valideParId", "dateValidation"]) ? undefined : "Ce bon de régie est validé : rouvrez-le avant d'en modifier le contenu.";
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

export const REGLES: Regle[] = [projetArchive, photosFigees, mandatSigne, journalVerrouille, regieValidee, motifObligatoire, periodeCommentee];
