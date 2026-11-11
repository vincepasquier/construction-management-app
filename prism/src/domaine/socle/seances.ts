// Séances et procès-verbaux : ComInv, comités de pilotage, séances de projet et de chantier.
// Les points gardent leur numéro d'une séance à l'autre tant qu'ils restent ouverts ; les points de
// nature « Décision » et « Tâche » alimentent le registre des décisions et la liste des tâches.
import type { Action, ID } from "../types";
import type { Decision, OrganeDecision, ParticipantSeance, Seance, TypeSeance } from "./types";

export const memeSerie = (a: Pick<Seance, "type" | "projetId">, b: Pick<Seance, "type" | "projetId">) => a.type === b.type && (a.projetId ?? "") === (b.projetId ?? "");

/** Séances d'une même série (même type, même projet), de la plus récente à la plus ancienne */
export const serie = (seances: Seance[], s: Pick<Seance, "type" | "projetId">) => seances.filter((x) => memeSerie(x, s)).sort((a, b) => b.numero - a.numero || b.date.localeCompare(a.date));

const TITRES: Record<TypeSeance, string> = { ComInv: "Comité d'investissement", "Comité de pilotage": "Comité de pilotage", Chantier: "Séance de chantier", Autre: "Séance" };

/** Nouvelle séance de la série : reprend les participants et les points restés ouverts de la précédente */
export function nouvelleSeance(seances: Seance[], o: { id: ID; type: TypeSeance; projetId?: ID; date: string; redacteurId?: ID }): Seance {
  const precedente = serie(seances, o)[0];
  const numero = (precedente?.numero ?? 0) + 1;
  return {
    id: o.id, type: o.type, projetId: o.projetId, numero, titre: `${TITRES[o.type]} n° ${numero}`, date: o.date, lieu: precedente?.lieu,
    participants: (precedente?.participants ?? []).map((p): ParticipantSeance => ({ ...p, presence: "Présent" })),
    points: (precedente?.points ?? []).filter((p) => p.statut === "Ouvert" && p.nature !== "Information").map((p) => ({ ...p, origineSeanceId: p.origineSeanceId ?? precedente!.id })),
    statut: "Planifiée", redacteurId: o.redacteurId, seancePrecedenteId: precedente?.id,
  };
}

/** Numéro d'un nouveau point : « <n° de séance>.<rang> », jamais réutilisé dans la séance */
export function numeroPoint(s: Seance): string {
  const rangs = s.points.filter((p) => p.numero.startsWith(`${s.numero}.`)).map((p) => Number(p.numero.split(".")[1]) || 0);
  return `${s.numero}.${Math.max(0, ...rangs) + 1}`;
}

export const pointsRepris = (s: Seance) => s.points.filter((p) => p.origineSeanceId && p.origineSeanceId !== s.id);

const ORGANE: Record<TypeSeance, OrganeDecision> = { ComInv: "ComInv", "Comité de pilotage": "Comité de pilotage", Chantier: "Autre", Autre: "Autre" };

export interface Derives {
  decisions: Decision[];
  actions: Action[];
  /** Points à relier à l'objet créé */
  liens: { pointId: ID; decisionId?: ID; actionId?: ID }[];
}

/**
 * Décisions et tâches qui découlent d'une séance tenue. Une décision déjà au registre garde les
 * statuts de ses conditions ; une tâche déjà créée garde son avancement.
 */
export function derives(s: Seance, existants: { decisions: Decision[]; actions: Action[] }, nouvelId: (prefixe: string) => ID): Derives {
  const out: Derives = { decisions: [], actions: [], liens: [] };
  for (const p of s.points) {
    const projetId = p.projetId ?? s.projetId;
    if (!projetId || !p.titre.trim()) continue;
    if (p.nature === "Décision" || p.nature === "Note de travail") {
      // Une note de travail n'est portée au registre que si elle est explicitement qualifiée
      if (p.nature === "Note de travail" && !p.decision) continue;
      const existante = existants.decisions.find((d) => d.id === p.decisionId);
      const id = existante?.id ?? nouvelId("dec");
      const conditions = (p.decision?.conditions ?? []).filter((c) => c.texte.trim()).map((c) => existante?.conditions.find((x) => x.id === c.id) ?? c);
      out.decisions.push({
        id, projetId, seanceId: s.id, organe: existante?.organe ?? ORGANE[s.type], date: existante?.date ?? s.date, objet: p.titre, texte: p.texte,
        montant: p.decision?.montant, statut: p.nature === "Note de travail" ? "Note de travail" : p.decision?.statut ?? "Approuvée",
        conditions: [...conditions, ...(existante?.conditions.filter((c) => !conditions.some((x) => x.id === c.id)) ?? [])],
        responsableId: p.responsableId, restreint: p.decision?.restreint,
      });
      if (!existante) out.liens.push({ pointId: p.id, decisionId: id });
    } else if (p.nature === "Tâche") {
      const existante = existants.actions.find((a) => a.id === p.actionId);
      const id = existante?.id ?? nouvelId("act");
      out.actions.push({
        ...(existante ?? { id, projetId, priorite: "Normale", statut: "À faire", dateCreation: s.date, creeParId: s.redacteurId }),
        id, projetId, titre: p.titre, description: p.texte || undefined, assigneId: p.responsableId, echeance: p.echeance,
        origine: `${s.titre} du ${s.date}, point ${p.numero}`, seanceId: s.id,
        statut: p.statut === "Clos" ? "Terminé" : existante?.statut ?? "À faire",
      } as Action);
      if (!existante) out.liens.push({ pointId: p.id, actionId: id });
    }
  }
  return out;
}

export function resume(s: Seance) {
  return {
    points: s.points.length, ouverts: s.points.filter((p) => p.statut === "Ouvert").length,
    decisions: s.points.filter((p) => p.nature === "Décision").length, taches: s.points.filter((p) => p.nature === "Tâche").length,
    presents: s.participants.filter((p) => p.presence === "Présent").length,
  };
}
