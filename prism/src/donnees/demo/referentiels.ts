// Référentiels de départ : types de projet, directions, portefeuilles et configuration.
// Tout est modifiable dans l'administration ; rien ici ne décrit une organisation réelle.
import type { Configuration, Direction, Portefeuille, Programme, TypeProjet } from "../../domaine/socle/types";
import { PHASES_GROUPE } from "../../domaine/socle/types";
import type { ModuleApp } from "../../domaine/types";

const SOCLE: ModuleApp[] = ["portefeuille", "finances", "risques", "mandat", "rapports", "cominv", "planning", "taches", "validations", "documents", "organigramme", "ressources", "ia"];

export const TYPE_CONSTRUCTION = "construction";

export const TYPES_PROJET: TypeProjet[] = [
  {
    id: TYPE_CONSTRUCTION, nom: "Construction et infrastructure",
    description: "Ouvrages, réseaux et installations : suivi financier par position, appels d'offres, contrats, chantier, autorisations.",
    modeFinancier: "positions",
    modules: [...SOCLE, "appelsOffres", "contrats", "chantier", "juridique", "entreprises"],
    phases: [...PHASES_GROUPE],
    champsObligatoires: { "*": ["code", "nom", "directeurId", "dateDebut", "dateFin"], "Réalisation": ["maitreOuvrage", "lieu"] },
    champs: [
      { cle: "typeOuvrage", libelle: "Type d'ouvrage", type: "liste", options: ["Bâtiment", "Génie civil", "Réseau", "Installation énergétique", "Autre"] },
      { cle: "parcelles", libelle: "Parcelles concernées", type: "texte" },
    ],
  },
  {
    id: "numerique", nom: "Numérique",
    description: "Applications, données et infrastructures informatiques.",
    modeFinancier: "synthese", modules: SOCLE, phases: [...PHASES_GROUPE],
    champsObligatoires: { "*": ["code", "nom", "directeurId", "directionId"] },
    champs: [
      { cle: "application", libelle: "Application ou système concerné", type: "texte" },
      { cle: "archiboard", libelle: "Validation en comité d'architecture", type: "date" },
    ],
  },
  {
    id: "organisation", nom: "Organisation et amélioration continue",
    description: "Transformation, processus, conduite du changement.",
    modeFinancier: "synthese", modules: SOCLE.filter((m) => m !== "cominv"), phases: ["Définition des objectifs", "Étude du projet", "Réalisation", "Clôture"],
    champsObligatoires: { "*": ["code", "nom", "directeurId", "directionId"] },
    champs: [{ cle: "processus", libelle: "Processus concerné", type: "texte" }],
  },
  {
    id: "investissement", nom: "Investissement",
    description: "Acquisitions et renouvellements suivis par le comité d'investissement.",
    modeFinancier: "synthese", modules: SOCLE, phases: [...PHASES_GROUPE],
    champsObligatoires: { "*": ["code", "nom", "directeurId", "directionId", "compteAnalytique"] },
    champs: [{ cle: "dureeAmortissement", libelle: "Durée d'amortissement (années)", type: "nombre" }],
  },
];

export const DIRECTIONS: Direction[] = [
  { id: "dir-inf", code: "INF", nom: "Infrastructures et construction" },
  { id: "dir-enr", code: "ENR", nom: "Énergie et réseaux" },
  { id: "dir-num", code: "NUM", nom: "Numérique" },
  { id: "dir-fin", code: "FIN", nom: "Finances et services" },
];

export const PORTEFEUILLES: Portefeuille[] = [
  { id: "pf-inv", nom: "Investissements d'infrastructure", description: "Ouvrages et réseaux" },
  { id: "pf-num", nom: "Feuille de route numérique", description: "Projets de transformation numérique" },
  { id: "pf-org", nom: "Excellence opérationnelle", description: "Organisation et amélioration continue" },
];

