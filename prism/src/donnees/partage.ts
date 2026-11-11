// Partage d'un projet : une personne demande l'accès, le responsable du projet (ou un
// administrateur) décide. L'accord ajoute le projet au périmètre de la personne.
import { nouvelId } from "../domaine/lib/id";
import { accesDe, projetVisible } from "../domaine/socle/droits";
import type { DemandePartage } from "../domaine/socle/types";
import type { ID, Personne } from "../domaine/types";
import type { Depot } from "./depot";

export function demanderAcces(depot: Depot, projetId: ID, personneId: ID, motif: string, date: string): DemandePartage {
  if (!motif.trim()) throw new Error("Indiquez pourquoi vous avez besoin de ce projet.");
  const existante = depot.parProjet("demandesPartage", projetId).find((d) => d.personneId === personneId && d.statut === "Demandé");
  if (existante) return existante;
  const d: DemandePartage = { id: nouvelId("dpa"), projetId, personneId, demandeurId: depot.acteurId ?? personneId, date, motif: motif.trim(), statut: "Demandé" };
  depot.ajouter("demandesPartage", d);
  return d;
}

/** Peut décider : un administrateur, ou le responsable du projet */
export function peutDecider(p: Personne | undefined, depot: Depot, d: DemandePartage): boolean {
  if (!p) return false;
  return accesDe(p).profil === "Administrateur" || depot.parId("projets", d.projetId)?.directeurId === p.id;
}

/** Demandes en attente que cette personne peut décider */
export function demandesADecider(depot: Depot, p: Personne | undefined): DemandePartage[] {
  return depot.tous("demandesPartage").filter((d) => d.statut === "Demandé" && peutDecider(p, depot, d));
}

export function deciderPartage(depot: Depot, demandeId: ID, accorde: boolean, date: string): void {
  const d = depot.parId("demandesPartage", demandeId);
  const decideur = depot.acteur();
  if (!d || d.statut !== "Demandé") throw new Error("Cette demande a déjà été traitée.");
  if (!peutDecider(decideur, depot, d)) throw new Error("Seul le responsable du projet ou un administrateur peut décider de cette demande.");
  const personne = depot.parId("personnes", d.personneId);
  const projet = depot.parId("projets", d.projetId);
  depot.grouper(`Accès au projet ${projet?.code ?? ""} ${accorde ? "accordé" : "refusé"} à ${personne?.nom ?? ""}`, () => {
    depot.modifier("demandesPartage", d.id, { statut: accorde ? "Accordé" : "Refusé", decideParId: decideur?.id, dateDecision: date });
    if (accorde && personne && projet && !projetVisible(personne, projet)) {
      const a = accesDe(personne);
      // Le responsable du projet n'a pas la gestion des accès : l'élargissement du périmètre est fait par le système, en son nom
      if (a.projets !== "tous") depot.modifier("personnes", personne.id, { acces: { ...a, projets: [...a.projets, projet.id] } }, { origine: "systeme", motif: `Accès accordé par ${decideur?.nom ?? "le responsable"} : ${d.motif}` });
    }
  });
}
