/**
 * Lecture d'un CSV (export Excel, SharePoint, Power BI) : séparateur détecté (« ; », « , » ou tabulation),
 * champs entre guillemets sur plusieurs lignes, guillemets doublés.
 */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "");
  const premiere = t.slice(0, t.search(/\r?\n/) >>> 0 || t.length);
  const sep = [";", "\t", ","].map((s) => ({ s, n: premiere.split(s).length })).sort((a, b) => b.n - a.n)[0].s;
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      ligne.push(champ); champ = "";
      lignes.push(ligne); ligne = [];
    } else champ += c;
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ""));
}

/** Lit un fichier Excel (première feuille, ou toutes) ou CSV en tableau de lignes */
export async function lireTableau(f: File): Promise<{ sheet: string; data: unknown[][] }[]> {
  const nom = f.name.toLowerCase();
  if (nom.endsWith(".csv") || nom.endsWith(".txt")) return [{ sheet: f.name, data: lireCsv(await f.text()) }];
  if (nom.endsWith(".xlsx") || nom.endsWith(".xlsm")) {
    try {
      const { default: lireExcel } = await import("read-excel-file/browser");
      return (await lireExcel(f)) as { sheet: string; data: unknown[][] }[];
    } catch {
      // Exports sans adresses de cellules (Planner…) : lecteur de secours
      const { lireXlsx } = await import("./lectureXlsx");
      return lireXlsx(new Uint8Array(await f.arrayBuffer()));
    }
  }
  throw new Error("Format non pris en charge : utilisez un fichier Excel (.xlsx, .xlsm) ou CSV.");
}
