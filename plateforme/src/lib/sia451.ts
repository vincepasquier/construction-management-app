// Lecture des fichiers d'échange CRB : CRBX (archive ZIP) contenant un fichier SIA 451
// (texte à colonnes fixes, extension .e1s / .01s…).
//
// Enregistrements utilisés :
//   A  en-tête (date, projet, objet, logiciel)       Z  fin (entreprise, contact)
//   B002 subdivisions (« élévations » : PG, EA, EB…)   C  conditions (rabais, escompte, TVA, total)
//   G  positions du descriptif CAN, avec en colonne 42 le sous-type :
//      1 titre de chapitre · 2 texte abrégé · 3 ligne de texte · 5 unité · 6 quantité et prix unitaire
//
// Le montant d'une ligne est quantité × prix unitaire arrondi à 5 centimes, ce qui permet
// de retrouver exactement le total déclaré par l'entreprise (enregistrement C000).
import { unzipSync } from "fflate";

export interface PositionSia {
  /** Clé unique : chapitre + numéro, ex. « 211.813.002 » */
  cle: string;
  chapitre: string;
  numero: string;
  libelle: string;
  texte: string;
  unite: string;
  quantite: number;
  quantitesParElevation: Record<string, number>;
  /** Prix unitaire (offre) ; 0 si non chiffré */
  prixUnitaire: number;
  /** Montant HT brut, somme des lignes arrondies à 5 centimes */
  montant: number;
}

export interface FichierSia451 {
  date?: string;
  projet: string;
  objet: string;
  logiciel: string;
  /** Entreprise soumissionnaire (fichier d'offre) */
  entreprise?: string;
  contact?: string;
  telephone?: string;
  chapitres: Record<string, string>;
  elevations: Record<string, string>;
  positions: PositionSia[];
  rabaisPct: number;
  escomptePct: number;
  tvaPct?: number;
  /** Total annoncé dans le fichier (offre) */
  totalDeclare?: number;
  /** Au moins un prix unitaire renseigné : il s'agit d'une offre rentrée */
  estOffre: boolean;
}

const nombre = (champ: string, decimales: number) => {
  const s = champ.trim();
  if (!s || !/\d/.test(s)) return 0;
  const signe = s.includes("-") ? -1 : 1;
  return (signe * Number(s.replace(/[^\d]/g, ""))) / 10 ** decimales;
};

const arrondi5ct = (x: number) => Math.round(x * 20) / 20;

const dateSia = (jjmmaa: string) => (/^\d{6}$/.test(jjmmaa) ? `20${jjmmaa.slice(4, 6)}-${jjmmaa.slice(2, 4)}-${jjmmaa.slice(0, 2)}` : undefined);

