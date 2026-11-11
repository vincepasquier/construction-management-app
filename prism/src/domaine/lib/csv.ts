/** Génère un CSV compatible Excel (séparateur « ; », BOM UTF-8) et le télécharge */
export function telechargerCSV(nom: string, entetes: string[], lignes: (string | number)[][]) {
  const echapper = (v: string | number) => {
    const s = typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : v;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [entetes, ...lignes].map((l) => l.map(echapper).join(";")).join("\r\n");
  telecharger(`${nom}.csv`, "﻿" + contenu, "text/csv;charset=utf-8");
}

export function telecharger(nomFichier: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(url);
}
