// Simulation complète, entièrement fictive : pour chacune des six directions du groupe, un projet
// rempli de bout en bout — risques, planning et jalons, tâches, comité de pilotage avec son
// procès-verbal, décisions, documents, notes — et, pour les projets de construction, des contrats
// dont les conditions sont renseignées. Toutes les dates sont posées par rapport au jour du chargement.
import { ajouterJours } from "../../domaine/lib/format";
import { nouvelleSeance } from "../../domaine/socle/seances";
import type { CanalNote, NoteProjet, PointSeance, Seance } from "../../domaine/socle/types";
import type { Action, CategorieDocument, CategorieRisque, ConditionsContrat, DocumentProjet, Projet, Risque, Tache } from "../../domaine/types";
import type { Depot } from "../depot";
import { enregistrerSeance } from "../seances";

type LigneRisque = [titre: string, categorie: CategorieRisque, probabilite: number, impact: number, impactFinancier: number, description: string, mesures: string, strategie?: Risque["strategie"]];
/** Jalon : nom, jours depuis aujourd'hui (date actuelle), glissement en jours par rapport à la référence */
type LigneJalon = [nom: string, dans: number, glissement?: number];
type LigneTache = [nom: string, debut: number, fin: number, avancement: number];
type LigneAction = [titre: string, dans: number, priorite: Action["priorite"], statut?: Action["statut"]];
type LigneDocument = [nom: string, categorie: CategorieDocument, version: string, ilYA: number];
interface LignePoint { titre: string; texte: string; nature?: PointSeance["nature"]; clos?: boolean; dans?: number; responsable?: string; montant?: number; statut?: "Approuvée" | "Reportée" | "Refusée"; condition?: string }

interface Fiche {
  numero: string;
  risques: LigneRisque[];
  jalons: LigneJalon[];
  taches: LigneTache[];
  actions: LigneAction[];
  documents: LigneDocument[];
  /** Comité de pilotage : jours écoulés depuis la séance, lieu, invités extérieurs, points */
  pilotage?: { ilYA: number; lieu: string; invites?: [nom: string, organisation: string][]; points: LignePoint[] };
  notes?: [canal: CanalNote, texte: string, auteur: string, ilYA: number][];
}

