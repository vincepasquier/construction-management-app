// Session de l'utilisateur sur ce poste : qui il est et ses préférences d'affichage.
import type { ID } from "../domaine/types";
import { creerEtat } from "./etat";

export interface Session {
  /** Sans authentification, l'utilisateur se choisit dans la liste de l'équipe */
  utilisateurId: ID | null;
  /** Filtre « Mes lots » pour les responsables de lot */
  vueMesLots: boolean;
  theme: "clair" | "sombre";
  /** Dernier projet ouvert, proposé au retour */
  dernierProjetId: ID | null;
  /** Date de la dernière sauvegarde téléchargée */
  derniereSauvegarde: string | null;
}

export const session = creerEtat<Session>(
  { utilisateurId: null, vueMesLots: false, theme: "clair", dernierProjetId: null, derniereSauvegarde: null },
  "prism-session",
);
