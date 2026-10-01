// Jeu de données de démonstration (entièrement fictif) pour découvrir la plateforme.
import type {
  Action, Affectation, Ajustement, AppelOffres, BudgetLigne, CircuitValidation, Cloture, Contrat, DocumentProjet, Entreprise,
  Facture, FactureHorsCommande, Lot, Mutation, NoeudOrganigramme, OffreAttendue, Personne, Projet, Risque, Servitude, Tache,
  Autorisation,
} from "../types";
import { genererDepuisProjet } from "../lib/organigramme";
import { calculerBudget, photographier } from "../lib/budget";

export interface DonneesDemo {
  projets: Projet[];
  lots: Lot[];
  budget: BudgetLigne[];
  entreprises: Entreprise[];
  appelsOffres: AppelOffres[];
  contrats: Contrat[];
  factures: Facture[];
  taches: Tache[];
  documents: DocumentProjet[];
  personnes: Personne[];
  affectations: Affectation[];
  organigramme: NoeudOrganigramme[];
  validations: CircuitValidation[];
  risques: Risque[];
  actions: Action[];
  autorisations: Autorisation[];
  servitudes: Servitude[];
  mutations: Mutation[];
  offres: OffreAttendue[];
  ajustements: Ajustement[];
  facturesHorsCommande: FactureHorsCommande[];
  clotures: Cloture[];
}

