// Écriture d'un classeur Excel minimal (.xlsx) : texte, nombres et dates, en-têtes en gras.
import { strToU8, zipSync } from "fflate";

export type Cellule = string | number | boolean | Date | null | undefined;

export interface Feuille {
  nom: string;
  lignes: Cellule[][];
  /** Largeur des colonnes, en caractères */
  largeurs?: number[];
  /** Colonnes (index) affichées en montant avec séparateur de milliers */
  montants?: number[];
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function lettre(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Numéro de série Excel d'une date (jours depuis le 30.12.1899) */
const serie = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000 + 25569) * 1000) / 1000;

function feuilleXml(f: Feuille): string {
  const montants = new Set(f.montants ?? []);
  const lignes = f.lignes.map((ligne, r) => {
    const cellules = ligne.map((v, c) => {
      const ref = `${lettre(c)}${r + 1}`;
      const entete = r === 0;
      if (v === null || v === undefined || v === "") return "";
      if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${entete ? 1 : montants.has(c) ? 2 : 0}"><v>${v}</v></c>`;
      if (v instanceof Date) return `<c r="${ref}" s="3"><v>${serie(v)}</v></c>`;
      const texte = typeof v === "boolean" ? (v ? "oui" : "non") : String(v);
      return `<c r="${ref}" t="inlineStr"${entete ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(texte)}</t></is></c>`;
    }).join("");
    return `<row r="${r + 1}">${cellules}</row>`;
  }).join("");
  const cols = f.largeurs?.length
    ? `<cols>${f.largeurs.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${lignes}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`;

/** Nom de feuille accepté par Excel : 31 caractères, sans \ / ? * [ ] : */
const nomFeuille = (s: string, i: number) => (s.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || `Feuille ${i + 1}`);

export function ecrireXlsx(feuilles: Feuille[]): Uint8Array {
  const fichiers: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${feuilles.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${feuilles.map((f, i) => `<sheet name="${xml(nomFeuille(f.nom, i))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${feuilles.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${feuilles.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(STYLES),
  };
  feuilles.forEach((f, i) => { fichiers[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(feuilleXml(f)); });
  return zipSync(fichiers, { level: 6 });
}
