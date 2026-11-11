// Lecture du journal d'audit selon les droits : une entrée n'est montrée que si la personne peut
// voir le projet concerné et lire le module des objets modifiés.
import { niveau, projetVisible } from "../domaine/socle/droits";
import type { ID, Personne } from "../domaine/types";
import type { Depot } from "./depot";
import { detailler, resumerValeur } from "./diff";
import type { Changement, EntreeJournal } from "./journal";
import { META, moduleDe, type NomCollection } from "./schema";

/** Collections dont les écritures ne font pas partie de l'historique métier */
const BRUIT: NomCollection[] = ["notifications", "vues"];

export function journalVisible(depot: Depot, p: Personne | undefined): EntreeJournal[] {
  const projets = new Map(depot.tous("projets").map((x) => [x.id, x]));
  const projetOk = (id: ID | undefined) => { if (!id) return true; const x = projets.get(id); return !x || projetVisible(p, x); };
  const changementOk = (c: Changement) => !BRUIT.includes(c.collection) && projetOk(c.projetId) && niveau(p, moduleDe(c.collection, c.avant)) !== "aucun";
  const admin = niveau(p, "parametres") !== "aucun";
  return depot.journal.flatMap((e) => {
    if (!projetOk(e.projetId)) return [];
    if (e.changements.length === 0) {
      // Entrée sans détail (import, synchronisation, export) : réservée aux administrateurs hors projet
      if (e.libelle === "Notifications" || e.libelle === "Notifications lues" || e.libelle.startsWith("Rappels")) return [];
      return e.projetId || admin ? [e] : [];
    }
    const changements = e.changements.filter(changementOk);
    return changements.length ? [{ ...e, changements }] : [];
  });
}

export interface LigneAudit {
  date: string;
  auteur: string;
  origine: string;
  action: string;
  objet: string;
  type: string;
  champ: string;
  avant: string;
  apres: string;
  motif: string;
  projet: string;
}

const OPERATION = { creer: "Création", modifier: "Modification", supprimer: "Suppression" } as const;

/** Journal à plat, une ligne par champ modifié : c'est l'export d'audit */
export function lignesAudit(depot: Depot, entrees: EntreeJournal[]): LigneAudit[] {
  const nom = (id?: ID) => depot.parId("personnes", id)?.nom ?? (id ? "Utilisateur supprimé" : "Système");
  const code = (id?: ID) => depot.parId("projets", id)?.code ?? "";
  return entrees.flatMap((e) => {
    const base = { date: e.date, auteur: nom(e.acteurId), origine: e.origine, motif: e.motif ?? "", projet: code(e.projetId) };
    if (e.changements.length === 0) return [{ ...base, action: e.libelle, objet: "", type: "", champ: "", avant: "", apres: e.volumes ? `${e.volumes.crees} créés, ${e.volumes.modifies} modifiés, ${e.volumes.supprimes} supprimés` : "" }];
    return e.changements.flatMap((c) => {
      const commun = { ...base, projet: code(c.projetId ?? e.projetId), action: `${OPERATION[c.op]} · ${e.libelle}`, objet: c.objet, type: META[c.collection].libelle };
      if (c.op !== "modifier" || !c.champs?.length) return [{ ...commun, champ: "", avant: "", apres: "" }];
      return c.champs.flatMap((ch) => detailler(ch)).map((d) => ({ ...commun, champ: d.chemin, avant: resumerValeur(d.avant), apres: resumerValeur(d.apres) }));
    });
  });
}
