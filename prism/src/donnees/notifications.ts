// Moteur de notifications : il écoute le journal et prévient les personnes concernées. Il n'écrit
// que dans la collection « notifications », avec l'origine « système », et ignore ses propres écritures.
import { aujourdhui } from "../domaine/lib/format";
import { nouvelId } from "../domaine/lib/id";
import { etapesCourantes } from "../domaine/lib/validations";
import { notificationsPour, type Evenement, type Preferences } from "../domaine/socle/collaboration";
import type { Commentaire, DemandePartage, Mandat } from "../domaine/socle/types";
import type { Action, CircuitValidation } from "../domaine/types";
import type { Depot } from "./depot";
import type { Changement, EntreeJournal } from "./journal";

export const clePreferences = (personneId: string) => `notifications|${personneId}`;

const lienProjet = (projetId: string | undefined, sous: string) => (projetId ? `/projets/${projetId}/${sous}` : undefined);

/** Lien vers l'objet commenté */
function lienCible(c: Commentaire): string | undefined {
  const pages: Record<string, string> = { projets: "", risques: "risques", contrats: `contrats/${c.cible.id}`, appelsOffres: `appels-offres/${c.cible.id}`, rapports: "rapports", mandats: "mandat", decisions: "decisions", validations: "validations", actions: "taches" };
  const sous = pages[c.cible.collection];
  return sous === undefined || !c.projetId ? undefined : `/projets/${c.projetId}${sous ? `/${sous}` : ""}`;
}

function evenements(depot: Depot, ch: Changement, acteurId: string | undefined): Evenement[] {
  if (ch.op === "supprimer") return [];
  const out: Evenement[] = [];
  const champ = (nom: string) => ch.champs?.some((c) => c.chemin === nom || c.chemin.startsWith(`${nom}[`) || c.chemin.startsWith(`${nom}.`));
  const code = (projetId?: string) => depot.parId("projets", projetId)?.code ?? "";

  if (ch.collection === "validations") {
    const v = depot.parId("validations", ch.id) as CircuitValidation | undefined;
    if (v && (ch.op === "creer" || champ("etapes") || champ("statut") || champ("version"))) {
      for (const e of etapesCourantes(v)) out.push({ destinataireId: e.personneId, type: "Validation", titre: `À valider : ${v.titre}`, texte: `${code(v.projetId)} · version ${v.version}`, lien: lienProjet(v.projetId, "validations"), projetId: v.projetId });
      if (ch.op === "modifier" && champ("statut") && v.statut !== "En cours") out.push({ destinataireId: v.demandeurId, type: "Information", titre: `${v.titre} : ${v.statut.toLowerCase()}`, lien: lienProjet(v.projetId, "validations"), projetId: v.projetId });
    }
  }
  if (ch.collection === "mandats") {
    const m = depot.parId("mandats", ch.id) as Mandat | undefined;
    if (m?.statut === "Soumis" && (champ("statut") || champ("signatures"))) {
      for (const s of m.signatures.filter((x) => !x.date && x.personneId)) out.push({ destinataireId: s.personneId!, type: "Signature", titre: `Mandat à signer : ${code(m.projetId)}`, texte: `Version ${m.version} · en tant que ${s.role.toLowerCase()}${s.relances?.length ? ` · relance n° ${s.relances.length}` : ""}`, lien: lienProjet(m.projetId, "mandat"), projetId: m.projetId });
    }
    if (m && champ("statut") && (m.statut === "Signé" || m.statut === "Refusé") && m.auteurId) out.push({ destinataireId: m.auteurId, type: "Information", titre: `Mandat ${code(m.projetId)} : ${m.statut.toLowerCase()}`, lien: lienProjet(m.projetId, "mandat"), projetId: m.projetId });
  }
  if (ch.collection === "commentaires") {
    const c = depot.parId("commentaires", ch.id) as Commentaire | undefined;
    const auteur = depot.parId("personnes", c?.auteurId)?.nom ?? "Quelqu'un";
    if (c && (ch.op === "creer" || champ("mentions"))) {
      for (const id of c.mentions) out.push({ destinataireId: id, type: "Mention", titre: `${auteur} vous a mentionné${c.projetId ? ` · ${code(c.projetId)}` : ""}`, texte: c.texte.slice(0, 160), lien: lienCible(c), projetId: c.projetId });
    }
  }
  if (ch.collection === "actions") {
    const a = depot.parId("actions", ch.id) as Action | undefined;
    if (a?.assigneId && a.statut !== "Terminé" && (ch.op === "creer" || champ("assigneId"))) out.push({ destinataireId: a.assigneId, type: "Tâche", titre: `Tâche : ${a.titre}`, texte: `${code(a.projetId)}${a.echeance ? ` · pour le ${a.echeance}` : ""}`, lien: lienProjet(a.projetId, "taches"), projetId: a.projetId });
  }
  if (ch.collection === "demandesPartage") {
    const d = depot.parId("demandesPartage", ch.id) as DemandePartage | undefined;
    const projet = depot.parId("projets", d?.projetId);
    if (d && projet && ch.op === "creer" && projet.directeurId) out.push({ destinataireId: projet.directeurId, type: "Partage", titre: `Demande d'accès au projet ${projet.code}`, texte: `${depot.parId("personnes", d.personneId)?.nom ?? ""} : ${d.motif}`, lien: "/acces", projetId: projet.id });
    if (d && projet && ch.op === "modifier" && champ("statut")) out.push({ destinataireId: d.personneId, type: "Partage", titre: `Accès au projet ${projet.code} : ${d.statut.toLowerCase()}`, lien: d.statut === "Accordé" ? `/projets/${projet.id}` : undefined, projetId: projet.id });
  }
  // On ne se notifie pas soi-même de sa propre action
  return out.filter((e) => e.destinataireId && e.destinataireId !== acteurId);
}

