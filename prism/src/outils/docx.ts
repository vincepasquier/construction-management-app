// Écriture d'un document Word (.docx) minimal : titres, paragraphes, listes, tableaux et cases à
// cocher. Suffit aux documents de gouvernance (mandat, rapports, relevés de décisions) sans
// dépendre d'une bibliothèque : un .docx est une archive ZIP de fichiers XML.
import { strToU8, zipSync } from "fflate";

export type Bloc =
  | { type: "titre"; texte: string }
  | { type: "sousTitre"; texte: string }
  | { type: "paragraphe"; texte: string; gras?: boolean; italique?: boolean }
  | { type: "liste"; elements: string[] }
  | { type: "cases"; elements: { libelle: string; coche: boolean }[] }
  | { type: "tableau"; entetes?: string[]; lignes: string[][]; largeurs?: number[] }
  | { type: "champs"; lignes: [string, string][] }
  | { type: "sautDePage" };

// Les caractères de contrôle sont interdits en XML : ils sont retirés du texte
// eslint-disable-next-line no-control-regex
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

/** Texte avec retours à la ligne, en une suite de « runs » Word */
function runs(texte: string, o: { gras?: boolean; italique?: boolean; couleur?: string; taille?: number } = {}): string {
  const proprietes = `${o.gras ? "<w:b/>" : ""}${o.italique ? "<w:i/>" : ""}${o.couleur ? `<w:color w:val="${o.couleur}"/>` : ""}${o.taille ? `<w:sz w:val="${o.taille}"/>` : ""}`;
  const rPr = proprietes ? `<w:rPr>${proprietes}</w:rPr>` : "";
  return String(texte ?? "").split("\n").map((ligne, i) => `<w:r>${rPr}${i ? "<w:br/>" : ""}<w:t xml:space="preserve">${echapper(ligne)}</w:t></w:r>`).join("");
}

const paragraphe = (contenu: string, style?: string, extra = "") => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${contenu}</w:p>`;

const BORDURES = `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFC5CE"/>`).join("")}</w:tblBorders>`;
const LARGEUR_PAGE = 9070; // A4 moins les marges, en vingtièmes de point

function tableau(entetes: string[] | undefined, lignes: string[][], largeurs?: number[]): string {
  const n = Math.max(entetes?.length ?? 0, ...lignes.map((l) => l.length), 1);
  const somme = (largeurs ?? []).reduce((s, x) => s + x, 0);
  const cols = Array.from({ length: n }, (_, i) => Math.round(largeurs && somme ? (LARGEUR_PAGE * largeurs[i]) / somme : LARGEUR_PAGE / n));
  const cellule = (texte: string, i: number, entete: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${cols[i]}" w:type="dxa"/>${entete ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF1F5"/>' : ""}</w:tcPr>${paragraphe(runs(texte ?? "", { gras: entete, taille: 19 }), undefined, '<w:spacing w:before="40" w:after="40"/>')}</w:tc>`;
  const rangee = (cellules: string[], entete: boolean) => `<w:tr><w:trPr><w:cantSplit/>${entete ? "<w:tblHeader/>" : ""}</w:trPr>${Array.from({ length: n }, (_, i) => cellule(cellules[i] ?? "", i, entete)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${LARGEUR_PAGE}" w:type="dxa"/>${BORDURES}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + `<w:tblGrid>${cols.map((c) => `<w:gridCol w:w="${c}"/>`).join("")}</w:tblGrid>${entetes ? rangee(entetes, true) : ""}${lignes.map((l) => rangee(l, false)).join("")}</w:tbl>${paragraphe("")}`;
}

function corps(blocs: Bloc[]): string {
  return blocs.map((b) => {
    switch (b.type) {
      case "titre": return paragraphe(runs(b.texte), "Titre");
      case "sousTitre": return paragraphe(runs(b.texte), "Titre1");
      case "paragraphe": return paragraphe(runs(b.texte || "—", { gras: b.gras, italique: b.italique }));
      case "liste": return b.elements.map((e) => paragraphe(runs(`•  ${e}`), undefined, '<w:ind w:left="340" w:hanging="340"/>')).join("");
      case "cases": return b.elements.map((e) => paragraphe(runs(`${e.coche ? "☒" : "☐"}  ${e.libelle}`))).join("");
      case "tableau": return tableau(b.entetes, b.lignes, b.largeurs);
      case "champs": return tableau(undefined, b.lignes.map(([a, v]) => [a, v || "—"]), [1, 2.2]);
      case "sautDePage": return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    }
  }).join("");
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:lang w:val="fr-CH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Titre"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1F3A5F"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Titre1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="1F3A5F"/></w:rPr></w:style>
</w:styles>`;

export interface OptionsDocx {
  /** Texte du pied de page, à gauche du numéro de page */
  pied?: string;
}

/** Construit le fichier .docx */
export function creerDocx(blocs: Bloc[], o: OptionsDocx = {}): Uint8Array {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const champPage = '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
  const pied = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${LARGEUR_PAGE}"/></w:tabs></w:pPr>${runs(o.pied ?? "", { taille: 16, couleur: "6B7280" })}<w:r><w:tab/></w:r>${champPage}</w:p></w:ftr>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${corps(blocs)}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1247" w:left="1418" w:header="709" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    "word/_rels/document.xml.rels": strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'),
    "word/document.xml": strToU8(document),
    "word/styles.xml": strToU8(STYLES),
    "word/footer1.xml": strToU8(pied),
  });
}

export const TYPE_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