export function donneesDemo(): DonneesDemo {
  const personnes: Personne[] = [
    { id: "per-1", nom: "Claire Rochat", role: "Directeur de projet", email: "c.rochat@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100, acces: { profil: "Administrateur", projets: "tous", modules: {} } },
    { id: "per-2", nom: "Marc Délèze", role: "Responsable de lot", email: "m.deleze@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100 },
    { id: "per-3", nom: "Sofia Bianchi", role: "Responsable de lot", email: "s.bianchi@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 80 },
    { id: "per-4", nom: "Luca Favre", role: "Conducteur de travaux", email: "l.favre@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100 },
    { id: "per-5", nom: "Nadia Perret", role: "Ingénieur", email: "n.perret@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 60, acces: { profil: "Collaborateur", projets: ["prj-2"], modules: {} } },
    { id: "per-6", nom: "Jean Monnier", role: "Maître d'ouvrage", email: "j.monnier@commune-exemple.ch", organisation: "Commune d'Exemple", capacite: 20, acces: { profil: "Lecture seule", projets: ["prj-1"], modules: { validations: "ecriture" } } },
  ];

  const projets: Projet[] = [
    {
      id: "prj-1", code: "RC601", nom: "Réaménagement RC 601 – traversée du village",
      maitreOuvrage: "Commune d'Exemple / Canton", lieu: "Exemple-les-Bains", phase: "52 Exécution de l'ouvrage",
      dateDebut: "2026-02-02", dateFin: "2027-06-30", tauxTVA: 8.1, couleur: "#4f46e5",
      description: "Réfection complète de la chaussée sur 1,2 km, création de trottoirs, giratoire, renouvellement des collecteurs EU/EC et de la conduite d'eau potable.",
      directeurId: "per-1", dossierSharePoint: "RC601",
    },
    {
      id: "prj-2", code: "STEP", nom: "Collecteur intercommunal vers STEP",
      maitreOuvrage: "Association intercommunale d'épuration", lieu: "Vallée d'Exemple", phase: "41 Appels d'offres",
      dateDebut: "2026-09-01", dateFin: "2028-03-31", tauxTVA: 8.1, couleur: "#0891b2",
      description: "Pose d'un collecteur DN 600 sur 3,4 km, dont 400 m en fonçage sous voies CFF.",
      directeurId: "per-1", dossierSharePoint: "STEP",
    },
  ];

  const lots: Lot[] = [
    { id: "lot-1", projetId: "prj-1", code: "L1", nom: "Génie civil & chaussée", cfc: ["11", "13", "20", "21", "461"], responsableId: "per-2", phase: "52 Exécution de l'ouvrage",
      datesPhases: { "32 Projet de l'ouvrage": { debut: "2024-09-01", fin: "2025-03-31" }, "41 Appels d'offres": { debut: "2025-09-15", fin: "2025-12-19" }, "51 Projet d'exécution": { debut: "2025-11-01", fin: "2026-03-31" }, "52 Exécution de l'ouvrage": { debut: "2026-02-02", fin: "2027-06-04" } } },
    { id: "lot-2", projetId: "prj-1", code: "L2", nom: "Réseaux souterrains", cfc: ["15", "45", "463"], responsableId: "per-3", phase: "52 Exécution de l'ouvrage",
      datesPhases: { "41 Appels d'offres": { debut: "2025-10-01", fin: "2026-01-15" }, "51 Projet d'exécution": { debut: "2025-12-01", fin: "2026-03-15" }, "52 Exécution de l'ouvrage": { debut: "2026-02-16", fin: "2026-12-18" } } },
    { id: "lot-3", projetId: "prj-1", code: "L3", nom: "Aménagements & équipements", cfc: ["42", "44", "23"], responsableId: "per-3", phase: "41 Appels d'offres",
      datesPhases: { "41 Appels d'offres": { debut: "2026-08-24", fin: "2026-10-30" }, "51 Projet d'exécution": { debut: "2026-11-01", fin: "2027-01-31" }, "52 Exécution de l'ouvrage": { debut: "2027-02-15", fin: "2027-06-18" } } },
    { id: "lot-4", projetId: "prj-1", code: "L0", nom: "Honoraires & frais", cfc: ["29", "49", "5"], responsableId: "per-1", phase: "52 Exécution de l'ouvrage" },
    { id: "lot-5", projetId: "prj-2", code: "L1", nom: "Collecteur en tranchée", cfc: ["13", "45"], responsableId: "per-2", phase: "41 Appels d'offres" },
    { id: "lot-6", projetId: "prj-2", code: "L2", nom: "Fonçage sous voies", cfc: ["17"], responsableId: "per-3", phase: "33 Procédure de demande d'autorisation" },
  ];

  const budget: BudgetLigne[] = [
    ["prj-1", "113", "Démontage bordures et équipements", 180_000],
    ["prj-1", "13", "Installations de chantier", 320_000],
    ["prj-1", "151", "Déviation provisoire des réseaux", 95_000],
    ["prj-1", "201", "Terrassements et fouilles", 540_000],
    ["prj-1", "211", "Ouvrages en béton (murs, giratoire)", 780_000],
    ["prj-1", "461", "Chaussée, trottoirs, bordures", 2_150_000],
    ["prj-1", "463", "Collecteurs EU/EC", 1_240_000],
    ["prj-1", "45", "Conduite d'eau potable", 610_000],
    ["prj-1", "23", "Éclairage public", 285_000],
    ["prj-1", "42", "Plantations et espaces verts", 140_000],
    ["prj-1", "44", "Signalisation et marquage", 120_000],
    ["prj-1", "292", "Honoraires ingénieur civil", 690_000],
    ["prj-1", "51", "Autorisations et taxes", 45_000],
    ["prj-1", "583", "Réserve pour imprévus (8 %)", 520_000],
    ["prj-2", "13", "Installations de chantier", 410_000],
    ["prj-2", "17", "Fonçage sous voies CFF", 1_850_000],
    ["prj-2", "45", "Collecteur DN 600 en tranchée", 4_300_000],
    ["prj-2", "49", "Honoraires", 780_000],
    ["prj-2", "583", "Réserve pour imprévus", 600_000],
  ].map(([projetId, cfc, libelle, montant], i) => ({
    id: `bud-${i + 1}`, projetId: projetId as string, cfc: cfc as string, libelle: libelle as string, montant: montant as number,
    ...(cfc === "583" ? { reserve: true } : {}),
  }));

  const entreprises: Entreprise[] = [
    { id: "ent-1", nom: "Routes & Génie SA", localite: "Sion", contact: "P. Vouilloz", email: "offres@routes-genie.example", telephone: "027 000 00 01", ide: "CHE-100.000.001", specialites: ["461", "201", "211"] },
    { id: "ent-2", nom: "Constructions du Rhône SA", localite: "Martigny", contact: "A. Carron", email: "info@constr-rhone.example", telephone: "027 000 00 02", ide: "CHE-100.000.002", specialites: ["461", "211", "463"] },
    { id: "ent-3", nom: "Terrassements Alpins Sàrl", localite: "Monthey", contact: "D. Rey", email: "contact@terr-alpins.example", telephone: "024 000 00 03", specialites: ["201", "463"] },
    { id: "ent-4", nom: "Hydro-Réseaux SA", localite: "Lausanne", contact: "E. Morel", email: "devis@hydro-reseaux.example", telephone: "021 000 00 04", specialites: ["45", "463", "17"] },
    { id: "ent-5", nom: "Électricité Publique Sàrl", localite: "Vevey", contact: "F. Chappuis", email: "info@elec-publique.example", telephone: "021 000 00 05", specialites: ["23"] },
    { id: "ent-6", nom: "Paysages & Jardins SA", localite: "Aigle", contact: "G. Pittet", email: "info@paysages.example", telephone: "024 000 00 06", specialites: ["42"] },
    { id: "ent-7", nom: "Ingénieurs Associés SA", localite: "Lausanne", contact: "H. Blanc", email: "info@ing-associes.example", telephone: "021 000 00 07", specialites: ["292", "49"] },
    { id: "ent-8", nom: "Microtunnel Suisse SA", localite: "Fribourg", contact: "I. Waeber", email: "offres@microtunnel.example", telephone: "026 000 00 08", specialites: ["17"] },
  ];

  const critStd = () => [
    { id: "cr-prix", nom: "Prix", poids: 50, estPrix: true },
    { id: "cr-ref", nom: "Références", poids: 20 },
    { id: "cr-org", nom: "Organisation de chantier", poids: 20 },
    { id: "cr-dd", nom: "Développement durable", poids: 10 },
  ];

  const appelsOffres: AppelOffres[] = [
    {
      id: "ao-1", projetId: "prj-1", numero: "AO-RC601-01", objet: "Travaux de génie civil et chaussée", cfc: "461", lotId: "lot-1",
      procedure: "Ouverte", statut: "Adjugé", dateEnvoi: "2025-10-06", dateRetour: "2025-11-14", montantEstime: 2_150_000,
      criteres: critStd(), entreprisesInvitees: ["ent-1", "ent-2"], adjudicataireId: "ent-1",
      positions: [
        { id: "p1", chapitre: "113", numero: "113.111.101", libelle: "Installation de chantier, forfait", unite: "gl", quantite: 1 },
        { id: "p2", chapitre: "221", numero: "221.311.101", libelle: "Grave 0/45, épaisseur 40 cm", unite: "m3", quantite: 6800 },
        { id: "p3", chapitre: "223", numero: "223.211.101", libelle: "Enrobé AC T 22 N, ép. 7 cm", unite: "t", quantite: 6300 },
        { id: "p4", chapitre: "223", numero: "223.311.101", libelle: "Enrobé AC 11 N couche de roulement, ép. 4 cm", unite: "t", quantite: 2600 },
        { id: "p5", chapitre: "222", numero: "222.121.101", libelle: "Bordures granit type RN", unite: "m", quantite: 2300 },
      ],
      soumissions: [
        { id: "s1", entrepriseId: "ent-1", dateReception: "2025-11-13", rabaisPct: 3, escomptePct: 2, notes: { "cr-ref": 4.5, "cr-org": 4, "cr-dd": 3.5 },
          prixUnitaires: { p1: 145_000, p2: 68, p3: 142, p4: 165, p5: 92 } },
        { id: "s2", entrepriseId: "ent-2", dateReception: "2025-11-14", rabaisPct: 2, escomptePct: 2, notes: { "cr-ref": 4, "cr-org": 4.5, "cr-dd": 4 },
          prixUnitaires: { p1: 160_000, p2: 71, p3: 139, p4: 171, p5: 88 } },
      ],
    },
    {
      id: "ao-2", projetId: "prj-1", numero: "AO-RC601-04", objet: "Éclairage public LED", cfc: "23", lotId: "lot-3",
      procedure: "Sur invitation", statut: "Évaluation", dateEnvoi: "2026-08-24", dateRetour: "2026-09-25", montantEstime: 285_000,
      criteres: critStd(), entreprisesInvitees: ["ent-5"],
      positions: [
        { id: "q1", chapitre: "151", numero: "151.411.101", libelle: "Tube PE 120 pour câbles", unite: "m", quantite: 1250 },
        { id: "q2", chapitre: "151", numero: "151.611.101", libelle: "Massif de candélabre préfabriqué", unite: "pce", quantite: 42 },
        { id: "q3", chapitre: "111", numero: "111.100.001", libelle: "Candélabre LED 6 m, fourni-posé", unite: "pce", quantite: 42 },
      ],
      soumissions: [
        { id: "s3", entrepriseId: "ent-5", dateReception: "2026-09-24", rabaisPct: 0, escomptePct: 2, notes: { "cr-ref": 4, "cr-org": 3.5, "cr-dd": 4.5 },
          prixUnitaires: { q1: 38, q2: 950, q3: 5200 } },
      ],
    },
    {
      id: "ao-3", projetId: "prj-2", numero: "AO-STEP-02", objet: "Fonçage microtunnel sous voies CFF", cfc: "17", lotId: "lot-6",
      procedure: "Ouverte", statut: "Publié", dateEnvoi: "2026-09-15", dateRetour: "2026-10-30", montantEstime: 1_850_000,
      criteres: critStd(), entreprisesInvitees: ["ent-4", "ent-8"], positions: [], soumissions: [],
    },
  ];

  const contrats: Contrat[] = [
    {
      id: "ctr-1", projetId: "prj-1", numero: "C-RC601-01", entrepriseId: "ent-1", cfc: "461", lotId: "lot-1", appelOffresId: "ao-1",
      objet: "Génie civil et chaussée", type: "Contrat d'entreprise", montantInitial: 2_036_740, dateSignature: "2026-01-15",
      retenuePct: 10, statut: "En cours",
      avenants: [
        { id: "av-1", numero: "AV-01", date: "2026-04-20", objet: "Purge de sol de mauvaise qualité", montant: 86_500, statut: "Approuvé" },
        { id: "av-2", numero: "AV-02", date: "2026-08-12", objet: "Déplacement giratoire (demande commune)", montant: 142_000, statut: "Demandé" },
      ],
    },
    {
      id: "ctr-2", projetId: "prj-1", numero: "C-RC601-02", entrepriseId: "ent-3", cfc: "201", lotId: "lot-1",
      objet: "Terrassements et fouilles", type: "Contrat d'entreprise", montantInitial: 512_000, dateSignature: "2026-01-20",
      retenuePct: 10, statut: "En cours", avenants: [],
    },
    {
      id: "ctr-3", projetId: "prj-1", numero: "C-RC601-03", entrepriseId: "ent-4", cfc: "463", lotId: "lot-2",
      objet: "Collecteurs EU/EC", type: "Contrat d'entreprise", montantInitial: 1_318_000, dateSignature: "2026-02-10",
      retenuePct: 10, statut: "En cours",
      avenants: [{ id: "av-3", numero: "AV-01", date: "2026-06-03", objet: "Chambres supplémentaires", montant: 48_000, statut: "Approuvé" }],
    },
    {
      id: "ctr-4", projetId: "prj-1", numero: "C-RC601-04", entrepriseId: "ent-4", cfc: "45", lotId: "lot-2",
      objet: "Conduite d'eau potable PE 225", type: "Contrat d'entreprise", montantInitial: 587_000, dateSignature: "2026-02-10",
      retenuePct: 10, statut: "Signé", avenants: [],
    },
    {
      id: "ctr-5", projetId: "prj-1", numero: "M-RC601-01", entrepriseId: "ent-7", cfc: "292", lotId: "lot-4",
      objet: "Mandat d'ingénieur civil (SIA 103)", type: "Mandat", montantInitial: 690_000, dateSignature: "2025-03-01",
      retenuePct: 0, statut: "En cours", avenants: [],
    },
    {
      id: "ctr-6", projetId: "prj-2", numero: "M-STEP-01", entrepriseId: "ent-7", cfc: "49", lotId: "lot-5",
      objet: "Mandat d'ingénieur (phases 31–53)", type: "Mandat", montantInitial: 760_000, dateSignature: "2025-11-01",
      retenuePct: 0, statut: "En cours", avenants: [],
    },
  ];

  const plus30 = (iso: string) => { const d = new Date(iso); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
  const f = (id: number, contratId: string, projetId: string, numero: string, type: Facture["type"], date: string, montantHT: number, statut: Facture["statut"]): Facture => ({
    id: `fac-${id}`, contratId, projetId, numero, type, date, echeance: plus30(date), montantHT, statut,
  });
  const factures: Facture[] = [
    f(1, "ctr-1", "prj-1", "S1", "Situation", "2026-03-31", 210_000, "Payée"),
    f(2, "ctr-1", "prj-1", "S2", "Situation", "2026-04-30", 285_000, "Payée"),
    f(3, "ctr-1", "prj-1", "S3", "Situation", "2026-05-31", 320_000, "Payée"),
    f(4, "ctr-1", "prj-1", "S4", "Situation", "2026-06-30", 298_000, "Payée"),
    f(5, "ctr-1", "prj-1", "S5", "Situation", "2026-07-31", 190_000, "Approuvée"),
    f(6, "ctr-1", "prj-1", "S6", "Situation", "2026-08-31", 240_000, "Reçue"),
    f(7, "ctr-2", "prj-1", "S1", "Situation", "2026-03-31", 180_000, "Payée"),
    f(8, "ctr-2", "prj-1", "S2", "Situation", "2026-05-31", 225_000, "Payée"),
    f(9, "ctr-2", "prj-1", "R1", "Régie", "2026-07-31", 38_500, "Contrôlée"),
    f(10, "ctr-3", "prj-1", "S1", "Situation", "2026-04-30", 260_000, "Payée"),
    f(11, "ctr-3", "prj-1", "S2", "Situation", "2026-06-30", 410_000, "Payée"),
    f(12, "ctr-3", "prj-1", "S3", "Situation", "2026-08-31", 305_000, "Approuvée"),
    f(13, "ctr-5", "prj-1", "H1", "Acompte", "2026-03-31", 120_000, "Payée"),
    f(14, "ctr-5", "prj-1", "H2", "Acompte", "2026-06-30", 145_000, "Payée"),
    f(15, "ctr-6", "prj-2", "H1", "Acompte", "2026-06-30", 95_000, "Payée"),
  ];

  const t = (id: number, projetId: string, nom: string, debut: string, fin: string, avancement: number, lotId?: string, dependances: string[] = [], jalon = false, responsableId?: string): Tache => ({
    id: `t-${id}`, projetId, nom, debut, fin, avancement, lotId, dependances, jalon, responsableId,
  });
  const taches: Tache[] = [
    t(1, "prj-1", "Adjudication des travaux principaux", "2026-01-15", "2026-01-15", 100, "lot-1", [], true, "per-1"),
    t(2, "prj-1", "Installation de chantier", "2026-02-02", "2026-02-20", 100, "lot-1", ["t-1"], false, "per-4"),
    t(3, "prj-1", "Déviation des réseaux existants", "2026-02-16", "2026-03-27", 100, "lot-2", ["t-2"], false, "per-3"),
    t(4, "prj-1", "Terrassements étape 1", "2026-03-02", "2026-05-29", 100, "lot-1", ["t-2"], false, "per-2"),
    t(5, "prj-1", "Collecteurs EU/EC étape 1", "2026-03-30", "2026-07-10", 95, "lot-2", ["t-3"], false, "per-3"),
    t(6, "prj-1", "Conduite eau potable", "2026-06-01", "2026-09-25", 55, "lot-2", ["t-4"], false, "per-3"),
    t(7, "prj-1", "Giratoire – ouvrages béton", "2026-07-06", "2026-10-30", 35, "lot-1", ["t-4"], false, "per-2"),
    t(8, "prj-1", "Chaussée – couche de support", "2026-08-17", "2026-11-13", 20, "lot-1", ["t-5"], false, "per-2"),
    t(9, "prj-1", "Pause hivernale", "2026-12-18", "2027-01-08", 0, undefined, [], false),
    t(10, "prj-1", "Terrassements étape 2", "2027-01-11", "2027-03-19", 0, "lot-1", ["t-9"], false, "per-2"),
    t(11, "prj-1", "Éclairage public", "2027-02-15", "2027-04-30", 0, "lot-3", ["t-10"], false, "per-3"),
    t(12, "prj-1", "Couche de roulement", "2027-05-03", "2027-06-04", 0, "lot-1", ["t-10"], false, "per-2"),
    t(13, "prj-1", "Plantations et signalisation", "2027-05-17", "2027-06-18", 0, "lot-3", ["t-12"], false, "per-3"),
    t(14, "prj-1", "Réception de l'ouvrage", "2027-06-30", "2027-06-30", 0, undefined, ["t-13"], true, "per-1"),
    t(15, "prj-2", "Mise à l'enquête publique", "2026-06-01", "2026-07-15", 100, undefined, [], false, "per-1"),
    t(16, "prj-2", "Appels d'offres", "2026-09-01", "2026-11-30", 30, "lot-5", ["t-15"], false, "per-2"),
    t(17, "prj-2", "Adjudication", "2026-12-15", "2026-12-15", 0, undefined, ["t-16"], true, "per-1"),
    t(18, "prj-2", "Fonçage sous voies", "2027-03-01", "2027-07-30", 0, "lot-6", ["t-17"], false, "per-3"),
    t(19, "prj-2", "Collecteur tranchée – tronçon 1", "2027-03-15", "2027-10-29", 0, "lot-5", ["t-17"], false, "per-2"),
  ];

  const documents: DocumentProjet[] = [
    { id: "doc-1", projetId: "prj-1", nom: "Plan de situation 1:500", categorie: "Plans", version: "C", date: "2026-01-10", source: "Lien", auteur: "Nadia Perret", cfc: "461" },
    { id: "doc-2", projetId: "prj-1", nom: "Contrat C-RC601-01 signé.pdf", categorie: "Contrats", version: "1", date: "2026-01-15", source: "Lien", auteur: "Claire Rochat", cfc: "461" },
    { id: "doc-3", projetId: "prj-1", nom: "PV séance de chantier n°28", categorie: "PV de séance", version: "1", date: "2026-09-22", source: "Lien", auteur: "Luca Favre" },
    { id: "doc-4", projetId: "prj-1", nom: "Rapport géotechnique complémentaire", categorie: "Rapports", version: "1", date: "2026-04-08", source: "Lien", auteur: "Bureau géotechnique" },
    { id: "doc-5", projetId: "prj-2", nom: "Autorisation de construire", categorie: "Autorisations", version: "1", date: "2026-08-02", source: "Lien", auteur: "Canton" },
  ];

  const affectations: Affectation[] = [
    { id: "aff-1", personneId: "per-1", projetId: "prj-1", pourcentage: 50, debut: "2026-01-01", fin: "2027-06-30" },
    { id: "aff-2", personneId: "per-1", projetId: "prj-2", pourcentage: 40, debut: "2026-01-01", fin: "2028-03-31" },
    { id: "aff-3", personneId: "per-2", projetId: "prj-1", pourcentage: 60, debut: "2026-01-01", fin: "2027-06-30" },
    { id: "aff-4", personneId: "per-2", projetId: "prj-2", pourcentage: 50, debut: "2026-09-01", fin: "2028-03-31" },
    { id: "aff-5", personneId: "per-3", projetId: "prj-1", pourcentage: 50, debut: "2026-01-01", fin: "2027-06-30" },
    { id: "aff-6", personneId: "per-3", projetId: "prj-2", pourcentage: 30, debut: "2026-09-01", fin: "2028-03-31" },
    { id: "aff-7", personneId: "per-4", projetId: "prj-1", pourcentage: 100, debut: "2026-02-01", fin: "2027-06-30" },
    { id: "aff-8", personneId: "per-5", projetId: "prj-2", pourcentage: 60, debut: "2026-03-01", fin: "2027-12-31" },
  ];

  const organigramme = [
    ...genererDepuisProjet(projets[0], lots.filter((l) => l.projetId === "prj-1"), personnes, contrats.filter((c) => c.projetId === "prj-1"), entreprises),
  ];

  const validations: CircuitValidation[] = [
    {
      id: "val-1", projetId: "prj-1", titre: "Plans d'exécution giratoire – indice C", objet: { type: "Document", id: "doc-1" },
      version: 1, demandeurId: "per-2", statut: "En cours", dateCreation: "2026-09-18", echeance: "2026-10-02",
      etapes: [
        { id: "e1", personneId: "per-5", statut: "Approuvé", date: "2026-09-21", commentaire: "Conforme au calcul statique." },
        { id: "e2", personneId: "per-1", statut: "En attente" },
        { id: "e3", personneId: "per-6", statut: "En attente" },
      ],
      historique: [
        { date: "2026-09-18", personneId: "per-2", action: "Circuit créé", version: 1 },
        { date: "2026-09-21", personneId: "per-5", action: "Approuvé", version: 1, commentaire: "Conforme au calcul statique." },
      ],
    },
    {
      id: "val-2", projetId: "prj-1", titre: "Situation S6 – Routes & Génie SA", objet: { type: "Facture", id: "fac-6", contratId: "ctr-1" },
      version: 1, demandeurId: "per-4", statut: "En cours", dateCreation: "2026-09-03", echeance: "2026-09-30",
      etapes: [
        { id: "e1", personneId: "per-4", statut: "Approuvé", date: "2026-09-08", commentaire: "Métrés contrôlés sur place." },
        { id: "e2", personneId: "per-2", statut: "En attente" },
        { id: "e3", personneId: "per-1", statut: "En attente" },
      ],
      historique: [
        { date: "2026-09-03", personneId: "per-4", action: "Circuit créé", version: 1 },
        { date: "2026-09-08", personneId: "per-4", action: "Approuvé", version: 1, commentaire: "Métrés contrôlés sur place." },
      ],
    },
    {
      id: "val-3", projetId: "prj-1", titre: "Avenant AV-02 – déplacement du giratoire", objet: { type: "Avenant", id: "av-2", contratId: "ctr-1" },
      version: 1, demandeurId: "per-2", statut: "En cours", dateCreation: "2026-08-14", echeance: "2026-09-15",
      etapes: [
        { id: "e1", personneId: "per-1", statut: "En attente" },
        { id: "e2", personneId: "per-6", statut: "En attente" },
      ],
      historique: [{ date: "2026-08-14", personneId: "per-2", action: "Circuit créé", version: 1 }],
    },
    {
      id: "val-4", projetId: "prj-1", titre: "PV séance de chantier n°28", objet: { type: "Document", id: "doc-3" },
      version: 2, demandeurId: "per-4", statut: "Approuvé", dateCreation: "2026-09-22",
      etapes: [{ id: "e1", personneId: "per-1", statut: "Approuvé", date: "2026-09-24" }],
      historique: [
        { date: "2026-09-22", personneId: "per-4", action: "Circuit créé", version: 1 },
        { date: "2026-09-23", personneId: "per-1", action: "Modifications demandées", version: 1, commentaire: "Compléter le point 4 (sécurité)." },
        { date: "2026-09-23", personneId: "per-4", action: "Version 2 soumise", version: 2 },
        { date: "2026-09-24", personneId: "per-1", action: "Approuvé", version: 2 },
      ],
    },
  ];

  const r = (n: number, projetId: string, titre: string, categorie: Risque["categorie"], probabilite: number, impact: number, impactFinancier: number,
    proprietaireId: string, statut: Risque["statut"], mesures: string, description = "", lotId?: string, echeance?: string): Risque => ({
    id: `rsk-${n}`, projetId, code: `R-${String(n).padStart(2, "0")}`, titre, description, categorie, probabilite, impact, impactFinancier,
    proprietaireId, statut, mesures, lotId, echeance, dateIdentification: "2026-02-15",
  });
  const risques: Risque[] = [
    r(1, "prj-1", "Conduites existantes non répertoriées", "Technique", 4, 4, 180_000, "per-3", "En traitement",
      "Sondages complémentaires avant chaque étape ; relevé géoradar du tronçon 2.", "Le cadastre des réseaux est incomplet sur le tronçon 2.", "lot-2", "2026-10-15"),
    r(2, "prj-1", "Retard de l'avenant AV-02 (giratoire)", "Délais", 3, 4, 90_000, "per-1", "Ouvert",
      "Obtenir la décision du maître d'ouvrage avant le 15.10 ; préparer une variante sans déplacement.", "", "lot-1", "2026-10-15"),
    r(3, "prj-1", "Hausse du prix des enrobés", "Financier", 3, 3, 120_000, "per-2", "Ouvert",
      "Vérifier la clause de renchérissement du contrat ; commander les quantités de l'étape 2 en avance.", "", "lot-1"),
    r(4, "prj-1", "Intempéries hivernales prolongées", "Délais", 3, 3, 60_000, "per-4", "Ouvert",
      "Planifier la couche de roulement au printemps ; prévoir des travaux de réseaux en hiver.", ""),
    r(5, "prj-1", "Opposition des riverains (accès commerces)", "Tiers", 2, 3, 20_000, "per-1", "En traitement",
      "Séance d'information publique ; signalétique pour les commerces.", ""),
    r(6, "prj-1", "Sol de mauvaise qualité sur l'étape 2", "Technique", 3, 5, 250_000, "per-2", "Ouvert",
      "Rapport géotechnique complémentaire ; réserve dédiée dans le CFC 583.", "", "lot-1", "2026-12-01"),
    r(7, "prj-1", "Accident lors des travaux en fouille", "Sécurité", 2, 5, 0, "per-4", "En traitement",
      "Contrôles hebdomadaires des blindages ; plan de sécurité SUVA à jour.", ""),
    r(8, "prj-1", "Purge de sol étape 1", "Technique", 5, 3, 86_500, "per-2", "Survenu", "Traité par l'avenant AV-01.", "", "lot-1"),
    r(9, "prj-2", "Autorisation CFF pour le fonçage", "Juridique", 3, 5, 300_000, "per-3", "Ouvert",
      "Dépôt anticipé du dossier ; séance de coordination avec CFF Infrastructure.", "", "lot-6", "2026-11-30"),
    r(10, "prj-2", "Nappe phréatique haute", "Environnement", 4, 3, 150_000, "per-2", "Ouvert",
      "Prévoir un épuisement des eaux dans le descriptif ; piézomètres.", "", "lot-5"),
  ];

  const a = (n: number, projetId: string, titre: string, assigneId: string, statut: Action["statut"], priorite: Action["priorite"], echeance: string, origine?: string, risqueId?: string): Action => ({
    id: `act-${n}`, projetId, titre, assigneId, creeParId: "per-1", statut, priorite, echeance, origine, risqueId, dateCreation: "2026-09-01",
  });
  const actions: Action[] = [
    a(1, "prj-1", "Commander les sondages complémentaires tronçon 2", "per-3", "En cours", "Haute", "2026-10-03", "Risque R-01", "rsk-1"),
    a(2, "prj-1", "Préparer la note de décision AV-02 pour la commune", "per-1", "À faire", "Urgente", "2026-10-01", "Risque R-02", "rsk-2"),
    a(3, "prj-1", "Contrôler la situation S6 de Routes & Génie", "per-2", "À faire", "Haute", "2026-09-30", "Validation"),
    a(4, "prj-1", "Mettre à jour le plan de signalisation de chantier", "per-4", "En cours", "Normale", "2026-10-10", "PV séance n°28"),
    a(5, "prj-1", "Relancer l'offre éclairage public (pièces manquantes)", "per-3", "En attente", "Normale", "2026-10-05", "PV séance n°28"),
    a(6, "prj-1", "Vérifier la clause de renchérissement des enrobés", "per-2", "À faire", "Normale", "2026-10-20", "Risque R-03", "rsk-3"),
    a(7, "prj-1", "Organiser la séance d'information riverains", "per-1", "Terminé", "Normale", "2026-09-15", "Risque R-05", "rsk-5"),
    a(8, "prj-1", "Rédiger le PV de la séance n°29", "per-4", "À faire", "Normale", "2026-10-07", "PV séance n°28"),
    a(9, "prj-2", "Déposer le dossier d'autorisation CFF", "per-3", "En cours", "Urgente", "2026-10-15", "Risque R-09", "rsk-9"),
    a(10, "prj-2", "Compléter le descriptif CAN du fonçage", "per-5", "En cours", "Haute", "2026-10-08"),
    a(11, "prj-2", "Implanter les piézomètres", "per-2", "À faire", "Normale", "2026-11-15", "Risque R-10", "rsk-10"),
  ];

  const autorisations: Autorisation[] = [
    {
      id: "aut-1", projetId: "prj-1", type: "Approbation des plans", objet: "Réaménagement de la RC 601 (routes et réseaux)", autorite: "Département cantonal des infrastructures",
      reference: "DI-2024-0815", statut: "Délivrée", dateDepot: "2025-03-10", dateEnquete: "2025-04-11", oppositions: 3, dateDecision: "2025-09-02", validite: "2028-09-02",
      conditions: [
        { id: "c1", service: "Office de l'environnement", texte: "Suivi environnemental de chantier (SER) par un spécialiste mandaté", echeance: "2026-02-02", responsableId: "per-1", statut: "Respectée" },
        { id: "c2", service: "Office de l'environnement", texte: "Analyse des matériaux d'excavation avant évacuation (OLED)", echeance: "2026-03-01", responsableId: "per-2", statut: "En cours" },
        { id: "c3", service: "Service de la mobilité", texte: "Plan de signalisation de chantier validé avant chaque étape", echeance: "2027-01-08", responsableId: "per-4", statut: "En cours" },
        { id: "c4", service: "Archéologie cantonale", texte: "Annoncer le début des terrassements 15 jours à l'avance", echeance: "2027-01-01", responsableId: "per-4", statut: "À traiter" },
        { id: "c5", service: "Commune", texte: "Maintien de l'accès aux commerces pendant toute la durée des travaux", responsableId: "per-1", statut: "En cours" },
      ],
    },
    {
      id: "aut-2", projetId: "prj-1", type: "Autorisation de police (circulation)", objet: "Circulation alternée et déviation poids lourds", autorite: "Police cantonale",
      reference: "PC-26-114", statut: "Délivrée", dateDepot: "2025-12-01", oppositions: 0, dateDecision: "2026-01-20", validite: "2026-12-31", lotId: "lot-1",
      conditions: [{ id: "c6", service: "Police cantonale", texte: "Renouvellement de l'autorisation pour 2027", echeance: "2026-11-15", responsableId: "per-4", statut: "À traiter" }],
    },
    {
      id: "aut-3", projetId: "prj-2", type: "Approbation des plans", objet: "Collecteur intercommunal DN 600", autorite: "Département cantonal de l'environnement",
      reference: "DE-2026-0231", statut: "Oppositions en traitement", dateDepot: "2026-05-15", dateEnquete: "2026-06-01", oppositions: 2, conditions: [],
    },
    {
      id: "aut-4", projetId: "prj-2", type: "Autorisation spéciale", objet: "Fonçage sous les voies CFF", autorite: "CFF Infrastructure / OFT",
      statut: "En préparation", oppositions: 0, lotId: "lot-6", conditions: [],
    },
  ];

  const sv = (n: number, projetId: string, parcelle: string, proprietaire: string, type: Servitude["type"], statut: Servitude["statut"], indemnite: number, emprise?: string, echeance?: string, dateSignature?: string, remarque?: string): Servitude => ({
    id: `srv-${n}`, projetId, parcelle, commune: projetId === "prj-1" ? "Exemple-les-Bains" : "Vallée d'Exemple", proprietaire, type, statut, indemnite, emprise, echeance, dateSignature, remarque,
  });
  const servitudes: Servitude[] = [
    sv(1, "prj-1", "1245", "Famille Rochat", "Acquisition de terrain", "Inscrite au registre foncier", 18_400, "46 m2", undefined, "2025-06-12"),
    sv(2, "prj-1", "1246", "Garage du Centre SA", "Emprise temporaire", "Convention signée", 6_000, "120 m2 (8 mois)", undefined, "2025-11-03"),
    sv(3, "prj-1", "1310", "PPE Les Tilleuls", "Servitude de conduite", "En négociation", 4_500, "32 m", "2026-10-31", undefined, "Assemblée des copropriétaires le 20.10"),
    sv(4, "prj-1", "1311", "M. et Mme Favre", "Servitude de conduite", "Accord de principe", 2_800, "18 m", "2026-10-15"),
    sv(5, "prj-1", "1402", "Commune d'Exemple", "Servitude de passage", "Convention signée", 0, "chemin d'accès", undefined, "2025-10-20"),
    sv(6, "prj-2", "88", "Exploitation agricole Monnet", "Servitude de conduite", "En négociation", 12_000, "340 m", "2026-11-30", undefined, "Indemnité pour pertes de récolte à préciser"),
    sv(7, "prj-2", "91", "Hoirie Perrin", "Servitude de conduite", "À négocier", 7_500, "210 m", "2026-12-15"),
    sv(8, "prj-2", "CFF 5012", "CFF SA", "Droit de superficie", "À négocier", 0, "fonçage 40 m", "2026-12-31"),
  ];

  // Suivi financier par position : mutations, offres attendues et estimations prévisionnelles
  const mutations: Mutation[] = [
    {
      id: "mut-1", projetId: "prj-1", numero: "M-01", motif: "Purge de sol (avenant AV-01) financée par la réserve", date: "2026-04-22",
      statut: "Validée", demandeurId: "per-2", valideurId: "per-1", dateValidation: "2026-04-24",
      lignes: [{ budgetId: "bud-14", montant: -86_500 }, { budgetId: "bud-6", montant: 86_500 }],
    },
    {
      id: "mut-2", projetId: "prj-1", numero: "M-02", motif: "Éclairage : candélabres supplémentaires au giratoire", date: "2026-09-28",
      statut: "Soumise", demandeurId: "per-3", lignes: [{ budgetId: "bud-14", montant: -30_000 }, { budgetId: "bud-9", montant: 30_000 }],
    },
  ];
  const offres: OffreAttendue[] = [
    {
      id: "off-1", projetId: "prj-1", numero: "OF-2026-118", fournisseur: "Paysages & Jardins SA", entrepriseId: "ent-6", description: "Plantations et espaces verts",
      date: "2026-09-18", type: "Offre ferme", statut: "Reçue", montant: 132_400, repartition: [{ budgetId: "bud-10", montant: 132_400 }],
    },
    {
      id: "off-2", projetId: "prj-1", numero: "OF-2026-121", fournisseur: "Signalisation Romande Sàrl", description: "Marquage et signalisation verticale",
      date: "2026-09-25", type: "Offre indicative", statut: "En cours", montant: 128_000, repartition: [{ budgetId: "bud-11", montant: 128_000 }],
    },
  ];
  const ajustements: Ajustement[] = [
    {
      id: "aj-1", projetId: "prj-1", type: "Risque", libelle: "Matériaux d'excavation pollués (type B)", montant: 120_000, probabilite: 30, statut: "Active",
      repartition: [{ budgetId: "bud-4", montant: 120_000 }], auteurId: "per-2", date: "2026-06-15", justification: "Sondages S4 et S7 : HAP au-dessus du seuil B. Évacuation en décharge type B à prévoir sur environ 600 m3.",
      dateRevue: "2026-09-10",
    },
    {
      id: "aj-2", projetId: "prj-1", type: "Plus-value attendue", libelle: "Enrobé : révision des prix (indice bitume)", montant: 38_000, probabilite: 80, statut: "Active",
      repartition: [{ budgetId: "bud-6", montant: 38_000 }], auteurId: "per-2", date: "2026-08-20", echeance: "2026-12-31",
      justification: "Clause de révision des prix du contrat C-RC601-01, indice bitume +14 % depuis l'offre.", dateRevue: "2026-08-20",
    },
    {
      id: "aj-3", projetId: "prj-1", type: "Opportunité", libelle: "Réutilisation des bordures granit existantes", montant: 25_000, probabilite: 50, statut: "Active",
      repartition: [{ budgetId: "bud-1", montant: 25_000 }], auteurId: "per-4", date: "2026-07-02", justification: "Environ 40 % des bordures récupérables après démontage soigné.",
      dateRevue: "2026-07-02",
    },
  ];
  const facturesHorsCommande: FactureHorsCommande[] = [
    {
      id: "fhc-1", projetId: "prj-1", numero: "FHC-0412", fournisseur: "Laboratoire Géotest SA", date: "2026-05-12", montantHT: 8_450, paye: true,
      repartition: [{ budgetId: "bud-4", montant: 8_450 }], remarques: "Analyses de sol complémentaires",
    },
  ];

  // Clôture d'août : avant la réception de l'offre de plantations et l'ajustement sur l'enrobé
  const base = {
    budget, lots, contrats, factures: factures.filter((x) => x.date < "2026-09-01"), facturesHorsCommande, appelsOffres: [],
    mutations: mutations.filter((m) => m.statut === "Validée"), offres: [], ajustements: ajustements.filter((a) => a.id !== "aj-2"),
  };
  const clotures: Cloture[] = [{
    id: "clo-1", projetId: "prj-1", mois: "2026-08", date: "2026-09-02", auteurId: "per-1",
    commentaire: "Avenant AV-02 (giratoire) en attente de décision de la commune. Réserve encore confortable.",
    ...photographier(calculerBudget({ ...base, budget: budget.filter((b) => b.projetId === "prj-1"), contrats: contrats.filter((c) => c.projetId === "prj-1") })),
  }];

  return {
    projets, lots, budget, entreprises, appelsOffres, contrats, factures, taches, documents, personnes, affectations,
    organigramme, validations, risques, actions, autorisations, servitudes,
    mutations, offres, ajustements, facturesHorsCommande, clotures,
  };
}
