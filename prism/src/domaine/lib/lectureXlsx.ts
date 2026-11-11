// Lecteur Excel minimal (secours) : certains exports (Planner, Power BI) produisent des cellules sans adresse
// que les bibliothèques usuelles refusent. Lit toutes les feuilles en valeurs (texte, nombres, dates).
import { strFromU8, unzipSync } from "fflate";

const entites = (s: string) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, "&");

const attr = (balise: string, nom: string) => balise.match(new RegExp(`\\b${nom}="([^"]*)"`))?.[1];
/** Texte d'un élément riche (<si>, <is>) : concaténation des <t> */
const texte = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => entites(m[1])).join("");

const colonne = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const FORMATS_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

export function lireXlsx(octets: Uint8Array): { sheet: string; data: unknown[][] }[] {
  const fichiers = unzipSync(octets);
  const lire = (chemin: string) => (fichiers[chemin] ? strFromU8(fichiers[chemin]) : "");

  const partages = [...lire("xl/sharedStrings.xml").matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => texte(m[1]));

  // Styles : quels index de style sont des dates
  const styles = lire("xl/styles.xml");
  const formatsPerso = new Map<number, string>();
  for (const m of styles.matchAll(/<(?:\w+:)?numFmt\s[^>]*>/g)) formatsPerso.set(Number(attr(m[0], "numFmtId")), attr(m[0], "formatCode") ?? "");
  const xfs = styles.match(/<(?:\w+:)?cellXfs[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/)?.[1] ?? "";
  const styleDate = [...xfs.matchAll(/<(?:\w+:)?xf\s[^>]*?\/?>/g)].map((m) => {
    const id = Number(attr(m[0], "numFmtId") ?? 0);
    const code = formatsPerso.get(id) ?? "";
    // Format personnalisé : date s'il contient j/m/a/h hors texte littéral et sans motif numérique (#, 0…)
    const nu = code.replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, "");
    return FORMATS_DATE.has(id) || (/[dmyh]/i.test(nu) && !/[#0?]/.test(nu) && !/general/i.test(nu));
  });

  // Feuilles : nom → fichier via les relations du classeur
  const rels = new Map<string, string>();
  for (const m of lire("xl/_rels/workbook.xml.rels").matchAll(/<(?:\w+:)?Relationship\s[^>]*>/g)) {
    const cible = attr(m[0], "Target") ?? "";
    rels.set(attr(m[0], "Id") ?? "", cible.startsWith("/") ? cible.slice(1) : `xl/${cible}`);
  }
  const feuilles = [...lire("xl/workbook.xml").matchAll(/<(?:\w+:)?sheet\s[^>]*>/g)].map((m) => ({
    nom: entites(attr(m[0], "name") ?? ""),
    chemin: rels.get(attr(m[0], "r:id") ?? "") ?? "",
  }));

  return feuilles.map(({ nom, chemin }) => {
    const xml = lire(chemin);
    const data: unknown[][] = [];
    for (const r of xml.matchAll(/<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
      const numero = Number(attr(r[1], "r") ?? data.length + 1) - 1;
      const ligne: unknown[] = [];
      let i = 0;
      for (const c of (r[2] ?? "").matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        const ref = attr(c[1], "r");
        if (ref) i = colonne(ref);
        const t = attr(c[1], "t");
        const s = Number(attr(c[1], "s") ?? 0);
        const contenu = c[2] ?? "";
        const v = contenu.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
        let valeur: unknown = null;
        if (t === "s" && v !== undefined) valeur = partages[Number(v)] ?? "";
        else if (t === "inlineStr") valeur = texte(contenu);
        else if (t === "str" || t === "e") valeur = v !== undefined ? entites(v) : null;
        else if (t === "b") valeur = v === "1";
        else if (v !== undefined) {
          const n = Number(v);
          valeur = styleDate[s] && Number.isFinite(n) ? new Date(Math.round((n - 25569) * 86_400_000)) : n;
        }
        ligne[i] = valeur;
        i++;
      }
      data[numero] = Array.from(ligne, (x) => (x === undefined ? null : x));
    }
    return { sheet: nom, data: Array.from(data, (x) => x ?? []) };
  });
}
