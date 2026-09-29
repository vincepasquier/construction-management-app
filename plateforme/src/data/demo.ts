// Jeu de données de démonstration (entièrement fictif) pour découvrir la plateforme.
import type {
  Affectation, AppelOffres, BudgetLigne, Contrat, DocumentProjet, Entreprise, Facture, Lot, Personne, Projet, Tache,
} from "../types";

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
}

export function donneesDemo(): DonneesDemo {
  const personnes: Personne[] = [
    { id: "per-1", nom: "Claire Rochat", role: "Directeur de projet", email: "c.rochat@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100 },
    { id: "per-2", nom: "Marc Délèze", role: "Responsable de lot", email: "m.deleze@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100 },
    { id: "per-3", nom: "Sofia Bianchi", role: "Responsable de lot", email: "s.bianchi@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 80 },
    { id: "per-4", nom: "Luca Favre", role: "Conducteur de travaux", email: "l.favre@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 100 },
    { id: "per-5", nom: "Nadia Perret", role: "Ingénieur", email: "n.perret@exemple.ch", organisation: "Bureau d'ingénieurs", capacite: 60 },
    { id: "per-6", nom: "Jean Monnier", role: "Maître d'ouvrage", email: "j.monnier@commune-exemple.ch", organisation: "Commune d'Exemple", capacite: 20 },
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
    { id: "lot-1", projetId: "prj-1", code: "L1", nom: "Génie civil & chaussée", cfc: ["11", "13", "20", "21", "461"], responsableId: "per-2" },
    { id: "lot-2", projetId: "prj-1", code: "L2", nom: "Réseaux souterrains", cfc: ["15", "45", "463"], responsableId: "per-3" },
    { id: "lot-3", projetId: "prj-1", code: "L3", nom: "Aménagements & équipements", cfc: ["42", "44", "23"], responsableId: "per-3" },
    { id: "lot-4", projetId: "prj-1", code: "L0", nom: "Honoraires & frais", cfc: ["29", "49", "5"], responsableId: "per-1" },
    { id: "lot-5", projetId: "prj-2", code: "L1", nom: "Collecteur en tranchée", cfc: ["13", "45"], responsableId: "per-2" },
    { id: "lot-6", projetId: "prj-2", code: "L2", nom: "Fonçage sous voies", cfc: ["17"], responsableId: "per-3" },
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

  return { projets, lots, budget, entreprises, appelsOffres, contrats, factures, taches, documents, personnes, affectations };
}
