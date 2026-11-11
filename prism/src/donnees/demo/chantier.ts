// Démonstration du suivi de chantier sur le projet de route cantonale : journal des deux dernières
// semaines, séances, constats avec images, réserves, réception, régies et métrés.
// Toutes les dates sont posées par rapport au jour du chargement.
import { garantieDepuis } from "../../domaine/lib/chantier";
import { ajouterJours, moisDe } from "../../domaine/lib/format";
import { nouvelleSeance } from "../../domaine/socle/seances";
import type { PointSeance, Seance } from "../../domaine/socle/types";
import type { Constat, EntreeJournalChantier, Metre, Reception, Regie, Reserve } from "../../domaine/types-chantier";
import type { Depot } from "../depot";
import { enregistrerSeance } from "../seances";

const PROJET = "prj-1";

/** Image de démonstration : un croquis, pour montrer la galerie sans embarquer de vraie photo */
function croquis(titre: string, ciel: string, sol: string, motif: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<rect width="800" height="600" fill="${ciel}"/><rect y="360" width="800" height="240" fill="${sol}"/>${motif}
<rect x="0" y="548" width="800" height="52" fill="#0f172a" opacity=".72"/>
<text x="24" y="582" font-family="Arial, sans-serif" font-size="22" fill="#fff">${titre} — image de démonstration</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}
const IMAGES: [string, Blob][] = [
  ["photo-demo-1", croquis("Fouille, profil 12", "#cbd5e1", "#a16207", '<polygon points="180,360 620,360 540,520 260,520" fill="#713f12"/><rect x="250" y="470" width="300" height="26" rx="13" fill="#0ea5e9"/><rect x="330" y="300" width="14" height="60" fill="#f97316"/><rect x="470" y="300" width="14" height="60" fill="#f97316"/><rect x="330" y="312" width="154" height="10" fill="#fdba74"/>')],
  ["photo-demo-2", croquis("Regard R12, radier", "#e2e8f0", "#78716c", '<circle cx="400" cy="400" r="150" fill="#57534e"/><circle cx="400" cy="400" r="110" fill="#292524"/><path d="M320 380 h160 M320 410 h160 M320 440 h160" stroke="#b45309" stroke-width="7"/><path d="M350 350 v120 M400 350 v120 M450 350 v120" stroke="#b45309" stroke-width="7"/>')],
  ["photo-demo-3", croquis("Signalisation, carrefour nord", "#bae6fd", "#475569", '<rect x="0" y="420" width="800" height="70" fill="#334155"/><path d="M0 455 h800" stroke="#facc15" stroke-width="5" stroke-dasharray="40 30"/><polygon points="600,250 660,360 540,360" fill="#fff" stroke="#dc2626" stroke-width="12"/><rect x="594" y="360" width="12" height="80" fill="#64748b"/><rect x="150" y="330" width="90" height="90" fill="#f97316"/><rect x="150" y="360" width="90" height="16" fill="#fff"/>')],
  ["photo-demo-4", croquis("État des lieux, façade n° 14", "#e0f2fe", "#94a3b8", '<rect x="220" y="140" width="360" height="300" fill="#f5f5f4" stroke="#78716c" stroke-width="4"/><rect x="270" y="190" width="80" height="100" fill="#7dd3fc"/><rect x="450" y="190" width="80" height="100" fill="#7dd3fc"/><rect x="360" y="330" width="80" height="110" fill="#92400e"/><path d="M300 300 l30 50 l-18 40 l26 50" stroke="#1c1917" stroke-width="4" fill="none"/>')],
  ["photo-demo-5", croquis("Pose de l'enrobé, étape 1", "#dbeafe", "#1e293b", '<rect x="0" y="380" width="800" height="120" fill="#0f172a"/><rect x="120" y="300" width="240" height="90" rx="10" fill="#eab308"/><circle cx="170" cy="400" r="34" fill="#334155"/><circle cx="310" cy="400" r="34" fill="#334155"/><rect x="360" y="350" width="120" height="30" fill="#ca8a04"/>')],
];

