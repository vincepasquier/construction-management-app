// Reprise de la structure d'un projet existant dans un nouveau projet : lots, organigramme, parties
// prenantes, jalons et registre des risques — sans aucune donnée financière ni document.
import { joursEntre, ajouterJours } from "../domaine/lib/format";
import { nouvelId } from "../domaine/lib/id";
import type { ID } from "../domaine/types";
import type { Depot } from "./depot";

export interface StructureReprise { lots: number; fonctions: number; parties: number; jalons: number; risques: number }

export function dupliquerStructure(depot: Depot, sourceId: ID, cibleId: ID, jour: string): StructureReprise {
  const source = depot.parId("projets", sourceId), cible = depot.parId("projets", cibleId);
  if (!source || !cible) throw new Error("Projet introuvable.");
  const r: StructureReprise = { lots: 0, fonctions: 0, parties: 0, jalons: 0, risques: 0 };
  const decalage = joursEntre(source.dateDebut, cible.dateDebut);
  const lots = new Map<ID, ID>(), noeuds = new Map<ID, ID>(), taches = new Map<ID, ID>();

  depot.grouper(`Structure reprise du projet ${source.code}`, () => {
    for (const l of depot.parProjet("lots", sourceId)) {
      const id = nouvelId("lot");
      lots.set(l.id, id);
      // Le responsable du lot n'est pas repris : il se désigne dans le nouveau projet
      depot.ajouter("lots", { ...l, id, projetId: cibleId, responsableId: undefined });
      r.lots++;
    }
    const organigramme = depot.parProjet("organigramme", sourceId);
    for (const n of organigramme) noeuds.set(n.id, nouvelId("org"));
    for (const n of organigramme) {
      // Les fonctions sont reprises, pas leurs titulaires
      depot.ajouter("organigramme", { ...n, id: noeuds.get(n.id)!, projetId: cibleId, parentId: n.parentId ? noeuds.get(n.parentId) : undefined, personneId: undefined, entrepriseId: undefined, nomLibre: undefined });
      r.fonctions++;
    }
    for (const p of depot.parProjet("partiesPrenantes", sourceId)) {
      depot.ajouter("partiesPrenantes", { id: nouvelId("pp"), projetId: cibleId, roleProjet: p.roleProjet, interne: p.interne, responsabilites: p.responsabilites, nom: p.personneId || p.entrepriseId ? undefined : p.nom });
      r.parties++;
    }
    const jalons = depot.parProjet("taches", sourceId).filter((t) => t.jalon);
    for (const t of jalons) taches.set(t.id, nouvelId("tac"));
    for (const t of jalons) {
      const fin = ajouterJours(t.finPrevue ?? t.fin, decalage);
      depot.ajouter("taches", { id: taches.get(t.id)!, projetId: cibleId, nom: t.nom, lotId: t.lotId ? lots.get(t.lotId) : undefined, debut: fin, fin, avancement: 0, jalon: true, dependances: t.dependances.map((d) => taches.get(d)).filter((d): d is ID => !!d) });
      r.jalons++;
    }
    depot.parProjet("risques", sourceId).forEach((x, i) => {
      depot.ajouter("risques", {
        id: nouvelId("rsk"), projetId: cibleId, code: `R-${String(i + 1).padStart(2, "0")}`, titre: x.titre, description: x.description, categorie: x.categorie, nature: x.nature, cause: x.cause, evenement: x.evenement, consequence: x.consequence,
        probabilite: x.probabilite, impact: x.impact, impactFinancier: 0, statut: "Ouvert", mesures: x.mesures, strategie: x.strategie, lotId: x.lotId ? lots.get(x.lotId) : undefined, dateIdentification: jour,
      });
      r.risques++;
    });
  });
  return r;
}
