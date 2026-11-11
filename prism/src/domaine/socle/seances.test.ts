import { describe, expect, it } from "vitest";
import { derives, nouvelleSeance, numeroPoint, pointsRepris, resume, serie } from "./seances";
import type { PointSeance, Seance } from "./types";

const point = (p: Partial<PointSeance>): PointSeance => ({ id: p.numero ?? "x", numero: "1.1", titre: "Point", texte: "", nature: "Information", statut: "Ouvert", ...p });
let n = 0;
const id = (prefixe: string) => `${prefixe}-${++n}`;

const s1: Seance = {
  id: "s1", type: "ComInv", numero: 1, titre: "Comité d'investissement n° 1", date: "2026-10-01", lieu: "Salle A", statut: "Tenue",
  participants: [{ personneId: "a", presence: "Excusé", diffusion: true }],
  points: [
    point({ id: "p1", numero: "1.1", projetId: "prj", titre: "Crédit complémentaire", nature: "Décision", decision: { statut: "Approuvée", montant: 120_000, conditions: [{ id: "c1", texte: "Offre ferme", statut: "À traiter" }] } }),
    point({ id: "p2", numero: "1.2", projetId: "prj", titre: "Chiffrer la variante", nature: "Tâche", responsableId: "a", echeance: "2026-11-01" }),
    point({ id: "p3", numero: "1.3", titre: "Tour de table", nature: "Information" }),
    point({ id: "p4", numero: "1.4", projetId: "prj", titre: "Report du projet B", nature: "Décision", statut: "Clos" }),
  ],
};

describe("séances et procès-verbaux", () => {
  it("ouvre la séance suivante avec les participants et les points restés ouverts, numéros conservés", () => {
    const s2 = nouvelleSeance([s1], { id: "s2", type: "ComInv", date: "2026-11-05" });
    expect(s2).toMatchObject({ numero: 2, titre: "Comité d'investissement n° 2", lieu: "Salle A", seancePrecedenteId: "s1", statut: "Planifiée" });
    expect(s2.participants).toEqual([{ personneId: "a", presence: "Présent", diffusion: true }]);
    expect(s2.points.map((p) => p.numero)).toEqual(["1.1", "1.2"]);
    expect(pointsRepris(s2)).toHaveLength(2);
    expect(numeroPoint(s2)).toBe("2.1");
    expect(numeroPoint({ ...s2, points: [...s2.points, point({ numero: "2.1" }), point({ numero: "2.4" })] })).toBe("2.5");
  });

  it("distingue les séries par type et par projet", () => {
    const pilotage: Seance = { ...s1, id: "s9", type: "Comité de pilotage", projetId: "prj", numero: 4, points: [] };
    expect(serie([s1, pilotage], { type: "ComInv" }).map((s) => s.id)).toEqual(["s1"]);
    expect(nouvelleSeance([s1, pilotage], { id: "n", type: "Comité de pilotage", projetId: "prj", date: "2026-12-01" }).numero).toBe(5);
    expect(nouvelleSeance([s1, pilotage], { id: "n", type: "Chantier", projetId: "prj", date: "2026-12-01" })).toMatchObject({ numero: 1, titre: "Séance de chantier n° 1", points: [] });
  });

  it("porte les décisions au registre et crée les tâches", () => {
    const d = derives(s1, { decisions: [], actions: [] }, id);
    expect(d.decisions.map((x) => [x.objet, x.statut, x.organe, x.montant])).toEqual([["Crédit complémentaire", "Approuvée", "ComInv", 120_000], ["Report du projet B", "Approuvée", "ComInv", undefined]]);
    expect(d.actions).toHaveLength(1);
    expect(d.actions[0]).toMatchObject({ titre: "Chiffrer la variante", assigneId: "a", echeance: "2026-11-01", statut: "À faire", seanceId: "s1" });
    expect(d.actions[0].origine).toContain("point 1.2");
    expect(d.liens).toHaveLength(3);
  });

  it("met à jour sans dupliquer, en gardant l'avancement des conditions et des tâches", () => {
    const premier = derives(s1, { decisions: [], actions: [] }, id);
    const decision = { ...premier.decisions[0], conditions: [{ ...premier.decisions[0].conditions[0], statut: "Remplie" as const }, { id: "c2", texte: "Ajoutée au registre", statut: "À traiter" as const }] };
    const action = { ...premier.actions[0], statut: "En cours" as const };
    const lie: Seance = { ...s1, points: s1.points.map((p) => (p.id === "p1" ? { ...p, decisionId: decision.id, titre: "Crédit complémentaire (révisé)" } : p.id === "p2" ? { ...p, actionId: action.id } : p)) };
    const second = derives(lie, { decisions: [decision], actions: [action] }, id);
    expect(second.decisions[0]).toMatchObject({ id: decision.id, objet: "Crédit complémentaire (révisé)" });
    expect(second.decisions[0].conditions.map((c) => [c.id, c.statut])).toEqual([["c1", "Remplie"], ["c2", "À traiter"]]);
    expect(second.actions[0]).toMatchObject({ id: action.id, statut: "En cours" });
    expect(second.liens.filter((l) => l.pointId === "p1" || l.pointId === "p2")).toEqual([]);
  });

  it("ne porte une note de travail au registre que si elle est qualifiée, et la marque comme telle", () => {
    const s: Seance = { ...s1, points: [point({ id: "n1", projetId: "prj", titre: "Piste à creuser", nature: "Note de travail" }), point({ id: "n2", projetId: "prj", titre: "Arbitrage en préparation", nature: "Note de travail", decision: { statut: "Approuvée", restreint: true, conditions: [] } })] };
    const d = derives(s, { decisions: [], actions: [] }, id);
    expect(d.decisions).toHaveLength(1);
    expect(d.decisions[0]).toMatchObject({ objet: "Arbitrage en préparation", statut: "Note de travail", restreint: true });
  });

  it("résume la séance", () => {
    expect(resume(s1)).toEqual({ points: 4, ouverts: 3, decisions: 2, taches: 1, presents: 0 });
  });
});
