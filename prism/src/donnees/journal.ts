// Journal d'audit : chaque écriture y laisse une entrée (qui, quand, quoi, ancienne et nouvelle valeur).
import type { ID } from "../domaine/types";
import type { ChangementChamp } from "./diff";
import type { DocQuelconque, NomCollection } from "./schema";

export type Origine = "saisie" | "import" | "connecteur" | "ia" | "migration" | "systeme";

export interface Changement {
  collection: NomCollection;
  id: ID;
  op: "creer" | "modifier" | "supprimer";
  /** Désignation de l'objet au moment de l'écriture */
  objet: string;
  projetId?: ID;
  /** Champs de premier niveau modifiés, avec ancienne et nouvelle valeur */
  champs?: ChangementChamp[];
  /** Enregistrement complet avant suppression (permet de le rétablir) */
  avant?: DocQuelconque;
}

export interface EntreeJournal {
  seq: number;
  /** Date et heure (ISO) */
  date: string;
  acteurId?: ID;
  origine: Origine;
  libelle: string;
  projetId?: ID;
  motif?: string;
  changements: Changement[];
  /** Volumes d'une écriture de masse dont le détail n'est pas conservé (import, synchronisation) */
  volumes?: { crees: number; modifies: number; supprimes: number };
  /** L'entrée ne peut pas être annulée (clôture, signature, import de masse) */
  irreversible?: boolean;
  /** Numéro de l'entrée qui a annulé celle-ci */
  annuleePar?: number;
  /** Numéro de l'entrée que celle-ci annule */
  annule?: number;
}

export interface FiltreJournal {
  projetId?: ID;
  collection?: NomCollection;
  id?: ID;
  acteurId?: ID;
  texte?: string;
}

export function filtrerJournal(journal: EntreeJournal[], f: FiltreJournal): EntreeJournal[] {
  const texte = f.texte?.trim().toLowerCase();
  return journal.filter((e) => {
    if (f.acteurId && e.acteurId !== f.acteurId) return false;
    if (f.projetId && e.projetId !== f.projetId && !e.changements.some((c) => c.projetId === f.projetId)) return false;
    if (f.collection && !e.changements.some((c) => c.collection === f.collection && (!f.id || c.id === f.id))) return false;
    if (texte && !`${e.libelle} ${e.motif ?? ""} ${e.changements.map((c) => c.objet).join(" ")}`.toLowerCase().includes(texte)) return false;
    return true;
  });
}
