// Enregistrement d'une séance : la séance elle-même, puis les décisions et les tâches qui en
// découlent, en une seule opération.
import { nouvelId } from "../domaine/lib/id";
import { derives } from "../domaine/socle/seances";
import type { Seance } from "../domaine/socle/types";
import type { Depot } from "./depot";

export function enregistrerSeance(depot: Depot, seance: Seance): Seance {
  let finale = seance;
  depot.grouper(`${seance.titre} du ${seance.date}`, () => {
    // Tant que la séance n'est que planifiée, rien n'est porté au registre
    if (seance.statut !== "Planifiée") {
      const d = derives(seance, { decisions: depot.tous("decisions"), actions: depot.tous("actions") }, nouvelId);
      for (const x of d.decisions) { if (depot.parId("decisions", x.id)) depot.modifier("decisions", x.id, x); else depot.ajouter("decisions", x); }
      for (const x of d.actions) { if (depot.parId("actions", x.id)) depot.modifier("actions", x.id, x); else depot.ajouter("actions", x); }
      finale = { ...seance, points: seance.points.map((p) => { const l = d.liens.find((x) => x.pointId === p.id); return l ? { ...p, decisionId: l.decisionId ?? p.decisionId, actionId: l.actionId ?? p.actionId } : p; }) };
    }
    if (depot.parId("seances", finale.id)) depot.modifier("seances", finale.id, finale); else depot.ajouter("seances", finale);
  });
  return finale;
}