const FICHES: Fiche[] = [
  {
    // DSE — Direction Solutions Energie
    numero: "DSE-2026-0312",
    risques: [
      ["Taux de raccordement inférieur aux prévisions", "Financier", 3, 5, 900_000, "Le plan financier suppose 70 % de la puissance souscrite à la mise en service. Les promesses signées en couvrent 48 %.", "Campagne auprès des gérances et des propriétaires institutionnels ; raccordement des bâtiments communaux en priorité.", "Réduire"],
      ["Opposition au permis de construire de la chaufferie", "Juridique", 3, 4, 250_000, "Deux riverains ont annoncé une opposition (trafic de livraison du bois, panache).", "Séance d'information avant la mise à l'enquête ; étude de trafic et notice de bruit jointes au dossier.", "Réduire"],
      ["Retard de livraison de la chaudière bois", "Délais", 2, 4, 120_000, "Délais de fabrication annoncés à quatorze mois, sans marge sur la saison de chauffe.", "Commande anticipée après le permis ; chaudière mobile de secours prévue au contrat de fourniture.", "Transférer"],
      ["Hausse du prix du bois-énergie", "Financier", 3, 3, 0, "Le prix de la plaquette forestière a progressé de 12 % en deux ans.", "Contrat d'approvisionnement de dix ans avec indexation plafonnée.", "Accepter"],
    ],
    jalons: [["Avant-projet validé par le comité de pilotage", -92], ["Dépôt de la demande de permis de construire", -21, 14], ["Permis de construire en force", 105, 30], ["Début des travaux du bâtiment", 205, 30], ["Première livraison de chaleur", 690]],
    taches: [["Avant-projet", -210, -92, 100], ["Projet de l'ouvrage et dossier de permis", -90, -21, 100], ["Procédure d'autorisation", -21, 105, 20], ["Appels d'offres gros œuvre et chaudière", 30, 180, 0], ["Campagne de raccordement", -60, 240, 35]],
    actions: [["Compléter la campagne de promesses de raccordement (objectif 60 %)", 45, "Haute", "En cours"], ["Organiser la séance d'information des riverains", 12, "Haute"], ["Mettre à jour le plan financier avec le stockage thermique", 20, "Normale"]],
    documents: [["Avant-projet – rapport technique", "Rapports", "B", 92], ["Plan de situation de la chaufferie", "Plans", "C", 25], ["Dossier de demande de permis de construire", "Autorisations", "A", 21], ["Étude de trafic et notice de bruit", "Rapports", "A", 30]],
    pilotage: { ilYA: 24, lieu: "Salle Moulins, siège", invites: [["A. Perrin", "Commune – service de l'urbanisme"]], points: [
      { titre: "Avancement des études", texte: "Le projet de l'ouvrage est terminé ; la demande de permis a été déposée avec deux semaines de retard sur le programme.", nature: "Information", clos: true },
      { titre: "Variante avec stockage thermique", texte: "Le comité retient la variante avec un accumulateur de 200 m3, qui écrête les pointes et réduit la puissance de la chaudière d'appoint.", nature: "Décision", montant: 380_000, statut: "Approuvée", condition: "Plan financier mis à jour avant le passage au comité d'investissement", clos: true },
      { titre: "Promesses de raccordement", texte: "48 % de la puissance est promise. Le comité demande 60 % avant de lancer les appels d'offres.", nature: "Tâche", dans: 45 },
      { titre: "Information des riverains", texte: "Une séance publique est organisée avant la fin de la mise à l'enquête.", nature: "Tâche", dans: 12 },
    ] },
    notes: [["Responsable de projet", "La commune confirme le raccordement de l'école et de la salle polyvalente : +310 kW promis.", "directeur", 6], ["PMO", "Dossier complet. Le sous-projet « réseau » n'a pas encore de mandat signé.", "per-pmo", 10]],
  },
  {
    // DDE — Direction Distribution Electricité
    numero: "DDE-2025-0098",
    risques: [
      ["Retard de livraison des cellules moyenne tension", "Délais", 4, 4, 180_000, "Le fabricant annonce huit semaines de retard sur la seconde série de cellules.", "Suivi mensuel de la fabrication, pénalités prévues au contrat, plan de consignation décalable d'un mois.", "Réduire"],
      ["Fenêtres de consignation indisponibles en hiver", "Technique", 3, 4, 60_000, "La charge du réseau en hiver limite les reports possibles sur les postes voisins.", "Coupures planifiées avec la conduite du réseau six semaines à l'avance ; groupe électrogène de secours pour deux clients sensibles.", "Réduire"],
      ["Incompatibilité du contrôle-commande avec le système de conduite", "Technique", 2, 4, 90_000, "Le nouveau contrôle-commande utilise un protocole plus récent que la passerelle actuelle.", "Essais de plate-forme en usine avant livraison ; passerelle de conversion chiffrée en option.", "Éviter"],
      ["Présence d'amiante dans les anciens caniveaux", "Sécurité", 2, 3, 40_000, "Les caniveaux de 1974 n'ont jamais été diagnostiqués.", "Diagnostic avant travaux ; entreprise spécialisée réservée.", "Réduire"],
    ],
    jalons: [["Commande des cellules moyenne tension", -205], ["Essais de réception en usine", -26, 12], ["Consignation du jeu de barres 1", 22, 30], ["Consignation du jeu de barres 2", 64, 30], ["Mise en service du poste", 122, 31]],
    taches: [["Génie civil des locaux et caniveaux", -160, -62, 100], ["Fabrication des cellules", -205, -26, 100], ["Montage des cellules, jeu de barres 1", -20, 40, 35], ["Montage des cellules, jeu de barres 2", 45, 85, 0], ["Contrôle-commande et essais", 30, 118, 0]],
    actions: [["Confirmer les fenêtres de consignation avec la conduite du réseau", 9, "Urgente", "En cours"], ["Mettre à jour le schéma unifilaire après le montage", 28, "Normale"], ["Commander le diagnostic amiante des caniveaux", -4, "Haute"]],
    documents: [["Schéma unifilaire du poste", "Plans", "C", 40], ["Procès-verbal des essais de réception en usine", "Rapports", "A", 26], ["Contrat de fourniture des cellules moyenne tension", "Contrats", "A", 205], ["Plan de consignation", "Autre", "B", 12]],
    pilotage: { ilYA: 18, lieu: "Poste des Vernes, salle de commande", invites: [["R. Dayer", "Fournisseur des cellules"]], points: [
      { titre: "Avancement", texte: "Génie civil terminé. Les essais en usine sont réussis, avec douze jours de retard. Montage du jeu de barres 1 en cours.", nature: "Information", clos: true },
      { titre: "Report de la mise en service", texte: "Le comité accepte le report d'un mois de la mise en service, conséquence du retard de fabrication. L'atterrissage est relevé du coût de la prolongation des installations provisoires.", nature: "Décision", montant: 130_000, statut: "Approuvée", clos: true },
      { titre: "Plan de consignation d'hiver", texte: "Le plan est à faire valider par la conduite du réseau avant la première coupure.", nature: "Tâche", dans: 9 },
      { titre: "Diagnostic amiante des caniveaux", texte: "Le diagnostic n'est pas encore commandé ; il conditionne la dépose des anciens câbles.", nature: "Tâche", dans: 5 },
    ] },
    notes: [["Finance / ComInv", "Atterrissage supérieur de 130 kCHF au budget approuvé : écart expliqué par le report de la mise en service.", "per-fin", 14]],
  },
  {
    numero: "DDE-2026-0154",
    risques: [
      ["Pénurie de compteurs chez le fournisseur", "Délais", 3, 3, 0, "Les livraisons de la tranche précédente ont glissé de six semaines.", "Stock tampon de 2'000 compteurs ; commandes passées un trimestre à l'avance.", "Réduire"],
      ["Accès refusé par les propriétaires", "Tiers", 3, 2, 0, "8 % des logements de la deuxième tranche n'ont pas pu être équipés au premier passage.", "Prise de rendez-vous en ligne, second passage en soirée.", "Accepter"],
    ],
    jalons: [["Lancement de la tranche", -300], ["9'000 compteurs posés", -15, 20], ["18'000 compteurs posés", 380]],
    taches: [["Pose, secteurs nord et centre", -300, -15, 100], ["Pose, secteurs sud et est", -10, 380, 8], ["Intégration au système de relève", -120, 200, 55]],
    actions: [["Publier le calendrier de pose du secteur sud", 14, "Normale"]],
    documents: [["Programme de déploiement de la troisième tranche", "Autre", "B", 60]],
  },
  {
    // DEN — Direction Énergie
    numero: "DEN-2026-0118",
    risques: [
      ["Roue plus dégradée que prévu au démontage", "Technique", 3, 5, 400_000, "Les dernières inspections montrent de la cavitation sur trois aubes ; l'état réel ne sera connu qu'au démontage.", "Expertise par endoscopie avant l'arrêt ; option de roue neuve chiffrée dans l'appel d'offres.", "Réduire"],
      ["Perte de production si l'arrêt dépasse l'étiage", "Financier", 3, 4, 320_000, "Chaque semaine d'arrêt hors étiage coûte environ 80 kCHF de production.", "Arrêt calé sur l'étiage, travail en deux équipes, pénalités de retard dans le contrat hydromécanique.", "Réduire"],
      ["Crue pendant la mise à sec du canal d'amenée", "Environnement", 2, 4, 150_000, "Le batardeau provisoire est dimensionné pour une crue décennale.", "Surveillance hydrologique, procédure d'évacuation du chantier, assurance tous risques chantier.", "Transférer"],
    ],
    jalons: [["Dossier d'appel d'offres publié", -38], ["Adjudication du lot hydromécanique", 31], ["Arrêt du groupe 2", 152], ["Remise en service", 332]],
    taches: [["Études d'exécution", -125, -38, 100], ["Appel d'offres hydromécanique", -38, 31, 60], ["Fabrication de la roue et des pièces", 40, 200, 0], ["Travaux pendant l'arrêt du groupe", 152, 320, 0]],
    actions: [["Commander l'expertise de la roue par endoscopie", 15, "Haute"], ["Convenir de la période d'arrêt avec l'exploitation", 25, "Haute", "En cours"], ["Demander l'autorisation de mise à sec du canal", 60, "Normale"]],
    documents: [["Rapport d'expertise de l'alternateur", "Rapports", "A", 140], ["Cahier des charges du lot hydromécanique", "Soumissions", "B", 38], ["Planning directeur de la réhabilitation", "Autre", "C", 20]],
    pilotage: { ilYA: 11, lieu: "Centrale de Planchamp", points: [
      { titre: "Appel d'offres hydromécanique", texte: "Trois entreprises ont retiré le dossier ; les offres sont attendues dans un mois.", nature: "Information", clos: true },
      { titre: "Période d'arrêt du groupe", texte: "L'arrêt est fixé à la période d'étiage, pour vingt-quatre semaines. Un arrêt plus long exige une nouvelle décision.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Expertise de la roue avant l'arrêt", texte: "Une endoscopie est demandée pour lever l'incertitude avant l'adjudication.", nature: "Tâche", dans: 15 },
    ] },
  },
  {
    // DFI — Direction Finance et Informatique
    numero: "DFI-2025-0177",
    risques: [
      ["Espaces de projet non conformes aux règles de nommage", "Organisation", 4, 3, 35_000, "Un tiers des espaces inventoriés demande une reprise manuelle.", "Reprise par lots, avec un référent par direction ; outil de renommage en masse.", "Réduire"],
      ["Adoption insuffisante par les directions", "Organisation", 3, 3, 0, "Deux directions continuent d'utiliser des lecteurs réseau.", "Formation des référents, fermeture programmée des anciens lecteurs.", "Réduire"],
      ["Perte de métadonnées à la reprise", "Technique", 2, 4, 20_000, "Les dates et auteurs d'origine ne sont pas repris par l'outil de migration standard.", "Essai de reprise sur un espace pilote ; script de conservation des métadonnées.", "Éviter"],
    ],
    jalons: [["Règles de nommage validées", -160], ["Pilote avec deux directions", -48, 20], ["Reprise des espaces de la DSE", 14, 25], ["Bascule générale", 37, 21]],
    taches: [["Inventaire des espaces", -200, -150, 100], ["Reprise par lots", -45, 30, 55], ["Formation des référents", -30, 20, 70], ["Fermeture des anciens lecteurs", 37, 60, 0]],
    actions: [["Chiffrer la reprise manuelle des espaces non conformes", 7, "Haute", "En cours"], ["Planifier la fermeture des lecteurs réseau avec les directions", 21, "Normale"]],
    documents: [["Règles de nommage et arborescence type", "Autre", "C", 160], ["Bilan du pilote", "Rapports", "A", 40], ["Plan de bascule", "Autre", "A", 8]],
    pilotage: { ilYA: 13, lieu: "Salle Informatique 2", points: [
      { titre: "Bilan du pilote", texte: "Le pilote confirme la solution, mais un tiers des espaces demande une reprise manuelle.", nature: "Information", clos: true },
      { titre: "Crédit complémentaire", texte: "Le comité soutient la demande d'un crédit complémentaire de 35 kCHF ; elle est portée devant le comité d'investissement.", nature: "Décision", montant: 35_000, statut: "Reportée" },
      { titre: "Fermeture des lecteurs réseau", texte: "Calendrier à convenir avec chaque direction avant la bascule.", nature: "Tâche", dans: 21 },
    ] },
  },
  {
    numero: "DFI-2026-0009",
    risques: [["Résistance au changement de circuit de décision", "Organisation", 3, 3, 0, "Les directions craignent un allongement des délais de décision.", "Mesurer les délais avant et après ; présenter le nouveau circuit en comité de direction.", "Réduire"]],
    jalons: [["Processus cible validé", -70], ["Nouveau formulaire de demande en service", 20, 15], ["Bilan après six mois", 200]],
    taches: [["Analyse du processus actuel", -250, -150, 100], ["Conception du processus cible", -150, -70, 100], ["Mise en place et accompagnement", -60, 50, 60]],
    actions: [["Former les assistants de direction au nouveau formulaire", 18, "Normale"]],
    documents: [["Processus d'investissement cible", "Rapports", "B", 70]],
  },
  {
    // DGC — Direction Gouvernance et communication
    numero: "DGC-2026-0031",
    risques: [
      ["Données extra-financières incomplètes dans les directions", "Organisation", 4, 3, 0, "Les indicateurs d'émissions et de consommation d'eau manquent pour deux directions.", "Périmètre du premier rapport limité aux indicateurs disponibles ; plan de collecte pour l'édition suivante.", "Réduire"],
      ["Retard de l'agence sur la refonte du site", "Délais", 3, 3, 15_000, "Les maquettes ont été livrées avec trois semaines de retard.", "Jalons de paiement liés aux livraisons ; mise en ligne possible en deux temps.", "Réduire"],
      ["Exigences de publication modifiées en cours de route", "Juridique", 2, 3, 0, "Le cadre de référence retenu est en révision.", "Veille assurée par le service juridique ; structure du rapport compatible avec les deux versions.", "Accepter"],
    ],
    jalons: [["Analyse de matérialité validée", -125], ["Collecte des indicateurs close", -9, 24], ["Maquettes du site validées", 12, 21], ["Publication du rapport", 76], ["Mise en ligne du nouveau site", 78]],
    taches: [["Analyse de matérialité", -200, -125, 100], ["Collecte des indicateurs", -120, -9, 100], ["Rédaction du rapport", -40, 55, 45], ["Conception et réalisation du site", -90, 78, 50]],
    actions: [["Relancer la DEN et la DDE pour les indicateurs manquants", 5, "Haute", "En cours"], ["Faire relire le rapport par le service juridique", 40, "Normale"], ["Valider les maquettes du site", 12, "Normale"]],
    documents: [["Analyse de matérialité", "Rapports", "B", 125], ["Tableau des indicateurs de durabilité", "Autre", "D", 9], ["Charte éditoriale du site institutionnel", "Autre", "A", 55], ["Contrat de l'agence de communication", "Contrats", "A", 150]],
    pilotage: { ilYA: 8, lieu: "Salle du conseil", invites: [["S. Fellay", "Agence de communication"]], points: [
      { titre: "État de la collecte", texte: "La collecte est close avec trois semaines de retard ; deux séries d'indicateurs restent incomplètes.", nature: "Information", clos: true },
      { titre: "Périmètre du premier rapport", texte: "Le premier rapport se limite aux indicateurs disponibles et annonce le plan de collecte des autres.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Indicateurs manquants", texte: "La DEN et la DDE fournissent leurs séries pour l'édition suivante.", nature: "Tâche", dans: 5 },
      { titre: "Maquettes du site", texte: "Validation attendue pour tenir la mise en ligne en même temps que la publication du rapport.", nature: "Tâche", dans: 12 },
    ] },
    notes: [["Responsable de projet", "L'agence propose une mise en ligne en deux temps si les maquettes ne sont pas validées à la date prévue.", "directeur", 3]],
  },
  {
    // DG — Direction Générale
    numero: "DG-2026-0002",
    risques: [
      ["Arbitrages entre directions non tranchés à temps", "Organisation", 3, 4, 0, "Les priorités d'investissement de trois directions dépassent ensemble l'enveloppe à dix ans.", "Séance d'arbitrage de la direction générale avant le chiffrage final.", "Réduire"],
      ["Hypothèses de prix de l'énergie trop incertaines", "Financier", 3, 3, 0, "Les scénarios de prix divergent fortement au-delà de cinq ans.", "Trois scénarios chiffrés ; feuille de route révisée tous les deux ans.", "Accepter"],
      ["Mobilisation insuffisante des cadres", "Organisation", 2, 3, 0, "La charge courante limite la participation aux ateliers.", "Ateliers d'une demi-journée, calendrier fixé avec les directeurs.", "Réduire"],
    ],
    jalons: [["Diagnostic partagé avec les directions", -145], ["Séminaire stratégique de la direction", -32], ["Feuille de route chiffrée", 19, 14], ["Présentation au conseil d'administration", 37]],
    taches: [["Diagnostic", -240, -145, 100], ["Ateliers par direction", -140, -40, 100], ["Chiffrage de la feuille de route", -30, 19, 60], ["Rédaction et validation", 5, 37, 10]],
    actions: [["Chiffrer les investissements de l'axe chaleur renouvelable", 10, "Haute", "En cours"], ["Préparer le dossier du conseil d'administration", 25, "Haute"]],
    documents: [["Diagnostic stratégique", "Rapports", "B", 145], ["Compte rendu du séminaire de la direction", "PV de séance", "A", 30], ["Feuille de route – version de travail", "Rapports", "0.6", 5]],
    pilotage: { ilYA: 20, lieu: "Salle de direction", points: [
      { titre: "Résultats du séminaire", texte: "Trois axes sont retenus : chaleur renouvelable, réseau électrique intelligent, services aux communes.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Chiffrage de l'axe chaleur renouvelable", texte: "La DSE et la finance chiffrent les investissements à dix ans.", nature: "Tâche", dans: 10, responsable: "per-fin" },
      { titre: "Arbitrage des priorités", texte: "Les demandes dépassent l'enveloppe ; l'arbitrage est renvoyé à la prochaine séance, sur la base du chiffrage.", nature: "Décision", statut: "Reportée" },
    ] },
  },
];

