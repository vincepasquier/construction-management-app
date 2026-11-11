// Documents Word du suivi de chantier : journal du mois, constat, liste des réserves, bon de régie.
import { effectifTotal, retardReserve, totalLigneRegie, totalRegie, totalRegieParType } from "@/domaine/lib/chantier";
import { aujourdhui, formatCHFPrecis, formatDate, moisEnClair } from "@/domaine/lib/format";
import type { Projet } from "@/domaine/types";
import type { Constat, EntreeJournalChantier, Regie, Reserve } from "@/domaine/types-chantier";
import type { Bloc } from "@/outils/docx";
import { nomFichier, telechargerDocx } from "@/outils/telechargement";

const entete = (projet: Projet): [string, string] => ["Projet", `${projet.code} – ${projet.nom}`];
const pied = (projet: Projet) => `${projet.code} · édité le ${formatDate(aujourdhui())}`;

export function blocsJournal(projet: Projet, entrees: EntreeJournalChantier[], mois: string): Bloc[] {
  const blocs: Bloc[] = [
    { type: "titre", texte: `Journal de chantier – ${moisEnClair(mois)}` },
    { type: "champs", lignes: [entete(projet), ["Journées saisies", String(entrees.length)]] },
  ];
  for (const e of [...entrees].sort((a, b) => a.date.localeCompare(b.date))) {
    blocs.push({ type: "sousTitre", texte: `${formatDate(e.date)} · ${e.meteo}${e.temperature !== undefined ? `, ${e.temperature} °C` : ""}${e.verrouillee ? "" : " (journée non verrouillée)"}` });
    if (e.effectifs.length) blocs.push({ type: "tableau", entetes: ["Entreprise", "Personnes", "Remarque"], largeurs: [3, 1, 3], lignes: [...e.effectifs.map((x) => [x.entreprise, String(x.personnes), x.remarque ?? ""]), ["Total", String(effectifTotal(e)), ""]] });
    blocs.push({ type: "paragraphe", texte: e.travaux || "Travaux non décrits." });
    if (e.evenements.length) blocs.push({ type: "liste", elements: e.evenements.map((x) => `${x.type} : ${x.texte}`) });
    if (e.photos.length) blocs.push({ type: "paragraphe", italique: true, texte: `${e.photos.length} photographie(s) conservée(s) dans PRISM.` });
  }
  return blocs;
}
export const exporterJournal = (projet: Projet, entrees: EntreeJournalChantier[], mois: string) => telechargerDocx(nomFichier(`${projet.code}-journal-${mois}`), blocsJournal(projet, entrees, mois), pied(projet));

export function blocsConstat(projet: Projet, c: Constat, o: { entreprise?: string; lot?: string; auteur?: string }): Bloc[] {
  const blocs: Bloc[] = [
    { type: "titre", texte: `Constat ${c.numero}` },
    { type: "champs", lignes: [entete(projet), ["Date", formatDate(c.date)], ["Type", c.type], ["Objet", c.titre], ["Localisation", c.localisation ?? ""], ["Lot", o.lot ?? ""], ["Entreprise concernée", o.entreprise ?? ""], ["Parties présentes", c.partiesPresentes ?? ""], ["Dressé par", o.auteur ?? ""]] },
    { type: "sousTitre", texte: "Faits constatés" },
    { type: "paragraphe", texte: c.description || "—" },
  ];
  if (c.photos.length) {
    blocs.push({ type: "sousTitre", texte: "Photographies" });
    blocs.push({ type: "liste", elements: c.photos.map((p, i) => `Photo ${i + 1}${p.legende ? ` : ${p.legende}` : ""}`) });
    blocs.push({ type: "paragraphe", italique: true, texte: "Les photographies sont conservées dans PRISM, attachées à ce constat." });
  }
  blocs.push({ type: "sousTitre", texte: "Signatures" });
  blocs.push({ type: "tableau", entetes: ["Direction des travaux", "Entreprise"], lignes: [["\n\n\nDate et signature", "\n\n\nDate et signature"]], largeurs: [1, 1] });
  return blocs;
}
export const exporterConstat = (projet: Projet, c: Constat, o: { entreprise?: string; lot?: string; auteur?: string }) => telechargerDocx(nomFichier(`${projet.code}-constat-${c.numero}`), blocsConstat(projet, c, o), pied(projet));

