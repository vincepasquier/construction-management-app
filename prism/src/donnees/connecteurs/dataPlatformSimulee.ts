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
}

export const CATALOGUE: Fiche[] = [
  { numero: "INF-2025-0601", nom: "Réaménagement RC 601 – traversée du village", description: "Réfection de la chaussée, trottoirs, giratoire et réseaux.", direction: "INF", typeProjet: "construction", responsable: "Claire Rochat", statut: "Ouvert", dateDebut: "2026-02-02", dateFin: "2027-06-30", budgetInitial: 7_500_000, budgetApprouve: 7_720_000, rythme: 0.68 },
  { numero: "INF-2026-0240", nom: "Collecteur intercommunal vers STEP", description: "Collecteur DN 600 sur 3,4 km.", direction: "INF", typeProjet: "construction", responsable: "Claire Rochat", statut: "Ouvert", dateDebut: "2026-09-01", dateFin: "2028-03-31", budgetInitial: 7_940_000, budgetApprouve: 7_940_000, rythme: 0.6 },
  { numero: "INF-2026-0312", nom: "Centrale de chauffe du quartier des Moulins", description: "Chaufferie bois de 3 MW et réseau de distribution, première étape.", direction: "INF", typeProjet: "construction", responsable: "Marc Délèze", statut: "Ouvert", dateDebut: "2026-04-01", dateFin: "2028-10-31", budgetInitial: 14_200_000, budgetApprouve: 14_200_000 },
  { numero: "INF-2026-0312-01", nom: "Centrale des Moulins – bâtiment", description: "Sous-projet : génie civil et bâtiment de la chaufferie.", direction: "INF", typeProjet: "construction", responsable: "Marc Délèze", statut: "Ouvert", dateDebut: "2026-04-01", dateFin: "2027-12-31", budgetInitial: 5_600_000, budgetApprouve: 5_600_000, parent: "INF-2026-0312" },
  { numero: "INF-2026-0312-02", nom: "Centrale des Moulins – réseau", description: "Sous-projet : conduites à distance et sous-stations.", direction: "INF", typeProjet: "construction", responsable: "Sofia Bianchi", statut: "Ouvert", dateDebut: "2026-09-01", dateFin: "2028-10-31", budgetInitial: 8_600_000, budgetApprouve: 8_600_000, parent: "INF-2026-0312" },
  { numero: "ENR-2025-0098", nom: "Renouvellement du poste de transformation Les Vernes", description: "Remplacement des cellules moyenne tension et du contrôle-commande.", direction: "ENR", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Ouvert", dateDebut: "2025-09-01", dateFin: "2027-03-31", budgetInitial: 3_850_000, budgetApprouve: 4_100_000, atterrissage: 4_230_000, rythme: 1.1 },
  { numero: "ENR-2026-0154", nom: "Compteurs intelligents – troisième tranche", description: "Déploiement de 18'000 compteurs communicants.", direction: "ENR", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Ouvert", dateDebut: "2026-01-05", dateFin: "2027-12-17", budgetInitial: 6_300_000, budgetApprouve: 6_300_000, rythme: 0.85 },
  { numero: "NUM-2026-0021", nom: "Plateforme de pilotage des projets", description: "Outil commun de pilotage, de reporting et de gestion des projets.", direction: "NUM", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Ouvert", dateDebut: "2026-12-01", dateFin: "2027-09-30", budgetInitial: 250_000, budgetApprouve: 250_000 },
  { numero: "NUM-2025-0177", nom: "Migration de la gestion documentaire", description: "Reprise des espaces de projet et règles de nommage communes.", direction: "NUM", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "Ouvert", dateDebut: "2025-11-03", dateFin: "2026-12-18", budgetInitial: 420_000, budgetApprouve: 480_000, atterrissage: 515_000, rythme: 1.15 },
  { numero: "FIN-2026-0009", nom: "Refonte du processus d'investissement", description: "Simplification des demandes et du suivi des décisions d'investissement.", direction: "FIN", typeProjet: "organisation", responsable: "Olivier Schwab", statut: "Ouvert", dateDebut: "2026-03-02", dateFin: "2026-12-31", budgetInitial: 90_000, budgetApprouve: 90_000 },
  { numero: "ENR-2024-0033", nom: "Assainissement de la conduite forcée du Gibloux", description: "Projet terminé, en attente de clôture.", direction: "ENR", typeProjet: "investissement", responsable: "Thomas Keller", statut: "Terminé techniquement", dateDebut: "2024-05-06", dateFin: "2026-06-26", budgetInitial: 2_400_000, budgetApprouve: 2_400_000, atterrissage: 2_352_000 },
  { numero: "NUM-2027-0003", nom: "Portail des raccordements", description: "Projet en préparation, non encore ouvert.", direction: "NUM", typeProjet: "numerique", responsable: "Amélie Dubois", statut: "En préparation", dateDebut: "2027-02-01", dateFin: "2027-11-30", budgetInitial: 310_000, budgetApprouve: 310_000 },
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
  const realise = arrondi(f.budgetApprouve * part);
  const engage = arrondi(Math.min(f.budgetApprouve * 1.04, realise + f.budgetApprouve * (part > 0 ? 0.18 + alea() * 0.12 : 0)));

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
