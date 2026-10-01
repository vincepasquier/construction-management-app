// Import d'un plan Microsoft Planner (export Excel « Tâches du projet ») vers les tâches attribuées.
import type { Action, ID, Lot, Personne, PrioriteAction } from "../types";

const txt = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
const norm = (v: unknown) => txt(v).toLowerCase();
const date = (v: unknown) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = txt(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : /^\d{4}-\d{2}-\d{2}/.test(txt(v)) ? txt(v).slice(0, 10) : undefined;
};
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export interface ResultatPlanner {
  actions: Action[];
  personnesInconnues: string[];
  resume: string;
}

const PRIORITES: Record<string, PrioriteAction> = { urgent: "Urgente", urgente: "Urgente", important: "Haute", importante: "Haute", moyen: "Normale", moyenne: "Normale", faible: "Basse", basse: "Basse" };

export function importerPlanner(feuilles: { sheet: string; data: unknown[][] }[], o: { projetId: ID; personnes: Personne[]; lots: Lot[]; aujourdhui: string }): ResultatPlanner {
  let data: unknown[][] | undefined;
  let h = -1;
  for (const f of feuilles) {
    h = f.data.findIndex((r) => r.some((c) => norm(c) === "nom") && r.some((c) => norm(c).startsWith("attribu")));
    if (h >= 0) { data = f.data; break; }
  }
  if (!data) throw new Error("Colonnes « Nom » et « Attribuée à » introuvables : exportez le plan depuis Planner (… > Exporter le plan vers Excel).");
  const e = data[h].map(norm);
  const col = (...l: string[]) => e.findIndex((x) => l.some((y) => x.startsWith(y)));
  const c = {
    nom: e.indexOf("nom"), attribue: col("attribu"), debut: col("date de début", "début"), fin: col("date d'échéance", "échéance", "fin"),
    compartiment: col("compartiment", "bucket"), avancement: col("% achevé", "progression", "état"), priorite: col("priorité"),
    notes: col("notes", "description"), liste: col("éléments de la liste", "liste de contrôle"), etiquettes: col("étiquettes"), termine: col("terminé le", "date d'achèvement"),
  };
  const inconnues = new Set<string>();
  const personne = (nom: string) => o.personnes.find((p) => sansAccent(p.nom) === sansAccent(nom))?.id;
  const lotDe = (compartiment: string) => {
    const k = sansAccent(compartiment).replace(/^lot\s+/, "");
    if (!k) return undefined;
    return o.lots.find((l) => sansAccent(l.nom).includes(k) || k.includes(sansAccent(l.nom)))?.id;
  };
  const actions: Action[] = [];
  for (const r of data.slice(h + 1)) {
    const titre = txt(r[c.nom]);
    if (!titre) continue;
    const noms = txt(r[c.attribue]).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    for (const n of noms) if (!personne(n)) inconnues.add(n);
    const av = txt(r[c.avancement]);
    const pct = typeof r[c.avancement] === "number" ? (r[c.avancement] as number) : /termin/i.test(av) ? 1 : /cours/i.test(av) ? 0.5 : 0;
    const fini = pct >= 1 || /termin/i.test(av) || !!txt(r[c.termine]);
    const compartiment = c.compartiment >= 0 ? txt(r[c.compartiment]) : "";
    const description = [
      noms.length > 1 ? `Avec : ${noms.slice(1).join(", ")}` : "",
      c.notes >= 0 ? txt(r[c.notes]) : "",
      c.liste >= 0 && txt(r[c.liste]) ? `Liste de contrôle : ${txt(r[c.liste]).split(";").map((x) => `☐ ${x.trim()}`).join(" ")}` : "",
      c.etiquettes >= 0 && txt(r[c.etiquettes]) ? `Étiquettes : ${txt(r[c.etiquettes]).replace(/;/g, ", ")}` : "",
    ].filter(Boolean).join("\n");
    actions.push({
      id: `act-pl-${actions.length + 1}-${Math.random().toString(36).slice(2, 6)}`, projetId: o.projetId, titre, description: description || undefined,
      assigneId: noms[0] ? personne(noms[0]) : undefined, echeance: date(r[c.fin]),
      priorite: PRIORITES[sansAccent(txt(r[c.priorite]))] ?? "Normale",
      statut: fini ? "Terminé" : pct > 0 ? "En cours" : "À faire",
      origine: `Planner${compartiment ? ` – ${compartiment}` : ""}`, lotId: lotDe(compartiment), dateCreation: date(r[c.debut]) ?? o.aujourdhui,
    });
  }
  return {
    actions, personnesInconnues: [...inconnues],
    resume: `${actions.length} tâche(s), dont ${actions.filter((a) => a.statut !== "Terminé").length} ouverte(s)${inconnues.size ? ` ; ${inconnues.size} personne(s) non trouvée(s) dans l'équipe` : ""}`,
  };
}