const ouvre = (iso: string) => { const j = new Date(`${iso}T12:00:00Z`).getUTCDay(); return j !== 0 && j !== 6; };
/** Les `n` derniers jours ouvrés avant `jour`, du plus ancien au plus récent */
function joursOuvresAvant(jour: string, n: number, sauter = 0): string[] {
  const out: string[] = [];
  for (let j = ajouterJours(jour, -1 - sauter); out.length < n; j = ajouterJours(j, -1)) if (ouvre(j)) out.unshift(j);
  return out;
}

export async function installerChantierDemo(depot: Depot, jour: string): Promise<void> {
  if (!depot.parId("projets", PROJET) || depot.parProjet("journalChantier", PROJET).length) return;
  for (const [id, donnees] of IMAGES) await depot.ajouterFichier({ id, nom: `${id}.svg`, type: "image/svg+xml", taille: donnees.size, projetId: PROJET, donnees });

  // Journal : neuf jours ouvrés, la veille restant à saisir ; les journées de plus d'une semaine sont verrouillées
  const jours = joursOuvresAvant(jour, 9, 1);
  const travaux = [
    "Étape 1 : terrassement de la fouille du collecteur, profils 8 à 10. Évacuation des matériaux en décharge.",
    "Pose du collecteur EU DN 400, profils 8 à 10 (36 m). Remblayage en grave par couches de 30 cm, compactage contrôlé.",
    "Fouille profils 10 à 12. Découverte d'une conduite non répertoriée au profil 12 : dégagement à la main, en régie.",
    "Arrêt des terrassements le matin (pluie soutenue). Après-midi : pompage de la fouille, reprise du blindage.",
    "Pose du regard R12, coffrage et ferraillage du radier. Pose des bordures granit côté nord (85 m).",
    "Bétonnage du radier du regard R12. Réglage de la grave 0/45 sur l'étape 1, profils 2 à 6.",
    "Compactage et essais de plaque sur la grave (ME1 conformes). Préparation de la pose de l'enrobé.",
    "Pose de l'enrobé AC T 22 N sur l'étape 1, 410 t. Contrôle des températures à la livraison.",
    "Fouille profils 12 à 14. Pose de la conduite d'eau potable PE 225 en parallèle (48 m).",
  ];
  const meteos: EntreeJournalChantier["meteo"][] = ["Beau", "Nuageux", "Nuageux", "Pluie", "Nuageux", "Beau", "Beau", "Beau", "Nuageux"];
  const journal: EntreeJournalChantier[] = jours.map((date, i) => ({
    id: `jc-demo-${i + 1}`, projetId: PROJET, date, meteo: meteos[i], temperature: [9, 8, 7, 6, 8, 11, 12, 10, 7][i],
    effectifs: [
      { entreprise: "Routes & Génie SA", personnes: [8, 8, 7, 4, 9, 9, 8, 12, 8][i], ...(i === 3 ? { remarque: "demi-journée, intempéries" } : {}) },
      { entreprise: "Hydro-Réseaux SA", personnes: [5, 6, 6, 3, 5, 4, 0, 0, 6][i] },
      ...(i < 3 ? [{ entreprise: "Terrassements Alpins Sàrl", personnes: 4 }] : []),
    ].filter((x) => x.personnes > 0),
    travaux: travaux[i],
    evenements: [
      ...(i === 2 ? [{ id: `ev-demo-${i}a`, type: "Incident" as const, texte: "Conduite non répertoriée au profil 12, sans dégât. Services industriels avisés." }] : []),
      ...(i === 3 ? [{ id: `ev-demo-${i}a`, type: "Arrêt" as const, texte: "Terrassements arrêtés de 7 h à 12 h : fouille inondée." }] : []),
      ...(i === 5 ? [{ id: `ev-demo-${i}a`, type: "Livraison" as const, texte: "Béton C30/37, 6 m3, bon n° 48213." }, { id: `ev-demo-${i}b`, type: "Sécurité" as const, texte: "Visite du chargé de sécurité : blindage conforme, rappel sur le port du casque." }] : []),
      ...(i === 7 ? [{ id: `ev-demo-${i}a`, type: "Visite" as const, texte: "Visite du maître d'ouvrage pendant la pose de l'enrobé." }] : []),
    ],
    photos: i === 2 ? ["photo-demo-1"] : i === 7 ? ["photo-demo-5"] : [],
    auteurId: "per-4", verrouillee: date < ajouterJours(jour, -7) || undefined,
  }));

  const receptions: Reception[] = [
    { id: "rcp-demo-1", projetId: PROJET, contratId: "ctr-2", objet: "Terrassements généraux, étape 1", date: ajouterJours(jour, -660), type: "Partielle", resultat: "Acceptée", ...sansPrescription(ajouterJours(jour, -660)), participants: "Direction des travaux, Terrassements Alpins Sàrl" },
    { id: "rcp-demo-2", projetId: PROJET, contratId: "ctr-3", objet: "Collecteur EU/EC, tronçon profils 1 à 8", date: ajouterJours(jour, -40), type: "Partielle", resultat: "Acceptée avec réserves", ...sansPrescription(ajouterJours(jour, -40)), participants: "Direction des travaux, Hydro-Réseaux SA, service des eaux", remarques: "Passage caméra conforme. Réserves selon liste." },
  ];

  const reserves: Reserve[] = [
    { id: "res-demo-1", projetId: PROJET, numero: "R-001", libelle: "Joint de regard R4 non étanche", localisation: "Regard R4, profil 4", lotId: "lot-2", contratId: "ctr-3", entrepriseId: "ent-4", gravite: "Majeure", statut: "Levée", dateConstat: ajouterJours(jour, -40), delai: ajouterJours(jour, -20), dateLevee: ajouterJours(jour, -24), leveeParId: "per-4", receptionId: "rcp-demo-2", photos: [] },
    { id: "res-demo-2", projetId: PROJET, numero: "R-002", libelle: "Cunette du regard R6 à reprendre", description: "Pente insuffisante, stagnation d'eau constatée au passage caméra.", localisation: "Regard R6, profil 6", lotId: "lot-2", contratId: "ctr-3", entrepriseId: "ent-4", gravite: "Mineure", statut: "Levée annoncée", dateConstat: ajouterJours(jour, -40), delai: ajouterJours(jour, 5), receptionId: "rcp-demo-2", photos: [] },
    { id: "res-demo-3", projetId: PROJET, numero: "R-003", libelle: "Couvercle de regard R7 non conforme (classe B125 au lieu de D400)", localisation: "Regard R7, chaussée", lotId: "lot-2", contratId: "ctr-3", entrepriseId: "ent-4", gravite: "Majeure", statut: "Ouverte", dateConstat: ajouterJours(jour, -40), delai: ajouterJours(jour, -10), receptionId: "rcp-demo-2", photos: [] },
    { id: "res-demo-4", projetId: PROJET, numero: "R-004", libelle: "Enrobage insuffisant des armatures du radier du regard R12", description: "Enrobage mesuré à 22 mm pour 40 mm exigés. Reprise à proposer par l'entreprise.", localisation: "Regard R12, profil 12", lotId: "lot-2", contratId: "ctr-3", entrepriseId: "ent-4", gravite: "Bloquante", statut: "Ouverte", dateConstat: jours[4], delai: ajouterJours(jour, 12), constatId: "cst-demo-1", photos: ["photo-demo-2"] },
    { id: "res-demo-5", projetId: PROJET, numero: "R-005", libelle: "Bordures granit désalignées sur 12 m", localisation: "Côté nord, profils 3 à 4", lotId: "lot-1", contratId: "ctr-1", entrepriseId: "ent-1", gravite: "Mineure", statut: "Contestée", dateConstat: jours[5], delai: ajouterJours(jour, 20), photos: [] },
    { id: "res-demo-6", projetId: PROJET, numero: "R-006", libelle: "Compactage du remblai à contrôler après les pluies", localisation: "Fouille profils 8 à 10", lotId: "lot-1", contratId: "ctr-2", entrepriseId: "ent-3", gravite: "Mineure", statut: "Levée", dateConstat: jours[3], delai: ajouterJours(jours[3], 10), dateLevee: jours[6], leveeParId: "per-4", photos: [] },
  ];

  const constats: Constat[] = [
    { id: "cst-demo-1", projetId: PROJET, numero: "CT-001", date: jours[4], type: "Qualité", titre: "Enrobage insuffisant des armatures du radier du regard R12", description: "Avant bétonnage, enrobage mesuré à 22 mm en trois points pour 40 mm exigés au plan 601-R-12. Les cales sont trop basses.", localisation: "Regard R12, profil 12", lotId: "lot-2", entrepriseId: "ent-4", partiesPresentes: "L. Favre (direction des travaux), contremaître Hydro-Réseaux SA", photos: [{ fichierId: "photo-demo-2", legende: "Ferraillage du radier, cales en place" }], auteurId: "per-4", reserveId: "res-demo-4" },
    { id: "cst-demo-2", projetId: PROJET, numero: "CT-002", date: jours[2], type: "Sécurité", titre: "Conduite non répertoriée dans la fouille du collecteur", description: "Conduite en fonte d'environ 150 mm, hors service selon les services industriels (à confirmer par écrit). Dégagée à la main sur 6 m.", localisation: "Profil 12, à 1,8 m de profondeur", lotId: "lot-2", entrepriseId: "ent-4", partiesPresentes: "L. Favre, Hydro-Réseaux SA, services industriels", photos: [{ fichierId: "photo-demo-1", legende: "Conduite dégagée, vue vers l'aval" }], auteurId: "per-4" },
    { id: "cst-demo-3", projetId: PROJET, numero: "CT-003", date: ajouterJours(jour, -60), type: "État des lieux", titre: "État des lieux avant travaux, immeuble rue du Collège 14", description: "Fissure existante en façade nord, de l'appui de fenêtre du rez jusqu'au soubassement. Témoin posé, relevé à refaire en fin de chantier.", localisation: "Rue du Collège 14", partiesPresentes: "Propriétaire, direction des travaux", photos: [{ fichierId: "photo-demo-4", legende: "Façade nord, fissure existante" }], auteurId: "per-4" },
    { id: "cst-demo-4", projetId: PROJET, numero: "CT-004", date: jours[6], type: "Sécurité", titre: "Signalisation de chantier incomplète au carrefour nord", description: "Le signal de travaux manque dans le sens descendant ; la déviation piétonne n'est pas balisée.", localisation: "Carrefour nord", lotId: "lot-1", entrepriseId: "ent-1", photos: [{ fichierId: "photo-demo-3", legende: "Sens descendant, sans présignalisation" }], auteurId: "per-4" },
    { id: "cst-demo-5", projetId: PROJET, numero: "CT-005", date: jours[7], type: "Avancement", titre: "Enrobé de l'étape 1 posé", description: "Couche de base AC T 22 N posée sur 410 m. Températures de pose conformes.", localisation: "Étape 1, profils 2 à 6", lotId: "lot-1", entrepriseId: "ent-1", photos: [{ fichierId: "photo-demo-5", legende: "Finisseur en action, profil 4" }], auteurId: "per-4" },
  ];

  const regies: Regie[] = [
    { id: "reg-demo-1", projetId: PROJET, contratId: "ctr-3", numero: "BR-001", date: jours[2], objet: "Dégagement à la main d'une conduite non répertoriée, profil 12", statut: "Validé", valideParId: "per-4", dateValidation: jours[3],
      lignes: [{ id: "lr1", type: "Main-d'œuvre", libelle: "Ouvrier de la construction", quantite: 12, unite: "h", prixUnitaire: 78 }, { id: "lr2", type: "Main-d'œuvre", libelle: "Chef d'équipe", quantite: 6, unite: "h", prixUnitaire: 96.5 }, { id: "lr3", type: "Engin", libelle: "Pelle 8 t avec machiniste", quantite: 3, unite: "h", prixUnitaire: 148 }],
      remarques: "Ordonné sur place par la direction des travaux (voir constat CT-002)." },
    { id: "reg-demo-2", projetId: PROJET, contratId: "ctr-2", numero: "BR-002", date: jours[3], objet: "Pompage de la fouille après les pluies", statut: "Saisi",
      lignes: [{ id: "lr1", type: "Engin", libelle: "Pompe de chantier 60 m3/h", quantite: 5, unite: "h", prixUnitaire: 42 }, { id: "lr2", type: "Main-d'œuvre", libelle: "Ouvrier de la construction", quantite: 5, unite: "h", prixUnitaire: 78 }] },
    { id: "reg-demo-3", projetId: PROJET, contratId: "ctr-1", numero: "BR-003", date: ajouterJours(jour, -45), objet: "Déplacement provisoire d'un candélabre", statut: "Facturé", valideParId: "per-4", dateValidation: ajouterJours(jour, -43),
      lignes: [{ id: "lr1", type: "Main-d'œuvre", libelle: "Monteur électricien", quantite: 4, unite: "h", prixUnitaire: 105 }, { id: "lr2", type: "Engin", libelle: "Camion-grue", quantite: 2, unite: "h", prixUnitaire: 185 }, { id: "lr3", type: "Matériel", libelle: "Socle provisoire en béton", quantite: 1, unite: "pce", prixUnitaire: 320 }] },
    { id: "reg-demo-4", projetId: PROJET, contratId: "ctr-1", numero: "BR-004", date: jours[5], objet: "Reprise des bordures désalignées", statut: "Contesté",
      lignes: [{ id: "lr1", type: "Main-d'œuvre", libelle: "Paveur", quantite: 8, unite: "h", prixUnitaire: 88 }], remarques: "Contesté : la reprise relève de la réserve R-005, à la charge de l'entreprise." },
  ];

  // Métrés du contrat de génie civil, sur les positions et les prix de l'offre retenue
  const precedent = moisDe(ajouterJours(`${moisDe(jour)}-01`, -1)), courant = moisDe(jour);
  const metre = (n: number, periode: string, position: string, libelle: string, unite: string, quantite: number, prixUnitaire: number, statut: Metre["statut"] = "Contradictoire"): Metre =>
    ({ id: `met-demo-${n}`, projetId: PROJET, contratId: "ctr-1", position, libelle, unite, periode, quantite, prixUnitaire, statut });
  const metres: Metre[] = [
    metre(1, precedent, "113.111.101", "Installation de chantier, forfait", "gl", 0.6, 145_000),
    metre(2, precedent, "221.311.101", "Grave 0/45, épaisseur 40 cm", "m3", 2150, 68),
    metre(3, precedent, "222.121.101", "Bordures granit type RN", "m", 420, 92),
    metre(4, courant, "221.311.101", "Grave 0/45, épaisseur 40 cm", "m3", 1380, 68, "Relevé"),
    metre(5, courant, "223.211.101", "Enrobé AC T 22 N, ép. 7 cm", "t", 410, 142, "Relevé"),
    metre(6, courant, "222.121.101", "Bordures granit type RN", "m", 85, 92, "Contesté"),
  ];

  depot.grouper("Démonstration du suivi de chantier", () => {
    for (const x of receptions) depot.ajouter("receptions", x);
    for (const x of reserves) depot.ajouter("reserves", x);
    for (const x of constats) depot.ajouter("constats", x);
    for (const x of journal) depot.ajouter("journalChantier", x);
    for (const x of regies) depot.ajouter("regies", x);
    for (const x of metres) depot.ajouter("metres", x);
  }, { origine: "systeme", sansDetail: true });

  // Deux séances de chantier : un point de la première, resté ouvert, est repris dans la seconde
  const acteur = depot.acteurId;
  depot.acteurId = undefined;
  try {
    const point = (seance: string, n: string, x: Partial<PointSeance>): PointSeance => ({ id: `pt-ch-${n}`, numero: n, titre: "", texte: "", nature: "Information", statut: "Ouvert", origineSeanceId: seance, ...x });
    const premiere: Seance = {
      ...nouvelleSeance([], { id: "sea-ch-demo-1", type: "Chantier", projetId: PROJET, date: jours[1], redacteurId: "per-4" }),
      lieu: "Baraque de chantier", statut: "Diffusée", prochaineSeance: jours[6],
      participants: [{ personneId: "per-4", presence: "Présent", diffusion: true }, { personneId: "per-2", presence: "Présent", diffusion: true }, { nom: "P. Vouilloz", organisation: "Routes & Génie SA", presence: "Présent", diffusion: true }, { nom: "E. Morel", organisation: "Hydro-Réseaux SA", presence: "Présent", diffusion: true }, { personneId: "per-6", presence: "Excusé", diffusion: true }],
      points: [
        point("sea-ch-demo-1", "1.1", { titre: "Avancement", texte: "Collecteur posé jusqu'au profil 10. Étape 1 : grave en place, enrobé prévu la semaine suivante.", statut: "Clos" }),
        point("sea-ch-demo-1", "1.2", { titre: "Plans d'exécution du regard R12", texte: "Le plan 601-R-12 indice B est attendu avant le ferraillage.", nature: "Tâche", responsableId: "per-2", echeance: jours[3] }),
        point("sea-ch-demo-1", "1.3", { titre: "Programme de l'enrobé de l'étape 1", texte: "L'entreprise confirme la date et le plan de circulation.", nature: "Tâche", responsableNom: "Routes & Génie SA", echeance: jours[5], statut: "Clos" }),
      ],
    };
    enregistrerSeance(depot, premiere);
    const base = nouvelleSeance([premiere], { id: "sea-ch-demo-2", type: "Chantier", projetId: PROJET, date: jours[6], redacteurId: "per-4" });
    enregistrerSeance(depot, {
      ...base, statut: "Tenue", prochaineSeance: ajouterJours(jour, 4),
      points: [
        ...base.points,
        point("sea-ch-demo-2", "2.1", { titre: "Conduite non répertoriée au profil 12", texte: "Les services industriels confirment par écrit que la conduite est hors service. Dépose en régie (bon BR-001).", nature: "Décision", statut: "Clos", decision: { statut: "Approuvée", conditions: [] } }),
        point("sea-ch-demo-2", "2.2", { titre: "Réserve R-004, radier du regard R12", texte: "L'entreprise propose une reprise par mortier de réparation ; la direction des travaux demande une note de l'ingénieur.", nature: "Tâche", responsableId: "per-2", echeance: ajouterJours(jour, 6) }),
        point("sea-ch-demo-2", "2.3", { titre: "Signalisation du carrefour nord", texte: "À compléter sans délai (constat CT-004).", nature: "Tâche", responsableNom: "Routes & Génie SA", echeance: ajouterJours(jour, 1) }),
      ],
    });
  } finally { depot.acteurId = acteur; }
}

/** Dates de garantie d'une réception, sans la date de prescription (qui n'est pas enregistrée) */
function sansPrescription(date: string): Pick<Reception, "debutGarantie" | "finGarantie"> {
  const { debutGarantie, finGarantie } = garantieDepuis(date);
  return { debutGarantie, finGarantie };
}
