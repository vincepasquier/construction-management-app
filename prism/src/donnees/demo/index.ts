// Jeu de démonstration, entièrement fictif : les deux projets de construction de Chantier+, complétés
// par des projets d'autres types venus de la source simulée.
import { donneesDemo, ID_PROPRIETAIRE } from "../../domaine/data/demo";
import type { Personne, Projet } from "../../domaine/types";
import { convertirChantierPlus, type DocsParCollection } from "../reprise";

const GROUPE: Personne[] = [
  { id: "per-pmo", nom: "Hélène Marchand", role: "Assistant(e) de projet", fonction: "Responsable PMO", email: "h.marchand@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-dfi", acces: { profil: "PMO", projets: "tous", modules: {} } },
  { id: "per-fin", nom: "Olivier Schwab", role: "Ingénieur", fonction: "Contrôleur de gestion", email: "o.schwab@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-dfi", acces: { profil: "Finance", projets: "tous", modules: {} } },
  { id: "per-dir", nom: "Isabelle Roten", role: "Maître d'ouvrage", fonction: "Directrice Solutions Energie", email: "i.roten@exemple.ch", organisation: "Groupe", capacite: 20, directionId: "dir-dse", acces: { profil: "Direction", projets: [], directions: ["dir-dse"], modules: {} } },
  { id: "per-cominv", nom: "Paul Gremaud", role: "Maître d'ouvrage", fonction: "Membre du comité d'investissement", email: "p.gremaud@exemple.ch", organisation: "Groupe", capacite: 10, acces: { profil: "ComInv", projets: "tous", modules: {} } },
  { id: "per-keller", nom: "Thomas Keller", role: "Directeur de projet", fonction: "Chef de projet distribution", email: "t.keller@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-dde", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-dde"], modules: {} } },
  { id: "per-aymon", nom: "Lucien Aymon", role: "Directeur de projet", fonction: "Chef de projet production", email: "l.aymon@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-den", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-den"], modules: {} } },
  { id: "per-crettaz", nom: "Nathalie Crettaz", role: "Directeur de projet", fonction: "Responsable communication institutionnelle", email: "n.crettaz@exemple.ch", organisation: "Groupe", capacite: 80, directionId: "dir-dgc", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-dgc"], modules: {} } },
  { id: "per-savioz", nom: "Bernard Savioz", role: "Directeur de projet", fonction: "Secrétaire général", email: "b.savioz@exemple.ch", organisation: "Groupe", capacite: 40, directionId: "dir-dg", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-dg"], modules: {} } },
  { id: "per-dubois", nom: "Amélie Dubois", role: "Directeur de projet", fonction: "Cheffe de projet numérique", email: "a.dubois@exemple.ch", organisation: "Groupe", capacite: 100, directionId: "dir-dfi", acces: { profil: "Directeur de projet", projets: [], directions: ["dir-dfi"], modules: {} } },
];

const COMPLEMENTS: Record<string, Partial<Projet>> = {
  "prj-1": { numeroSource: "DSE-2025-0601", directionId: "dir-dse", portefeuilleId: "pf-inv", sponsorId: "per-dir", priorite: "Haute", classification: "Renouvellement", phaseGroupe: "Réalisation", strategique: true },
  "prj-2": { numeroSource: "DSE-2026-0240", directionId: "dir-dse", portefeuilleId: "pf-inv", sponsorId: "per-dir", priorite: "Normale", classification: "Réglementaire", phaseGroupe: "Appel d'offres" },
};

/** Numéros importés de la source simulée pour peupler le portefeuille de démonstration */
export const NUMEROS_DEMO = ["DSE-2026-0312", "DDE-2025-0098", "DDE-2026-0154", "DFI-2026-0021", "DFI-2025-0177", "DFI-2026-0009", "DEN-2024-0033", "DEN-2026-0118", "DGC-2026-0031", "DG-2026-0002"];

/** Compléments appliqués aux projets importés de la source */
export const COMPLEMENTS_SOURCE: Record<string, Partial<Projet>> = {
  "DSE-2026-0312": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", sponsorId: "per-dir", priorite: "Critique", classification: "Stratégique", strategique: true, suiviCA: true, phaseGroupe: "Étude du projet", lieu: "Quartier des Moulins" },
  "DSE-2026-0312-01": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", phaseGroupe: "Étude du projet" },
  "DSE-2026-0312-02": { portefeuilleId: "pf-inv", programmeId: "pg-chaleur", phaseGroupe: "Études préliminaires" },
  "DDE-2025-0098": { portefeuilleId: "pf-inv", priorite: "Haute", classification: "Renouvellement", phaseGroupe: "Réalisation" },
  "DDE-2026-0154": { portefeuilleId: "pf-inv", priorite: "Haute", classification: "Réglementaire", strategique: true, suiviCA: true, phaseGroupe: "Réalisation" },
  "DFI-2026-0021": { portefeuilleId: "pf-num", programmeId: "pg-donnees", sponsorId: "per-pmo", priorite: "Haute", classification: "Stratégique", strategique: true, phaseGroupe: "Définition des objectifs", confidentialite: "Interne" },
  "DFI-2025-0177": { portefeuilleId: "pf-num", programmeId: "pg-donnees", priorite: "Normale", classification: "Métier", phaseGroupe: "Réalisation" },
  "DFI-2026-0009": { portefeuilleId: "pf-org", priorite: "Normale", classification: "Amélioration continue", phaseGroupe: "Réalisation", confidentialite: "Confidentiel" },
  "DEN-2026-0118": { portefeuilleId: "pf-inv", sponsorId: "per-cominv", priorite: "Haute", classification: "Renouvellement", phaseGroupe: "Appel d'offres", lieu: "Centrale de Planchamp" },
  "DGC-2026-0031": { portefeuilleId: "pf-org", sponsorId: "per-savioz", priorite: "Normale", classification: "Réglementaire", phaseGroupe: "Réalisation" },
  "DG-2026-0002": { portefeuilleId: "pf-org", sponsorId: "per-cominv", priorite: "Haute", classification: "Stratégique", strategique: true, suiviCA: true, phaseGroupe: "Étude du projet", confidentialite: "Confidentiel" },
  "DEN-2024-0033": { portefeuilleId: "pf-inv", priorite: "Basse", classification: "Renouvellement", phaseGroupe: "Clôture", statut: "Terminé" },
};

export const UTILISATEUR_DEMO = ID_PROPRIETAIRE;

export function docsDemo(): DocsParCollection {
  const base = donneesDemo();
  const docs = convertirChantierPlus(base);
  docs.projets = (docs.projets as Projet[]).map((p) => ({ ...p, ...COMPLEMENTS[p.id] }));
  docs.personnes = [
    ...(base.personnes.map((p): Personne => {
      if (p.id === ID_PROPRIETAIRE) return { ...p, directionId: "dir-dse", acces: { profil: "Administrateur", projets: "tous", modules: {} } };
      return { ...p, directionId: "dir-dse" };
    })),
    ...GROUPE,
  ];
  return docs;
}
