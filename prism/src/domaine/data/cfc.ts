// Code des frais de construction (CFC, SN 506 500) — extrait des groupes principaux.
// Liste indicative à compléter selon le référentiel CRB utilisé par le bureau.

export const CFC: Record<string, string> = {
  "0": "Terrain",
  "00": "Études préliminaires",
  "01": "Acquisition du terrain",
  "02": "Frais accessoires à l'acquisition",
  "05": "Conduites de raccordement aux réseaux",
  "06": "Routes d'accès",
  "09": "Honoraires",

  "1": "Travaux préparatoires",
  "10": "Relevés, études géotechniques",
  "11": "Déblaiement, préparation du terrain",
  "111": "Défrichage",
  "112": "Démolition",
  "113": "Démontage",
  "12": "Protections, aménagements provisoires",
  "13": "Installations de chantier en commun",
  "14": "Adaptation de bâtiments existants",
  "15": "Adaptation du réseau de conduites existant",
  "16": "Adaptation des voies de circulation existantes",
  "17": "Fondations spéciales, étanchement des fouilles",
  "171": "Pieux",
  "172": "Enceintes de fouilles",
  "173": "Étayages",
  "174": "Ancrages",
  "175": "Épuisement des eaux",
  "19": "Honoraires",

  "2": "Bâtiment",
  "20": "Excavation",
  "201": "Fouilles en pleine masse",
  "21": "Gros œuvre 1",
  "211": "Travaux de l'entreprise de maçonnerie",
  "212": "Construction préfabriquée en béton",
  "213": "Construction en acier",
  "214": "Construction en bois",
  "22": "Gros œuvre 2",
  "221": "Fenêtres, portes extérieures",
  "222": "Ferblanterie",
  "224": "Couverture",
  "225": "Étanchéités et isolations spéciales",
  "226": "Crépissage de façades",
  "228": "Fermetures extérieures, protection contre le soleil",
  "23": "Installations électriques",
  "24": "Chauffage, ventilation, conditionnement d'air",
  "25": "Installations sanitaires",
  "26": "Installations de transport",
  "27": "Aménagements intérieurs 1",
  "271": "Plâtrerie",
  "272": "Ouvrages métalliques",
  "273": "Menuiserie",
  "28": "Aménagements intérieurs 2",
  "281": "Revêtements de sol",
  "282": "Revêtements de parois",
  "285": "Traitement des surfaces intérieures",
  "287": "Nettoyage du bâtiment",
  "29": "Honoraires",
  "291": "Architecte",
  "292": "Ingénieur civil",
  "293": "Ingénieur électricien",
  "294": "Ingénieur CVC",
  "295": "Ingénieur sanitaire",
  "296": "Spécialistes",

  "3": "Équipements d'exploitation",
  "31": "Gros œuvre 1",
  "33": "Installations électriques",
  "34": "Chauffage, ventilation, conditionnement d'air",
  "35": "Installations sanitaires",
  "39": "Honoraires",

  "4": "Aménagements extérieurs",
  "40": "Mise en forme du terrain",
  "41": "Constructions",
  "411": "Travaux de l'entreprise de maçonnerie",
  "42": "Jardins",
  "44": "Installations",
  "45": "Conduites de raccordement",
  "46": "Petits tracés",
  "461": "Routes, chemins, places",
  "463": "Canalisations",
  "49": "Honoraires",

  "5": "Frais secondaires et comptes d'attente",
  "51": "Autorisations, taxes",
  "52": "Échantillons, maquettes, reproductions",
  "53": "Assurances",
  "54": "Financement à partir du début des travaux",
  "55": "Prestations du maître de l'ouvrage",
  "56": "Autres frais secondaires",
  "58": "Comptes d'attente pour provisions et réserves",
  "583": "Réserve pour imprévus",
  "59": "Honoraires",

  "9": "Ameublement et décoration",
  "90": "Meubles",
  "93": "Appareils, machines",
  "94": "Petit inventaire",
  "98": "Œuvres d'art",
  "99": "Honoraires",
};

export function libelleCFC(code: string): string {
  return CFC[code] ?? "";
}

/** Chaîne des parents d'un code CFC : "211" → ["2", "21", "211"] */
export function cheminCFC(code: string): string[] {
  return Array.from({ length: code.length }, (_, i) => code.slice(0, i + 1));
}

/** Un code CFC appartient-il à l'un des préfixes donnés ? */
export function cfcCorrespond(code: string, prefixes: string[]): boolean {
  return prefixes.some((p) => code.startsWith(p));
}

export const CFC_OPTIONS = Object.entries(CFC)
  .filter(([code]) => code.length >= 2)
  .map(([code, libelle]) => ({ code, libelle }));
