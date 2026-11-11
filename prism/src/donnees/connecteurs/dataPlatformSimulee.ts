// Source de projets simulée : tient lieu de la Data Platform et de Dynamics 365 tant qu'aucun
// accès réel n'est ouvert. Les projets, montants et fournisseurs sont entièrement fictifs.
// Les valeurs sont calculées à partir de la date demandée : synchroniser un mois plus tard fait
// avancer le réalisé, comme le ferait la vraie source.
import type { FactureSourceBrute, ProjetSource, SourceProjets } from "./source";

interface Fiche {
  numero: string;
  nom: string;
  description: string;
  direction: string;
  typeProjet: string;
  responsable: string;
  statut: string;
  dateDebut: string;
  dateFin: string;
  budgetInitial: number;
  budgetApprouve: number;
  parent?: string;
  /** La source tient elle-même un atterrissage pour ce projet */
  atterrissage?: number;
  /** Rythme de dépense par rapport au planning (1 = conforme) */
  rythme?: number;
  /** Parts du budget réalisée et engagée, quand elles sont connues plutôt que déduites du calendrier */
  partRealisee?: number;
  partEngagee?: number;
}

/** Projets du portefeuille de démonstration : leur contenu détaillé est dans donnees/demo/portefeuille */
const PORTEFEUILLE: Fiche[] = [
  { numero: "DEN-2024-0210", nom: "Réhabilitation du barrage de Valmont", description: "Mise en conformité du barrage : confortement du couronnement, agrandissement de l'évacuateur de crues, nouvelles vannes.", direction: "DEN", typeProjet: "construction", responsable: "Lucien Aymon", statut: "Ouvert", dateDebut: "2024-09-02", dateFin: "2028-06-30", budgetInitial: 37_500_000, budgetApprouve: 38_400_000, partRealisee: 0.27, partEngagee: 0.72 },
  { numero: "DEN-2025-0045", nom: "Aménagement hydroélectrique Schiffenen–Morat – études", description: "Études, reconnaissances et procédure d'autorisation d'une galerie d'amenée entre les deux lacs et de sa centrale.", direction: "DEN", typeProjet: "construction", responsable: "Lucien Aymon", statut: "Ouvert", dateDebut: "2025-01-06", dateFin: "2028-03-31", budgetInitial: 24_000_000, budgetApprouve: 24_000_000, partRealisee: 0.3, partEngagee: 0.64 },
  { numero: "DEN-2025-0127", nom: "Réseau de chauffage à distance des Vergers – étape 2", description: "4,1 km de conduites et 46 sous-stations pour raccorder la rive est du quartier.", direction: "DEN", typeProjet: "construction", responsable: "Maude Berset", statut: "Ouvert", dateDebut: "2025-03-03", dateFin: "2027-04-30", budgetInitial: 12_200_000, budgetApprouve: 12_600_000, partRealisee: 0.8, partEngagee: 0.91 },
  { numero: "DEN-2026-0088", nom: "Centrale de chauffe à bois des Vergers", description: "Nouvelle centrale de 6 MW : deux chaudières à bois, électrofiltres et accumulateur.", direction: "DEN", typeProjet: "construction", responsable: "Maude Berset", statut: "Ouvert", dateDebut: "2026-01-12", dateFin: "2028-10-31", budgetInitial: 16_800_000, budgetApprouve: 16_800_000, partRealisee: 0.04, partEngagee: 0.11 },
  { numero: "DDE-2025-0061", nom: "Mise en souterrain de la ligne 60 kV Les Granges – Praz-Riond", description: "9,6 km de liaison souterraine et démontage de 38 pylônes.", direction: "DDE", typeProjet: "construction", responsable: "Thomas Keller", statut: "Ouvert", dateDebut: "2025-02-03", dateFin: "2028-01-31", budgetInitial: 21_500_000, budgetApprouve: 21_500_000, partRealisee: 0.5, partEngagee: 0.86 },
  { numero: "DDE-2023-0034", nom: "Nouveau poste 125/20 kV de Praz-Riond", description: "Remplacement de l'ancien poste par un poste 125/20 kV de 2 × 40 MVA.", direction: "DDE", typeProjet: "construction", responsable: "Samuel Oberson", statut: "Terminé techniquement", dateDebut: "2023-03-01", dateFin: "2026-12-18", budgetInitial: 16_900_000, budgetApprouve: 17_200_000, partRealisee: 0.98, partEngagee: 0.99 },
  { numero: "DSE-2025-0073", nom: "Rénovation des installations énergétiques de l'hôpital des Trois-Sapins", description: "Pompes à chaleur sur sondes, production de froid, ventilation des blocs et régulation, en contracting.", direction: "DSE", typeProjet: "construction", responsable: "Vincent Pasquier", statut: "Ouvert", dateDebut: "2025-05-05", dateFin: "2027-05-28", budgetInitial: 9_600_000, budgetApprouve: 9_800_000, partRealisee: 0.7, partEngagee: 0.93 },
  { numero: "DSE-2026-0105", nom: "Contracting énergétique du quartier des Tilleuls", description: "Chaleur, froid et électricité solaire pour 420 logements : études préliminaires et offre ferme.", direction: "DSE", typeProjet: "construction", responsable: "Vincent Pasquier", statut: "Ouvert", dateDebut: "2026-06-01", dateFin: "2029-06-29", budgetInitial: 6_400_000, budgetApprouve: 6_400_000, partRealisee: 0.03, partEngagee: 0.06 },
  { numero: "DFI-2025-0140", nom: "Remplacement du système de facturation de l'énergie", description: "Nouvelle solution de facturation pour 140'000 clients, reprise des données et interfaces.", direction: "DFI", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Ouvert", dateDebut: "2025-09-01", dateFin: "2027-03-31", budgetInitial: 3_900_000, budgetApprouve: 4_200_000, atterrissage: 4_380_000, partRealisee: 0.61, partEngagee: 0.84 },
  { numero: "DFI-2025-0018", nom: "Dématérialisation des factures fournisseurs", description: "Lecture automatique, circuit de visa et archivage électronique des 38'000 factures fournisseurs annuelles du groupe.", direction: "DFI", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Terminé techniquement", dateDebut: "2025-01-13", dateFin: "2026-03-31", budgetInitial: 620_000, budgetApprouve: 640_000, atterrissage: 618_000, partRealisee: 0.965, partEngagee: 0.965 },
];

export const CATALOGUE: Fiche[] = [
  ...PORTEFEUILLE,
  { numero: "DSE-2025-0601", nom: "Réaménagement RC 601 – traversée du village", description: "Chantier coordonné avec le canton : chaussée, trottoirs, giratoire et renouvellement des réseaux souterrains.", direction: "DSE", typeProjet: "construction", responsable: "Claire Rochat", statut: "Ouvert", dateDebut: "2026-02-02", dateFin: "2027-06-30", budgetInitial: 7_500_000, budgetApprouve: 7_720_000, rythme: 0.68 },
  { numero: "DSE-2026-0240", nom: "Collecteur intercommunal vers STEP", description: "Collecteur DN 600 sur 3,4 km.", direction: "DSE", typeProjet: "construction", responsable: "Claire Rochat", statut: "Ouvert", dateDebut: "2026-09-01", dateFin: "2028-03-31", budgetInitial: 7_940_000, budgetApprouve: 7_940_000, rythme: 0.6 },
  { numero: "DSE-2026-0312", nom: "Centrale de chauffe du quartier des Moulins", description: "Chaufferie bois de 3 MW et réseau de distribution, première étape.", direction: "DSE", typeProjet: "construction", responsable: "Marc Délèze", statut: "Ouvert", dateDebut: "2026-04-01", dateFin: "2028-10-31", budgetInitial: 14_200_000, budgetApprouve: 14_200_000 },
  { numero: "DSE-2026-0312-01", nom: "Centrale des Moulins – bâtiment", description: "Sous-projet : génie civil et bâtiment de la chaufferie.", direction: "DSE", typeProjet: "construction", responsable: "Marc Délèze", statut: "Ouvert", dateDebut: "2026-04-01", dateFin: "2027-12-31", budgetInitial: 5_600_000, budgetApprouve: 5_600_000, parent: "DSE-2026-0312" },
  { numero: "DSE-2026-0312-02", nom: "Centrale des Moulins – réseau", description: "Sous-projet : conduites à distance et sous-stations.", direction: "DSE", typeProjet: "construction", responsable: "Sofia Bianchi", statut: "Ouvert", dateDebut: "2026-09-01", dateFin: "2028-10-31", budgetInitial: 8_600_000, budgetApprouve: 8_600_000, parent: "DSE-2026-0312" },
  { numero: "DDE-2025-0098", nom: "Renouvellement du poste de transformation Les Vernes", description: "Remplacement des cellules moyenne tension et du contrôle-commande.", direction: "DDE", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Ouvert", dateDebut: "2025-09-01", dateFin: "2027-03-31", budgetInitial: 3_850_000, budgetApprouve: 4_100_000, atterrissage: 4_230_000, rythme: 1.1 },
  { numero: "DDE-2026-0154", nom: "Compteurs intelligents – troisième tranche", description: "Déploiement de 18'000 compteurs communicants.", direction: "DDE", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Ouvert", dateDebut: "2026-01-05", dateFin: "2027-12-17", budgetInitial: 6_300_000, budgetApprouve: 6_300_000, rythme: 0.85 },
  { numero: "DFI-2026-0021", nom: "Plateforme de pilotage des projets", description: "Outil commun de pilotage, de reporting et de gestion des projets.", direction: "DFI", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Ouvert", dateDebut: "2026-12-01", dateFin: "2027-09-30", budgetInitial: 250_000, budgetApprouve: 250_000 },
  { numero: "DFI-2025-0177", nom: "Migration de la gestion documentaire", description: "Reprise des espaces de projet et règles de nommage communes.", direction: "DFI", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Ouvert", dateDebut: "2025-11-03", dateFin: "2026-12-18", budgetInitial: 420_000, budgetApprouve: 480_000, atterrissage: 515_000, rythme: 1.15 },
  { numero: "DFI-2026-0009", nom: "Refonte du processus d'investissement", description: "Simplification des demandes et du suivi des décisions d'investissement.", direction: "DFI", typeProjet: "organisation", responsable: "Olivier Schwab", statut: "Ouvert", dateDebut: "2026-03-02", dateFin: "2026-12-31", budgetInitial: 90_000, budgetApprouve: 90_000 },
  { numero: "DEN-2026-0118", nom: "Réhabilitation du groupe 2 de la centrale de Planchamp", description: "Remplacement de la roue, révision de l'alternateur et nouveau contrôle-commande du groupe hydroélectrique.", direction: "DEN", typeProjet: "investissement", responsable: "Lucien Aymon", statut: "Ouvert", dateDebut: "2026-03-02", dateFin: "2027-11-30", budgetInitial: 5_200_000, budgetApprouve: 5_200_000, rythme: 0.9 },
  { numero: "DGC-2026-0031", nom: "Rapport de durabilité et site institutionnel", description: "Premier rapport de durabilité du groupe et refonte du site institutionnel qui le publie.", direction: "DGC", typeProjet: "organisation", responsable: "Nathalie Crettaz", statut: "Ouvert", dateDebut: "2026-02-02", dateFin: "2027-01-29", budgetInitial: 180_000, budgetApprouve: 195_000, atterrissage: 204_000, rythme: 1.05 },
  { numero: "DG-2026-0002", nom: "Stratégie 2035 – feuille de route du groupe", description: "Élaboration de la stratégie à dix ans et de sa feuille de route, avec les directions.", direction: "DG", typeProjet: "organisation", responsable: "Bernard Savioz", statut: "Ouvert", dateDebut: "2026-01-12", dateFin: "2026-12-18", budgetInitial: 240_000, budgetApprouve: 240_000, partRealisee: 0.86, partEngagee: 0.96 },
  { numero: "DEN-2024-0033", nom: "Assainissement de la conduite forcée du Gibloux", description: "Projet terminé, en attente de clôture.", direction: "DEN", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Terminé techniquement", dateDebut: "2024-05-06", dateFin: "2026-06-26", budgetInitial: 2_400_000, budgetApprouve: 2_400_000, atterrissage: 2_352_000 },
  { numero: "DFI-2027-0003", nom: "Portail des raccordements", description: "Projet en préparation, non encore ouvert.", direction: "DFI", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "En préparation", dateDebut: "2027-02-01", dateFin: "2027-11-30", budgetInitial: 310_000, budgetApprouve: 310_000 },
];

const FOURNISSEURS = ["Atelier Lémanique SA", "Ingénierie des Alpes Sàrl", "Montage Jura SA", "Conseil Sarine SA", "Électro Broye SA", "Systèmes Gruyère SA"];

/** Nombre pseudo-aléatoire stable, tiré du numéro de projet */
function graine(texte: string): () => number {
  let h = 2166136261;
  for (const c of texte) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const jour = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() / 86_400_000;
const arrondi = (v: number, pas = 100) => Math.round(v / pas) * pas;

/** Part du budget dépensée à une date : courbe en S entre le début et la fin du projet */
function avancement(f: Fiche, date: string): number {
  const t = Math.max(0, Math.min(1, (jour(date) - jour(f.dateDebut)) / Math.max(1, jour(f.dateFin) - jour(f.dateDebut))));
  return Math.min(1, t * t * (3 - 2 * t) * (f.rythme ?? 1));
}

function etat(f: Fiche, date: string): ProjetSource {
  const alea = graine(f.numero);
  const part = avancement(f, date);
  const realise = arrondi(f.budgetApprouve * (f.partRealisee ?? part));
  const engage = f.partEngagee !== undefined ? arrondi(f.budgetApprouve * f.partEngagee) : arrondi(Math.min(f.budgetApprouve * 1.04, realise + f.budgetApprouve * (part > 0 ? 0.18 + alea() * 0.12 : 0)));

  const parAnnee: ProjetSource["parAnnee"] = {};
  const a0 = Number(f.dateDebut.slice(0, 4)), a1 = Number(f.dateFin.slice(0, 4));
  for (let a = a0; a <= a1; a++) {
    const debut = a === a0 ? f.dateDebut : `${a}-01-01`;
    const fin = a === a1 ? f.dateFin : `${a}-12-31`;
    const budget = arrondi(f.budgetApprouve * (avancement({ ...f, rythme: 1 }, fin) - avancement({ ...f, rythme: 1 }, debut)));
    const borne = date < fin ? date : fin;
    const depense = borne >= debut ? arrondi(f.budgetApprouve * (avancement(f, borne) - avancement(f, debut))) : 0;
    parAnnee[String(a)] = { budget, realise: Math.max(0, depense) };
  }

  const factures: FactureSourceBrute[] = [];
  const n = realise > 0 ? 3 + Math.floor(alea() * 5) : 0;
  let reste = realise;
  for (let i = 0; i < n; i++) {
    const montant = i === n - 1 ? reste : arrondi((realise / n) * (0.7 + alea() * 0.6));
    reste -= montant;
    const j = jour(f.dateDebut) + ((jour(date) - jour(f.dateDebut)) * (i + 1)) / (n + 0.5);
    const d = new Date(j * 86_400_000).toISOString().slice(0, 10);
    const age = jour(date) - j;
    factures.push({
      numero: `${f.numero.replace(/\D/g, "").slice(-6)}-${String(i + 1).padStart(3, "0")}`,
      fournisseur: FOURNISSEURS[Math.floor(alea() * FOURNISSEURS.length)],
      commande: `CMD-${f.numero.slice(-4)}-${1 + (i % 3)}`,
      date: d, echeance: new Date((j + 30) * 86_400_000).toISOString().slice(0, 10),
      montantHT: Math.max(0, montant), statut: age > 45 ? "Payée" : age > 12 ? "Validée" : "Reçue",
    });
  }
  const paye = factures.filter((x) => x.statut === "Payée").reduce((s, x) => s + x.montantHT, 0);

  return {
    numero: f.numero, nom: f.nom, description: f.description, direction: f.direction, typeProjet: f.typeProjet,
    responsable: f.responsable, statut: f.statut, dateDebut: f.dateDebut, dateFin: f.dateFin,
    compteAnalytique: `CA-${f.direction}-${f.numero.slice(-4)}`, parent: f.parent,
    budgetInitial: f.budgetInitial, budgetApprouve: f.budgetApprouve, engage, realise, paye,
    atterrissage: f.atterrissage, parAnnee, factures,
  };
}

export const dataPlatformSimulee: SourceProjets = {
  id: "data-platform", nom: "Data Platform (simulée)", simulee: true,
  async lister() {
    return CATALOGUE.map(({ numero, nom, direction, parent, statut }) => ({ numero, nom, direction, parent, statut }));
  },
  async lire(numero, date) {
    const f = CATALOGUE.find((x) => x.numero.toLowerCase() === numero.trim().toLowerCase());
    return f ? etat(f, date) : undefined;
  },
};