/** Conditions des contrats des deux projets de construction, pour que le document de contrat soit complet */
const CONDITIONS: Record<string, ConditionsContrat> = {
  "ctr-1": { typePrix: "Prix unitaires", debutTravaux: "2026-02-02", finTravaux: "2027-05-28", peineParJour: 2000, peinePlafondPct: 5, delaiPaiementJours: 30, surete: "Cautionnement solidaire", suretePct: 10, directionTravaux: "Ingénieurs Associés SA, L. Favre" },
  "ctr-2": { typePrix: "Prix unitaires", debutTravaux: "2026-02-02", finTravaux: "2026-10-30", peineParJour: 1000, peinePlafondPct: 5, delaiPaiementJours: 30, surete: "Cautionnement solidaire", suretePct: 10, directionTravaux: "Ingénieurs Associés SA, L. Favre" },
  "ctr-3": { typePrix: "Prix unitaires", debutTravaux: "2026-03-02", finTravaux: "2027-02-26", peineParJour: 1500, peinePlafondPct: 5, delaiPaiementJours: 30, surete: "Garantie bancaire", suretePct: 10, directionTravaux: "Ingénieurs Associés SA, L. Favre" },
  "ctr-4": { typePrix: "Prix global", debutTravaux: "2026-11-02", finTravaux: "2027-04-30", delaiPaiementJours: 30, surete: "Garantie bancaire", suretePct: 10, directionTravaux: "Ingénieurs Associés SA, L. Favre" },
  "ctr-5": { typePrix: "Honoraires au temps", debutTravaux: "2025-03-01", finTravaux: "2027-09-30", delaiPaiementJours: 30, reglement: "SIA 103 (ingénieurs civils)", phases: "31 à 53" },
  "ctr-6": { typePrix: "Honoraires au temps", debutTravaux: "2025-11-01", finTravaux: "2028-06-30", delaiPaiementJours: 30, reglement: "SIA 103 (ingénieurs civils)", phases: "31 à 53" },
};
const AVENANTS: Record<string, { motif: string; incidenceDelaiJours?: number }> = {
  "av-1": { motif: "Imprévu : sol de mauvaise qualité découvert à l'ouverture de la fouille de l'étape 2.", incidenceDelaiJours: 5 },
  "av-2": { motif: "Demande de la commune : giratoire déplacé de douze mètres vers le nord.", incidenceDelaiJours: 15 },
  "av-3": { motif: "Demande du service des eaux : deux chambres de visite supplémentaires." },
};