export function lireSia451(contenu: string): FichierSia451 {
  const lignes = contenu.split(/\r?\n/);
  const f: FichierSia451 = {
    projet: "", objet: "", logiciel: "", chapitres: {}, elevations: {}, positions: [], rabaisPct: 0, escomptePct: 0, estOffre: false,
  };
  const parCle = new Map<string, PositionSia & { courts: string[]; longs: string[] }>();
  const position = (chapitre: string, num: string) => {
    const cle = `${chapitre}.${num.slice(0, 3)}.${num.slice(3, 6)}`;
    if (!parCle.has(cle)) {
      parCle.set(cle, { cle, chapitre, numero: cle, libelle: "", texte: "", unite: "", quantite: 0, quantitesParElevation: {}, prixUnitaire: 0, montant: 0, courts: [], longs: [] });
    }
    return parCle.get(cle)!;
  };

  for (const l of lignes) {
    const type = l[0];
    if (type === "A") {
      f.date = dateSia(l.slice(1, 7));
      f.projet = [l.slice(81, 92).trim(), l.slice(92, 122).trim().replace(/,$/, "")].filter(Boolean).join(" ");
      f.objet = l.slice(137, 167).trim();
      f.logiciel = [l.slice(167, 187).trim(), l.slice(207, 237).trim()].filter(Boolean).join(" ");
    } else if (type === "Z") {
      // Les champs vides sont parfois remplis d'un simple tiret
      const champ = (a: number, b: number) => { const v = l.slice(a, b).trim(); return v && v !== "-" ? v : undefined; };
      f.entreprise = champ(137, 167);
      f.telephone = f.entreprise ? champ(167, 187) : undefined;
      f.contact = champ(187, 207);
    } else if (l.startsWith("B002")) {
      const code = l.slice(17, 19).trim();
      if (code) f.elevations[code] = l.slice(92).trim();
    } else if (type === "C") {
      const libelle = l.slice(92).trim().toLowerCase();
      const pct = nombre(l.slice(73, 81), 2);
      if (l.startsWith("C000")) f.totalDeclare = nombre(l.slice(44, 60), 5) || undefined;
      else if (libelle.startsWith("rabais")) f.rabaisPct = Math.abs(pct);
      else if (libelle.startsWith("escompte")) f.escomptePct = Math.abs(pct);
      else if (libelle.startsWith("tva")) f.tvaPct = pct;
    } else if (type === "G" && l.length > 41) {
      const chapitre = l.slice(1, 4);
      const num = l.slice(7, 13).trim();
      const sousType = l[41];
      if (sousType === "1") { f.chapitres[chapitre] = l.slice(92).replace(/\s+/g, " ").trim(); continue; }
      if (!/^\d{6}$/.test(num)) continue;
      const p = position(chapitre, num);
      if (sousType === "2") p.courts.push(l.slice(92).trim());
      else if (sousType === "3") {
        // Les lignes ne contenant que l'unité (« m2 », « Fr. ») répètent l'unité de la position
        const t = l.slice(92).trim();
        if (t && !/^(fr\.?|[a-z]{1,2}\d?)$/i.test(t)) p.longs.push(t);
      }
      else if (sousType === "5") p.unite = l.slice(42).trim();
      else if (sousType === "6") {
        const elevation = l.slice(17, 19).trim() || "PG";
        const q = nombre(l.slice(44, 58), 3);
        const pu = nombre(l.slice(61, 74), 2);
        p.quantite += q;
        p.quantitesParElevation[elevation] = (p.quantitesParElevation[elevation] ?? 0) + q;
        if (pu) { p.prixUnitaire = pu; f.estOffre = true; }
        p.montant += arrondi5ct(q * pu);
      }
    }
  }

  // Seules les positions avec quantité (lignes de sous-type 6) sont à chiffrer ; les autres
  // sont des conditions de rémunération ou des textes d'introduction.
  f.positions = [...parCle.values()]
    .filter((p) => Object.keys(p.quantitesParElevation).length > 0)
    .map(({ courts, longs, ...p }) => {
      const texte = longs.join(" ").replace(/\s+/g, " ").trim();
      const court = courts.join(" ").trim();
      const libelle = court && !/^sp[ée]cification$/i.test(court) ? (texte ? `${court} – ${texte}` : court) : texte || court;
      return { ...p, quantite: Math.round(p.quantite * 1000) / 1000, montant: Math.round(p.montant * 100) / 100, libelle, texte };
    });
  return f;
}

/** Ouvre un fichier CRBX (ZIP) ou un fichier SIA 451 brut */
export function lireFichierCrb(octets: Uint8Array): FichierSia451 {
  let donnees = octets;
  if (octets[0] === 0x50 && octets[1] === 0x4b) {
    const fichiers = unzipSync(octets);
    const nom = Object.keys(fichiers).find((n) => /\.(e1s|\d\ds|x1s)$/i.test(n)) ?? Object.keys(fichiers)[0];
    if (!nom) throw new Error("Archive CRBX vide.");
    donnees = fichiers[nom];
  }
  let texte: string;
  try {
    texte = new TextDecoder("utf-8", { fatal: true }).decode(donnees);
  } catch {
    // Anciens fichiers SIA 451 : encodage Windows occidental
    texte = new TextDecoder("windows-1252").decode(donnees);
  }
  if (!/^A\d{6}/.test(texte)) throw new Error("Ce fichier n'est pas un fichier SIA 451 / CRBX reconnu.");
  return lireSia451(texte);
}

export interface Ecart {
  cle: string;
  libelle: string;
  type: "manquante" | "ajoutee" | "quantite" | "non chiffree";
  detail: string;
}

/** Contrôle d'une offre par rapport au descriptif envoyé : positions et quantités identiques */
export function comparerAuDescriptif(descriptif: { cle: string; libelle: string; quantite: number }[], offre: FichierSia451): Ecart[] {
  const ecarts: Ecart[] = [];
  const o = new Map(offre.positions.map((p) => [p.cle, p]));
  for (const d of descriptif) {
    const p = o.get(d.cle);
    if (!p) ecarts.push({ cle: d.cle, libelle: d.libelle, type: "manquante", detail: "absente de l'offre" });
    else {
      if (Math.abs(p.quantite - d.quantite) > 0.0005) ecarts.push({ cle: d.cle, libelle: d.libelle, type: "quantite", detail: `quantité ${p.quantite} au lieu de ${d.quantite}` });
      if (!p.prixUnitaire) ecarts.push({ cle: d.cle, libelle: d.libelle, type: "non chiffree", detail: "sans prix unitaire" });
    }
  }
  const cles = new Set(descriptif.map((d) => d.cle));
  for (const p of offre.positions) if (!cles.has(p.cle)) ecarts.push({ cle: p.cle, libelle: p.libelle, type: "ajoutee", detail: "position ajoutée par l'entreprise" });
  return ecarts;
}
