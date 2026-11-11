// Circuits de validation. En mode séquentiel, chaque validateur se prononce à son tour ; en mode
// parallèle, tous sont sollicités en même temps et tous doivent approuver. Une demande de
// modifications ou un refus interrompt le circuit ; le demandeur peut alors soumettre une nouvelle
// version, qui repart du début. Un validateur absent peut être remplacé par son délégué.
import type { CircuitValidation, DecisionValidation, EtapeValidation, ID } from "../types";

/** Remplacement d'un validateur pendant une absence */
export interface DelegationValidation { deId: ID; aId: ID; debut: string; fin: string }

/** Étapes sur lesquelles une décision est attendue maintenant */
export function etapesCourantes(c: CircuitValidation): EtapeValidation[] {
  if (c.statut !== "En cours") return [];
  const attente = c.etapes.filter((e) => e.statut === "En attente");
  return c.mode === "parallele" ? attente : attente.slice(0, 1);
}

/** Première étape en attente (en mode séquentiel, la seule) */
export const etapeCourante = (c: CircuitValidation): EtapeValidation | undefined => etapesCourantes(c)[0];

/** Personnes que `personneId` remplace à la date donnée */
export function delegants(delegations: DelegationValidation[], personneId: ID, jour: string): ID[] {
  return delegations.filter((d) => d.aId === personneId && d.debut <= jour && jour <= d.fin).map((d) => d.deId);
}

/** Étape que cette personne peut traiter : la sienne d'abord, sinon celle d'une personne qu'elle remplace */
export function etapePour(c: CircuitValidation, personneId: ID | null | undefined, delegations: DelegationValidation[] = [], jour = ""): EtapeValidation | undefined {
  if (!personneId) return undefined;
  const courantes = etapesCourantes(c);
  const remplaces = jour ? delegants(delegations, personneId, jour) : [];
  return courantes.find((e) => e.personneId === personneId) ?? courantes.find((e) => remplaces.includes(e.personneId));
}

export function attendDe(c: CircuitValidation, personneId: ID | null | undefined, delegations: DelegationValidation[] = [], jour = ""): boolean {
  return !!etapePour(c, personneId, delegations, jour);
}

export function decider(c: CircuitValidation, personneId: ID, decision: DecisionValidation, date: string, commentaire?: string, delegations: DelegationValidation[] = []): CircuitValidation {
  const etape = etapePour(c, personneId, delegations, date.slice(0, 10));
  if (!etape) throw new Error("Ce n'est pas à cette personne de valider.");
  const parDelegationDe = etape.personneId === personneId ? undefined : etape.personneId;
  const etapes = c.etapes.map((e) => (e.id === etape.id ? { ...e, statut: decision, date, commentaire, parDelegationDe } : e));
  const statut: CircuitValidation["statut"] =
    decision === "Refusé" ? "Refusé"
      : decision === "Modifications demandées" ? "À corriger"
        : etapes.every((e) => e.statut === "Approuvé") ? "Approuvé" : "En cours";
  return {
    ...c, etapes, statut,
    historique: [...c.historique, { date, personneId, action: parDelegationDe ? `${decision} (par délégation)` : decision, version: c.version, commentaire }],
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

/** Modèle de circuit applicable à un objet : le plus exigeant dont le seuil de compétence est atteint */
export function circuitApplicable<M extends { typeObjet: string; seuilMin?: number }>(modeles: M[], typeObjet: string, montant = 0): M | undefined {
  return modeles.filter((m) => m.typeObjet === typeObjet && (m.seuilMin ?? 0) <= montant).sort((a, b) => (b.seuilMin ?? 0) - (a.seuilMin ?? 0))[0];
}
