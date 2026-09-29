// Construction de l'organigramme de projet : génération automatique depuis les données
// du projet (lots, responsables, contrats) ou modèle type à compléter.
import type { Contrat, Entreprise, Lot, NoeudOrganigramme, Personne, Projet } from "../types";
import { nouvelId } from "./id";

export const COULEUR_NOEUD: Record<NoeudOrganigramme["type"], string> = {
  "Maître d'ouvrage": "#0f172a",
  "Commission": "#475569",
  "Direction de projet": "#4f46e5",
  "Direction des travaux": "#7c3aed",
  "Lot": "#0891b2",
  "Mandataire": "#d97706",
  "Entreprise": "#059669",
  "Autre": "#64748b",
};

export function genererDepuisProjet(
  projet: Projet, lots: Lot[], personnes: Personne[], contrats: Contrat[], entreprises: Entreprise[],
): NoeudOrganigramme[] {
  const n: NoeudOrganigramme[] = [];
  const ajouter = (x: Omit<NoeudOrganigramme, "id" | "projetId" | "ordre">) => {
    const noeud = { ...x, id: nouvelId("org"), projetId: projet.id, ordre: n.filter((y) => y.parentId === x.parentId).length };
    n.push(noeud);
    return noeud;
  };
  const mo = personnes.find((p) => p.role === "Maître d'ouvrage");
  const racine = ajouter({ type: "Maître d'ouvrage", titre: "Maître d'ouvrage", personneId: mo?.id, nomLibre: mo ? undefined : projet.maitreOuvrage });
  const dp = ajouter({ type: "Direction de projet", titre: "Direction de projet", parentId: racine.id, personneId: projet.directeurId });

  for (const c of contrats.filter((x) => x.type === "Mandat")) {
    ajouter({ type: "Mandataire", titre: c.objet, parentId: dp.id, entrepriseId: c.entrepriseId });
  }
  const conducteur = personnes.find((p) => p.role === "Conducteur de travaux");
  if (conducteur) ajouter({ type: "Direction des travaux", titre: "Direction des travaux", parentId: dp.id, personneId: conducteur.id });

  for (const l of lots) {
    const noeudLot = ajouter({ type: "Lot", titre: `${l.code} – ${l.nom}`, parentId: dp.id, personneId: l.responsableId });
    const deja = new Set<string>();
    for (const c of contrats.filter((x) => x.lotId === l.id && x.type !== "Mandat")) {
      if (deja.has(c.entrepriseId)) continue;
      deja.add(c.entrepriseId);
      const e = entreprises.find((x) => x.id === c.entrepriseId);
      ajouter({ type: "Entreprise", titre: e ? c.objet : "Entreprise", parentId: noeudLot.id, entrepriseId: c.entrepriseId });
    }
  }
  return n;
}

export function modeleType(projetId: string): NoeudOrganigramme[] {
  const id = () => nouvelId("org");
  const mo = id(), dp = id();
  const base = (x: Omit<NoeudOrganigramme, "projetId">): NoeudOrganigramme => ({ ...x, projetId });
  return [
    base({ id: mo, type: "Maître d'ouvrage", titre: "Maître d'ouvrage", ordre: 0 }),
    base({ id: id(), type: "Commission", titre: "Commission de construction", parentId: mo, ordre: 0 }),
    base({ id: dp, type: "Direction de projet", titre: "Direction de projet", parentId: mo, ordre: 1 }),
    base({ id: id(), type: "Mandataire", titre: "Ingénieur civil", parentId: dp, ordre: 0 }),
    base({ id: id(), type: "Mandataire", titre: "Géotechnicien", parentId: dp, ordre: 1 }),
    base({ id: id(), type: "Direction des travaux", titre: "Direction des travaux", parentId: dp, ordre: 2 }),
    base({ id: id(), type: "Lot", titre: "Lot 1 – Génie civil", parentId: dp, ordre: 3 }),
    base({ id: id(), type: "Lot", titre: "Lot 2 – Réseaux", parentId: dp, ordre: 4 }),
  ];
}

export function enfants(noeuds: NoeudOrganigramme[], parentId?: string) {
  return noeuds.filter((x) => x.parentId === parentId).sort((a, b) => a.ordre - b.ordre);
}

/** Supprime un nœud et toute sa descendance */
export function descendance(noeuds: NoeudOrganigramme[], id: string): string[] {
  return [id, ...noeuds.filter((x) => x.parentId === id).flatMap((x) => descendance(noeuds, x.id))];
}
