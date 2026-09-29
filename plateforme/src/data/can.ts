// Catalogue des articles normalisés (CAN / NPK, CRB) — chapitres courants en génie civil
// et infrastructure. Le contenu des positions est protégé par licence CRB : seuls les
// numéros et titres de chapitres sont repris ici. Importer le catalogue complet via
// fichier SIA 451 / CSV depuis le logiciel de devis.

export const CHAPITRES_CAN: Record<string, string> = {
  "111": "Travaux en régie",
  "112": "Essais",
  "113": "Installation de chantier",
  "117": "Démolitions et démontages",
  "151": "Travaux pour conduites souterraines",
  "161": "Épuisement des eaux",
  "162": "Enceintes de fouilles",
  "164": "Tirants d'ancrage et parois clouées",
  "181": "Aménagements paysagers",
  "211": "Fouilles et terrassements",
  "221": "Couches de fondation pour chaussées",
  "222": "Pavages et bordures",
  "223": "Revêtements bitumineux",
  "237": "Canalisations et évacuation des eaux",
  "241": "Constructions en béton coulé sur place",
  "314": "Maçonnerie",
};

export const UNITES = ["m", "m2", "m3", "kg", "t", "pce", "gl", "h", "fft", "l"] as const;

export function libelleCAN(chapitre: string): string {
  return CHAPITRES_CAN[chapitre] ?? "Chapitre non référencé";
}