export const PROGRAMMES: Programme[] = [
  { id: "pg-chaleur", nom: "Réseaux de chaleur 2030", portefeuilleId: "pf-inv", description: "Extension des réseaux de chauffage à distance" },
  { id: "pg-donnees", nom: "Données et pilotage", portefeuilleId: "pf-num", description: "Outils de pilotage et qualité des données" },
];

export const CONFIGURATION: Configuration = {
  id: "courante", version: 1, date: "2026-01-01T00:00:00.000Z", commentaire: "Configuration de départ",
  seuilVariationPct: 2,
  matriceRisques: { modere: 4, eleve: 9, critique: 15 },
  seuilsSante: { surveiller: 0, critique: 5 },
  joursRevueRisque: 90,
  conservationAnnees: 10,
  competences: ["Direction de projet", "Ingénierie", "Conduite de travaux", "Informatique", "Finance", "Achats", "Juridique"],
  classifications: ["Stratégique", "Métier", "Réglementaire", "Renouvellement", "Amélioration continue"],
  criteresCompletude: [
    { id: "cc-responsable", libelle: "Un responsable de projet est désigné", axe: "Qualité des données", poids: 1, regle: "responsable", actif: true },
    { id: "cc-champs", libelle: "Les champs obligatoires de la fiche sont renseignés", axe: "Qualité des données", poids: 2, regle: "champsObligatoires", actif: true },
    { id: "cc-finances", libelle: "La situation financière a été arrêtée le mois dernier", axe: "Qualité des données", poids: 2, regle: "periodeRecente", actif: true },
    { id: "cc-risques", libelle: "Les risques ouverts ont été revus dans le délai", axe: "Qualité des données", poids: 2, regle: "risquesRevus", actif: true },
    { id: "cc-jalons", libelle: "Aucun jalon dépassé n'est resté sans date réelle", axe: "Qualité des données", poids: 1, regle: "jalonsAJour", actif: true },
    { id: "cc-mandat", libelle: "Le mandat de projet est signé", axe: "Documentaire", poids: 3, regle: "mandatSigne", actif: true },
    { id: "cc-rapport", libelle: "Un rapport existe pour chaque phase terminée", axe: "Documentaire", poids: 2, regle: "rapportsPhase", actif: true },
    { id: "cc-parties", libelle: "Les parties prenantes sont identifiées", axe: "Documentaire", poids: 1, regle: "partiesPrenantes", actif: true },
    { id: "cc-decisions", libelle: "Les conditions des décisions sont suivies", axe: "Documentaire", poids: 1, regle: "conditionsSuivies", actif: true },
  ],
  circuits: [
    { id: "ci-doc", nom: "Document technique (plans, notes de calcul)", typeObjet: "Document", mode: "sequentiel", roles: ["Ingénieur", "Directeur de projet"] },
    { id: "ci-facture", nom: "Facture / situation", typeObjet: "Facture", mode: "sequentiel", roles: ["Conducteur de travaux", "Responsable de lot", "Directeur de projet"] },
    { id: "ci-facture-haut", nom: "Facture importante (dès 250'000 CHF)", typeObjet: "Facture", mode: "sequentiel", roles: ["Responsable de lot", "Directeur de projet", "Maître d'ouvrage"], seuilMin: 250_000 },
    { id: "ci-avenant", nom: "Avenant", typeObjet: "Avenant", mode: "sequentiel", roles: ["Responsable de lot", "Directeur de projet", "Maître d'ouvrage"] },
    { id: "ci-pv", nom: "PV de séance / courrier", typeObjet: "Document", mode: "sequentiel", roles: ["Directeur de projet"] },
    { id: "ci-mutation", nom: "Mutation budgétaire", typeObjet: "Mutation", mode: "sequentiel", roles: ["Directeur de projet", "Maître d'ouvrage"] },
    { id: "ci-mandat", nom: "Mandat de projet", typeObjet: "Mandat", mode: "parallele", roles: ["Commanditaire", "Client", "Chef de projet"] },
    { id: "ci-rapport", nom: "Rapport de phase ou de clôture", typeObjet: "Rapport", mode: "sequentiel", roles: ["Directeur de projet", "PMO"] },
  ],
};
