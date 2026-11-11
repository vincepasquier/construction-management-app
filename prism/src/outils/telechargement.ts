// Téléchargement de fichiers produits par l'application.
import { ecrireXlsx, type Feuille } from "./xlsx";

export function telechargerBlob(nom: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function telechargerXlsx(nom: string, feuilles: Feuille[]): void {
  telechargerBlob(nom.endsWith(".xlsx") ? nom : `${nom}.xlsx`, new Blob([ecrireXlsx(feuilles) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export function telechargerJson(nom: string, contenu: unknown): void {
  telechargerBlob(nom, new Blob([JSON.stringify(contenu, null, 1)], { type: "application/json" }));
}

/** Nom de fichier sans caractères gênants */
export const nomFichier = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
