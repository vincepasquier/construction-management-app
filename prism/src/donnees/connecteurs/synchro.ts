// Synchronisation avec un système source : création d'un projet depuis son numéro, puis mise à jour
// des champs dont la source est maîtresse. PRISM ne modifie jamais la source ; une valeur corrigée
// localement est conservée comme « surcharge » jusqu'à sa correction dans le système maître.
import type { ExecutionSynchro, FactureSource, ReleveSource } from "../../domaine/socle/types";
import type { ID, Projet, StatutProjet, Synchro } from "../../domaine/types";
import type { Depot, Operation } from "../depot";
import type { ProjetSource, SourceProjets } from "./source";

/** Champs du projet dont le système source est maître */
export const CHAMPS_SOURCE = ["nom", "description", "dateDebut", "dateFin", "statutSource", "compteAnalytique", "directionId", "directeurId"] as const;
type ChampSource = (typeof CHAMPS_SOURCE)[number];

const COULEURS: Record<string, string> = { INF: "#136bb0", ENR: "#0d9488", NUM: "#7c3aed", FIN: "#b45309" };

const idProjet = (numero: string) => `prj-${numero.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function statutPilotage(statutSource: string): StatutProjet {
  if (/prépar/i.test(statutSource)) return "En préparation";
  if (/termin|clos|clôt/i.test(statutSource)) return "Terminé";
  return "En cours";
}

/** Valeurs des champs maîtres, telles que la source les donne */
function valeursSource(depot: Depot, s: ProjetSource): Record<ChampSource, unknown> {
  return {
    nom: s.nom, description: s.description, dateDebut: s.dateDebut, dateFin: s.dateFin, statutSource: s.statut,
    compteAnalytique: s.compteAnalytique,
    directionId: depot.tous("directions").find((d) => d.code === s.direction)?.id,
    directeurId: depot.tous("personnes").find((p) => p.nom.toLowerCase() === s.responsable.toLowerCase())?.id,
  };
}

function releve(projetId: ID, source: SourceProjets, s: ProjetSource, date: string): ReleveSource {
  return {
    id: `rel-${projetId}`, projetId, systeme: source.nom, date, budgetInitial: s.budgetInitial, budgetApprouve: s.budgetApprouve,
    engage: s.engage, realise: s.realise, paye: s.paye, atterrissage: s.atterrissage, parAnnee: s.parAnnee, statut: s.statut, responsable: s.responsable,
  };
}

/** Opérations qui alignent un projet existant sur l'état de la source */
function operationsProjet(depot: Depot, source: SourceProjets, projet: Projet, s: ProjetSource, horodatage: string): Operation[] {
  const ops: Operation[] = [];
  const valeurs = valeursSource(depot, s);
  const surcharges = { ...(projet.synchro?.surcharges ?? {}) };
  const patch: Record<string, unknown> = {};
  const champs: string[] = [];
  for (const c of CHAMPS_SOURCE) {
    if (valeurs[c] === undefined) continue;
    champs.push(c);
    if (surcharges[c]) surcharges[c] = { ...surcharges[c], valeurSource: valeurs[c] };
    else patch[c] = valeurs[c];
  }
  const synchro: Synchro = { systeme: source.nom, idExterne: s.numero, date: horodatage, champs, surcharges: Object.keys(surcharges).length ? surcharges : undefined };
  ops.push({ op: "modifier", collection: "projets", id: projet.id, patch: { ...patch, numeroSource: s.numero, synchro } });

  const r = releve(projet.id, source, s, horodatage);
  ops.push(depot.parId("relevesSource", r.id)
    ? { op: "modifier", collection: "relevesSource", id: r.id, patch: r as unknown as Record<string, unknown> }
    : { op: "creer", collection: "relevesSource", valeur: r });

  for (const f of s.factures) {
    const fs: FactureSource = { id: `fs-${projet.id}-${f.numero}`, projetId: projet.id, compteAnalytique: s.compteAnalytique, ...f };
    ops.push(depot.parId("facturesSource", fs.id)
      ? { op: "modifier", collection: "facturesSource", id: fs.id, patch: fs as unknown as Record<string, unknown> }
      : { op: "creer", collection: "facturesSource", valeur: fs });
  }
  return ops;
}

function nouveauProjet(depot: Depot, s: ProjetSource, parentId?: ID): Projet {
  const construction = depot.parId("typesProjet", s.typeProjet)?.modeFinancier === "positions";
  return {
    id: idProjet(s.numero), code: s.numero, nom: s.nom, maitreOuvrage: "", lieu: "", phase: construction ? "31 Avant-projet" : "11 Énoncé des besoins",
    dateDebut: s.dateDebut, dateFin: s.dateFin, tauxTVA: 8.1, couleur: COULEURS[s.direction] ?? "#475569", description: s.description,
    typeProjetId: depot.parId("typesProjet", s.typeProjet) ? s.typeProjet : depot.tous("typesProjet")[0]?.id,
    numeroSource: s.numero, parentId, statut: statutPilotage(s.statut), priorite: "Normale", confidentialite: "Interne",
    phaseGroupe: "Définition des objectifs",
  };
}

export class NumeroInconnu extends Error {}

/**
 * Ajoute un projet à partir de son numéro dans la source, avec ses sous-projets. Si le projet existe
 * déjà dans PRISM, il est simplement resynchronisé.
 */
export async function importerProjet(depot: Depot, source: SourceProjets, numero: string, horodatage = new Date().toISOString()): Promise<Projet> {
  const date = horodatage.slice(0, 10);
  const s = await source.lire(numero, date);
  if (!s) throw new NumeroInconnu(`Le numéro « ${numero} » est inconnu de ${source.nom}.`);
  const enfants = (await source.lister()).filter((x) => x.parent === s.numero);
  const etats = [s, ...(await Promise.all(enfants.map((e) => source.lire(e.numero, date)))).filter((x): x is ProjetSource => Boolean(x))];

  depot.grouper(`Ajout depuis ${source.nom} : ${s.numero}`, () => {
    for (const e of etats) {
      const existant = depot.tous("projets").find((p) => p.numeroSource === e.numero);
      const parentId = e.parent ? depot.tous("projets").find((p) => p.numeroSource === e.parent)?.id : undefined;
      const projet = existant ?? nouveauProjet(depot, e, parentId);
      if (!existant) depot.ajouter("projets", projet);
      depot.executer({ libelle: `Synchronisation ${e.numero}`, origine: "connecteur", operations: operationsProjet(depot, source, projet, e, horodatage) });
    }
  }, { origine: "connecteur", irreversible: true });
  return depot.tous("projets").find((p) => p.numeroSource === s.numero)!;
}

/** Met à jour tous les projets rattachés à la source (ou ceux indiqués) et consigne l'exécution */
export async function synchroniser(depot: Depot, source: SourceProjets, o: { horodatage?: string; projetIds?: ID[] } = {}): Promise<ExecutionSynchro> {
  const horodatage = o.horodatage ?? new Date().toISOString();
  const debut = Date.now();
  const cibles = depot.tous("projets").filter((p) => p.numeroSource && !p.archive && (!o.projetIds || o.projetIds.includes(p.id)));
  const erreurs: string[] = [];
  let modifies = 0, crees = 0;
  const etats = await Promise.all(cibles.map(async (p) => {
    try {
      const s = await source.lire(p.numeroSource!, horodatage.slice(0, 10));
      if (!s) erreurs.push(`${p.numeroSource} : numéro inconnu de la source`);
      return { projet: p, etat: s };
    } catch (e) {
      erreurs.push(`${p.numeroSource} : ${e instanceof Error ? e.message : "échec de lecture"}`);
      return { projet: p, etat: undefined };
    }
  }));

  const avant = depot.journal.length;
  depot.grouper(`Synchronisation ${source.nom}`, () => {
    for (const { projet, etat } of etats) {
      if (!etat) continue;
      // L'horodatage seul ne compte pas comme un changement : on compare les données reçues
      const ops = operationsProjet(depot, source, projet, etat, horodatage);
      const entree = depot.executer({ libelle: `Synchronisation ${etat.numero}`, origine: "connecteur", operations: ops });
      void entree;
    }
  }, { origine: "connecteur", irreversible: true });
  const entree = depot.journal.length > avant ? depot.journal.at(-1)! : undefined;
  for (const c of entree?.changements ?? []) {
    if (c.op === "creer") crees++;
    else if (c.op === "modifier" && (c.champs ?? []).some((ch) => ch.chemin !== "synchro" && ch.chemin !== "date")) modifies++;
  }

  const execution: ExecutionSynchro = {
    id: `syn-${horodatage}`, connecteur: source.nom, date: horodatage, dureeMs: Date.now() - debut, lus: etats.filter((e) => e.etat).length,
    crees, modifies, erreurs, statut: erreurs.length === 0 ? "Réussie" : erreurs.length < cibles.length ? "Partielle" : "En erreur",
    declencheePar: depot.acteurId,
  };
  if (!depot.parId("executionsSynchro", execution.id)) depot.ajouter("executionsSynchro", execution, { origine: "connecteur", irreversible: true, libelle: `Journal de synchronisation ${source.nom}` });
  return execution;
}

/** Corrige localement un champ maître de la source, en gardant la valeur d'origine et le motif */
export function surcharger(depot: Depot, projetId: ID, champ: string, valeur: unknown, motif: string): void {
  const p = depot.parId("projets", projetId);
  if (!p?.synchro) return;
  const actuel = (p as unknown as Record<string, unknown>)[champ];
  const surcharges = { ...(p.synchro.surcharges ?? {}) };
  surcharges[champ] = { valeurSource: surcharges[champ]?.valeurSource ?? actuel, motif, auteurId: depot.acteurId, date: new Date().toISOString() };
  depot.modifier("projets", projetId, { [champ]: valeur, synchro: { ...p.synchro, surcharges } } as Partial<Projet>, { motif, libelle: `Correction locale de « ${champ} » : ${p.code}` });
}

/** Abandonne une correction locale : la valeur de la source reprend la main */
export function leverSurcharge(depot: Depot, projetId: ID, champ: string): void {
  const p = depot.parId("projets", projetId);
  const s = p?.synchro?.surcharges?.[champ];
  if (!p?.synchro || !s) return;
  const { [champ]: _retire, ...reste } = p.synchro.surcharges!;
  depot.modifier("projets", projetId, { [champ]: s.valeurSource, synchro: { ...p.synchro, surcharges: Object.keys(reste).length ? reste : undefined } } as Partial<Projet>,
    { libelle: `Retour à la valeur source de « ${champ} » : ${p.code}` });
}

/** D'où vient la valeur d'un champ de la fiche projet */
export function origineChamp(p: Pick<Projet, "synchro">, champ: string): "source" | "saisie" {
  return p.synchro?.champs.includes(champ) && !p.synchro.surcharges?.[champ] ? "source" : "saisie";
}