export function installerSimulation(depot: Depot, jour: string): void {
  const projets = depot.tous("projets");
  const parNumero = (numero: string) => projets.find((p) => (p.numeroSource ?? p.code) === numero);
  if (depot.tous("risques").some((r) => r.id.startsWith("rsk-sim-"))) return;
  const date = (dans: number) => ajouterJours(jour, dans);
  const seances: Seance[] = [];

  depot.grouper("Simulation : exemples par direction", () => {
    for (const f of FICHES) {
      const p = parNumero(f.numero);
      if (!p) continue;
      const cle = p.id.replace(/^prj-/, "");
      const chef = p.directeurId;

      f.risques.forEach(([titre, categorie, probabilite, impact, impactFinancier, description, mesures, strategie], i) => {
        const risque: Risque = {
          id: `rsk-sim-${cle}-${i + 1}`, projetId: p.id, code: `R-${String(i + 1).padStart(2, "0")}`, titre, description, categorie, probabilite, impact, impactFinancier, proprietaireId: chef,
          statut: i === 0 ? "En traitement" : "Ouvert", mesures, dateIdentification: date(-150 + i * 30), echeance: date(30 + i * 20), nature: "Risque", strategie,
          probabiliteResiduelle: Math.max(1, probabilite - 1), impactResiduel: impact,
          revues: [{ date: date(-10 - i * 6), auteurId: chef, probabilite, impact, commentaire: "Revue mensuelle : évaluation confirmée, mesures en cours." }],
        };
        depot.ajouter("risques", risque);
      });

      f.taches.forEach(([nom, debut, fin, avancement], i) => {
        const tache: Tache = { id: `tch-sim-${cle}-${i + 1}`, projetId: p.id, nom, debut: date(debut), fin: date(fin), avancement, jalon: false, dependances: i > 0 ? [`tch-sim-${cle}-${i}`] : [], responsableId: chef };
        depot.ajouter("taches", tache);
      });
      f.jalons.forEach(([nom, dans, glissement = 0], i) => {
        const fait = dans < 0;
        const jalon: Tache = { id: `jal-sim-${cle}-${i + 1}`, projetId: p.id, nom, debut: date(dans), fin: date(dans), finPrevue: date(dans - glissement), finReelle: fait ? date(dans) : undefined, avancement: fait ? 100 : 0, jalon: true, dependances: [], responsableId: chef };
        depot.ajouter("taches", jalon);
      });

      f.actions.forEach(([titre, dans, priorite, statut = "À faire"], i) => {
        depot.ajouter("actions", { id: `act-sim-${cle}-${i + 1}`, projetId: p.id, titre, statut, priorite, echeance: date(dans), assigneId: chef, creeParId: chef, dateCreation: date(-20 - i * 5), origine: "Suivi du projet" });
      });

      f.documents.forEach(([nom, categorie, version, ilYA], i) => {
        const doc: DocumentProjet = { id: `doc-sim-${cle}-${i + 1}`, projetId: p.id, nom, categorie, version, date: date(-ilYA), source: "Lien", auteur: depot.parId("personnes", chef ?? "")?.nom };
        depot.ajouter("documents", doc);
      });

      (f.notes ?? []).forEach(([canal, texte, auteur, ilYA], i) => {
        const note: NoteProjet = { id: `note-sim-${cle}-${i + 1}`, projetId: p.id, canal, texte, auteurId: auteur === "directeur" ? chef : auteur, date: `${date(-ilYA)}T09:30:00.000Z` };
        depot.ajouter("notes", note);
      });

      if (f.pilotage) seances.push(seancePilotage(depot, p, f.pilotage, jour));
    }

    // Contrats de construction : conditions et motifs des avenants
    for (const c of depot.tous("contrats")) {
      const conditions = CONDITIONS[c.id];
      const avenants = c.avenants.map((a) => (AVENANTS[a.id] ? { ...a, ...AVENANTS[a.id] } : a));
      if (conditions || avenants.some((a, i) => a !== c.avenants[i])) depot.modifier("contrats", c.id, { ...(conditions ? { conditions } : {}), avenants });
    }
  }, { origine: "systeme", sansDetail: true });

  // Le comité de pilotage du projet de route : la décision sur l'avenant du giratoire
  const route = projets.find((p) => p.id === "prj-1");
  if (route) {
    seances.push(seancePilotage(depot, route, { ilYA: 16, lieu: "Maison de commune", invites: [["J.-M. Udry", "Commune – travaux publics"], ["H. Blanc", "Ingénieurs Associés SA"]], points: [
      { titre: "Situation financière", texte: "L'atterrissage dépasse le budget approuvé ; l'écart tient aux avenants AV-01 (approuvé) et AV-02 (demandé).", nature: "Information", clos: true },
      { titre: "Avenant AV-02 – déplacement du giratoire", texte: "Le comité approuve l'avenant de 142'000 CHF, la commune prenant à sa charge la moitié du surcoût.", nature: "Décision", montant: 142_000, statut: "Approuvée", condition: "Convention de participation signée par la commune" },
      { titre: "Réserve bloquante R-004, regard R12", texte: "La reprise du radier doit être validée par l'ingénieur avant toute nouvelle vérification.", nature: "Tâche", dans: 6, responsable: "per-2" },
      { titre: "Information des commerçants", texte: "Lettre d'information avant la fermeture du carrefour nord.", nature: "Tâche", dans: 14 },
    ] }, jour));
  }

  // Les séances passent par la même fonction que l'écran : décisions et tâches sont portées au registre
  const acteur = depot.acteurId;
  depot.acteurId = undefined;
  try { for (const s of seances) enregistrerSeance(depot, s); } finally { depot.acteurId = acteur; }
}

