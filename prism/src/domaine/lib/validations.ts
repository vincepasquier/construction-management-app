// Circuits de validation séquentiels : chaque validateur se prononce à son tour.
// Une demande de modifications ou un refus interrompt le circuit ; le demandeur peut alors
// soumettre une nouvelle version, qui repart du premier validateur.
import type { CircuitValidation, DecisionValidation, EtapeValidation, ID } from "../types";

export function etapeCourante(c: CircuitValidation): EtapeValidation | undefined {
  if (c.statut !== "En cours") return undefined;
  return c.etapes.find((e) => e.statut === "En attente");
}

export function attendDe(c: CircuitValidation, personneId: ID | null | undefined): boolean {
  return !!personneId && etapeCourante(c)?.personneId === personneId;
}

export function decider(c: CircuitValidation, personneId: ID, decision: DecisionValidation, date: string, commentaire?: string): CircuitValidation {
  const courante = etapeCourante(c);
  if (!courante || courante.personneId !== personneId) throw new Error("Ce n'est pas à cette personne de valider.");
  const etapes = c.etapes.map((e) => (e.id === courante.id ? { ...e, statut: decision, date, commentaire } : e));
  const statut: CircuitValidation["statut"] =
    decision === "Refusé" ? "Refusé"
      : decision === "Modifications demandées" ? "À corriger"
        : etapes.every((e) => e.statut === "Approuvé") ? "Approuvé" : "En cours";
  return {
    ...c, etapes, statut,
    historique: [...c.historique, { date, personneId, action: decision, version: c.version, commentaire }],
  };
}

export function nouvelleVersion(c: CircuitValidation, personneId: ID, date: string, commentaire?: string, url?: string): CircuitValidation {
  return {
    ...c,
    version: c.version + 1,
    url: url ?? c.url,
    statut: "En cours",
    etapes: c.etapes.map((e) => ({ id: e.id, personneId: e.personneId, statut: "En attente" })),
    historique: [...c.historique, { date, personneId, action: `Version ${c.version + 1} soumise`, version: c.version + 1, commentaire }],
  };
}

export function annuler(c: CircuitValidation, personneId: ID, date: string): CircuitValidation {
  return { ...c, statut: "Annulé", historique: [...c.historique, { date, personneId, action: "Circuit annulé", version: c.version }] };
}
