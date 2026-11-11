// Jeu de démonstration, entièrement fictif : les deux projets de construction de Chantier+, complétés
// par des projets d'autres types venus de la source simulée.
import { donneesDemo, ID_PROPRIETAIRE } from "../../domaine/data/demo";
import type { Personne, Projet } from "../../domaine/types";
import { convertirChantierPlus, type DocsParCollection } from "../reprise";

const GROUPE: Personne[] = [
  { id: "per-pmo", nom: "Hélène Marchand", role: "Assistant(e) de projet", fonction: "Responsable PMO", email: "h.marchand@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-fin", acces: { profil: "PMO", projets: "tous", modules: {} } },
  { id: "per-fin", nom: "Olivier Schwab", role: "Ingénieur", fonction: "Contrôleur de gestion", email: "o.schwab@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-fin", acces: { profil: "Finance", projets: "tous", modules: {} } },
  { id: "per-dir", nom: "Isabelle Roten", role: "Maître d'ouvrage", fonction: "Directrice Infrastructures", email: "i.roten@exemple.ch", organisation: "Groupe", capacite: 20, directionId: "dir-inf", acces: { profil: "Direction", projets: [], directions: ["dir-inf"], modules: {} } },
  { id: "per-cominv", nom: "Paul Gremaud", role: "Maître d'ouvrage", fonction: "Membre du comité d'investissement", email: "p.gremaud@exemple.ch", organisation: "Groupe", capacite: 10, acces: { profil: "ComInv", projets: "tous", modules: {} } },
  { id: "per-keller", nom: "Thomas Keller", role: "Directeur de projet", fonction: "Chef de projet réseaux", email: "t.keller@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-enr", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-enr"], modules: {} } },
  { id: "per-dubois", nom: "Amélie Dubois", role: "Directeur de projet", fonction: "Cheffe de projet numérique", email: "a.dubois@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-num", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-num"], modules: {} } },
];

const COMPLEMENTS: Record<string, Partial<Projet>> = {
  "prj-1": { numeroSource: "INF-2025-0601", directionId: "dir-inf", portefeuilleId: "pf-inv", sponsorId: "per-dir", priorite: "Haute", classification: "Renouvellement", phaseGroupe: "Réalisation", strategique: true },
  "prj-2": { numeroSource: "INF-2026-0240", directionId: "dir-inf", portefeuilleId: "pf-inv", sponsorId: "per-dir", priorite: "Normale", classification: "Réglementaire", phaseGroupe: "Appel d'offres" },
};

/** Numéros importés de la source simulée pour peupler le portefeuille de démonstration */
export const NUMEROS_DEMO = ["INF-2026-0312", "ENR-2025-0098", "ENR-2026-0154", "NUM-2026-0021", "NUM-2025-0177", "FIN-2026-0009", "ENR-2024-0033"];

/** Compléments appliqués aux projets importés de la source */
export const COMPLEMENTS_SOURCE: Record<string, Partial<Projet>> = {
  "INF-2026-0312": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", sponsorId: "per-dir", priorite: "Critique", classification: "Stratégique", strategique: true, suiviCA: true, phaseGroupe: "Étude du projet", lieu: "Quartier des Moulins" },
  "INF-2026-0312-01": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", phaseGroupe: "Étude du projet" },
  "INF-2026-0312-02": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", phaseGroupe: "Études préliminaires" },
  "ENR-2025-0098": { portefeuilleId: "pf-inv", priorite: "Haute", classification: "Renouvellement", phaseGroupe: "Réalisation" },
  "ENR-2026-0154": { portefeuilleId: "pf-inv", priorite: "Haute", classification: "Réglementaire", strategique: true, suiviCA: true, phaseGroupe: "Réalisation" },
  "NUM-2026-0021": { portefeuilleId: "pf-num", programmeId: "pg-donnees", sponsorId: "per-pmo", priorite: "Haute", classification: "Stratégique", strategique: true, phaseGroupe: "Définition des objectifs", confidentialite: "Interne" },
  "NUM-2025-0177": { portefeuilleId: "pf-num", programmeId: "pg-donnees", priorite: "Normale", classification: "Métier", phaseGroupe: "Réalisation" },
  "FIN-2026-0009": { portefeuilleId: "pf-org", priorite: "Normale", classification: "Amélioration continue", phaseGroupe: "Réalisation", confidentialite: "Confidentiel" },
  "ENR-2024-0033": { portefeuilleId: "pf-inv", priorite: "Basse", classification: "Renouvellement", phaseGroupe: "Clôture", statut: "Terminé" },
};

export const UTILISATEUR_DEMO = ID_PROPRIETAIRE;

export function docsDemo(): DocsParCollection {
  const base = donneesDemo();
  const docs = convertirChantierPlus(base);
  docs.projets = (docs.projets as Projet[]).map((p) => ({ ...p, ...COMPLEMENTS[p.id] }));
  docs.personnes = [
    ...(base.personnes.map((p): Personne => {
      if (p.id === ID_PROPRIETAIRE) return { ...p, directionId: "dir-inf", acces: { profil: "Administrateur", projets: "tous", modules: {} } };
      return { ...p, directionId: "dir-inf" };
    })),
    ...GROUPE,
  ];
  return docs;
}