function seancePilotage(depot: Depot, p: Projet, x: NonNullable<Fiche["pilotage"]>, jour: string): Seance {
  const id = `sea-pil-${p.id.replace(/^prj-/, "")}`;
  const base = nouvelleSeance(depot.tous("seances"), { id, type: "Comité de pilotage", projetId: p.id, date: ajouterJours(jour, -x.ilYA), redacteurId: p.directeurId });
  const internes = [...new Set([p.sponsorId, p.directeurId, "per-fin", "per-pmo"].filter((v): v is string => !!v && !!depot.parId("personnes", v)))];
  return {
    ...base, lieu: x.lieu, statut: "Diffusée", prochaineSeance: ajouterJours(jour, 28 - (x.ilYA % 14)),
    participants: [
      ...internes.map((personneId, i) => ({ personneId, presence: i === internes.length - 1 && internes.length > 3 ? "Excusé" as const : "Présent" as const, diffusion: true })),
      ...(x.invites ?? []).map(([nom, organisation]) => ({ nom, organisation, presence: "Présent" as const, diffusion: true })),
    ],
    points: x.points.map((pt, i): PointSeance => ({
      id: `pt-${id}-${i + 1}`, numero: `${base.numero}.${i + 1}`, titre: pt.titre, texte: pt.texte, nature: pt.nature ?? "Information", statut: pt.clos ? "Clos" : "Ouvert", origineSeanceId: id,
      responsableId: pt.nature === "Tâche" ? pt.responsable ?? p.directeurId : pt.responsable, echeance: pt.dans !== undefined ? ajouterJours(jour, pt.dans) : undefined,
      decision: pt.nature === "Décision" ? { statut: pt.statut ?? "Approuvée", montant: pt.montant, conditions: pt.condition ? [{ id: `cond-${id}-${i + 1}`, texte: pt.condition, responsableId: p.directeurId, echeance: ajouterJours(jour, 30), statut: "À traiter" }] : [] } : undefined,
    })),
  };
}