export function notifierEntree(depot: Depot, entree: EntreeJournal): number {
  if (entree.origine !== "saisie" && entree.origine !== "ia") return 0;
  if (entree.annule !== undefined) return 0;
  const date = new Date().toISOString();
  const vus = new Set<string>();
  const nouvelles = entree.changements.filter((c) => c.collection !== "notifications").flatMap((c) => evenements(depot, c, entree.acteurId))
    .filter((e) => { const k = `${e.destinataireId}|${e.type}|${e.titre}`; if (vus.has(k)) return false; vus.add(k); return true; })
    .flatMap((e) => notificationsPour(e, depot.lireMeta<Preferences | undefined>(clePreferences(e.destinataireId), undefined), date, () => nouvelId("ntf")));
  if (nouvelles.length) depot.executer({ libelle: "Notifications", origine: "systeme", irreversible: true, sansDetail: true, operations: nouvelles.map((valeur) => ({ op: "creer" as const, collection: "notifications" as const, valeur })) });
  return nouvelles.length;
}

/** Branche le moteur sur le dépôt ; renvoie la fonction de débranchement */
export function brancherNotifications(depot: Depot): () => void {
  return depot.surEntree((e) => { try { notifierEntree(depot, e); } catch { /* une notification manquée ne doit jamais faire échouer une écriture */ } });
}

/** Rappels d'échéance du jour, émis une seule fois par jour et par objet (conditions échues, tâches en retard) */
export function rappelsDuJour(depot: Depot, jour = aujourdhui()): number {
  const fait = depot.lireMeta<string>("rappels|jour", "");
  if (fait === jour) return 0;
  const evts: Evenement[] = [];
  for (const a of depot.tous("actions")) if (a.assigneId && a.statut !== "Terminé" && a.echeance === jour) evts.push({ destinataireId: a.assigneId, type: "Échéance", titre: `Échéance aujourd'hui : ${a.titre}`, lien: lienProjet(a.projetId, "taches"), projetId: a.projetId });
  for (const d of [...depot.tous("decisions"), ...depot.tous("decisionsPhase")]) {
    for (const c of d.conditions) if (c.responsableId && c.echeance === jour && c.statut !== "Remplie" && c.statut !== "Levée") evts.push({ destinataireId: c.responsableId, type: "Échéance", titre: `Condition à lever aujourd'hui : ${c.texte.slice(0, 80)}`, lien: lienProjet(d.projetId, "decisions"), projetId: d.projetId });
  }
  const date = new Date().toISOString();
  const nouvelles = evts.flatMap((e) => notificationsPour(e, depot.lireMeta<Preferences | undefined>(clePreferences(e.destinataireId), undefined), date, () => nouvelId("ntf")));
  if (nouvelles.length) depot.executer({ libelle: "Rappels d'échéance", origine: "systeme", irreversible: true, sansDetail: true, operations: nouvelles.map((valeur) => ({ op: "creer" as const, collection: "notifications" as const, valeur })) });
  depot.ecrireMeta("rappels|jour", jour);
  return nouvelles.length;
}