export function blocsReserves(projet: Projet, reserves: Reserve[], o: { nomEntreprise: (id?: string) => string; nomLot: (id?: string) => string }, jour = aujourdhui()): Bloc[] {
  const blocs: Bloc[] = [
    { type: "titre", texte: "Liste des réserves ouvertes" },
    { type: "champs", lignes: [entete(projet), ["État au", formatDate(jour)], ["Réserves ouvertes", String(reserves.length)]] },
  ];
  const groupes = new Map<string, Reserve[]>();
  for (const r of reserves) { const cle = o.nomEntreprise(r.entrepriseId) || "Entreprise non désignée"; groupes.set(cle, [...(groupes.get(cle) ?? []), r]); }
  for (const [entreprise, liste] of [...groupes].sort((a, b) => a[0].localeCompare(b[0], "fr"))) {
    blocs.push({ type: "sousTitre", texte: `${entreprise} – ${liste.length} réserve(s)` });
    blocs.push({
      type: "tableau", entetes: ["N°", "Défaut et localisation", "Gravité", "État", "Délai"], largeurs: [0.8, 4, 1, 1.2, 1.2],
      lignes: liste.sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true })).map((r) => [
        r.numero, `${r.libelle}${r.localisation ? `\n${r.localisation}` : ""}${r.description ? `\n${r.description}` : ""}`, r.gravite, r.statut,
        r.delai ? `${formatDate(r.delai)}${retardReserve(r, jour) > 0 ? `\n${retardReserve(r, jour)} j de retard` : ""}` : "",
      ]),
    });
  }
  blocs.push({ type: "paragraphe", italique: true, texte: "L'entreprise annonce la levée de chaque réserve ; la levée est constatée sur place par la direction des travaux." });
  return blocs;
}
export const exporterReserves = (projet: Projet, reserves: Reserve[], o: { nomEntreprise: (id?: string) => string; nomLot: (id?: string) => string }) => telechargerDocx(nomFichier(`${projet.code}-reserves-ouvertes`), blocsReserves(projet, reserves, o), pied(projet));

export function blocsRegie(projet: Projet, r: Regie, o: { contrat?: string }): Bloc[] {
  const parType = Object.entries(totalRegieParType(r));
  return [
    { type: "titre", texte: `Bon de régie ${r.numero}` },
    { type: "champs", lignes: [entete(projet), ["Contrat", o.contrat ?? ""], ["Date des travaux", formatDate(r.date)], ["Travaux", r.objet], ["État", r.statut + (r.dateValidation ? ` le ${formatDate(r.dateValidation)}` : "")]] },
    { type: "tableau", entetes: ["Type", "Désignation", "Quantité", "Unité", "Prix unit.", "Total CHF"], largeurs: [1.4, 3, 0.9, 0.7, 1, 1.2],
      lignes: [
        ...r.lignes.map((l) => [l.type, l.libelle, String(l.quantite).replace(".", ","), l.unite, formatCHFPrecis(l.prixUnitaire), formatCHFPrecis(totalLigneRegie(l))]),
        ...(parType.length > 1 ? parType.map(([t, v]) => ["", `Sous-total ${t.toLowerCase()}`, "", "", "", formatCHFPrecis(v)]) : []),
        ["", "Total HT", "", "", "", formatCHFPrecis(totalRegie(r))],
      ] },
    ...(r.remarques ? [{ type: "paragraphe", texte: r.remarques } satisfies Bloc] : []),
    { type: "sousTitre", texte: "Signatures" },
    { type: "tableau", entetes: ["Direction des travaux", "Entreprise"], lignes: [["\n\n\nDate et signature", "\n\n\nDate et signature"]], largeurs: [1, 1] },
    { type: "paragraphe", italique: true, texte: "La signature du bon reconnaît les quantités ; elle ne vaut pas reconnaissance du bien-fondé de la régie." },
  ];
}
export const exporterRegie = (projet: Projet, r: Regie, o: { contrat?: string }) => telechargerDocx(nomFichier(`${projet.code}-regie-${r.numero}`), blocsRegie(projet, r, o), pied(projet));
