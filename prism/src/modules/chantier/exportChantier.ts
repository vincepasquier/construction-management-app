// Documents Word du suivi de chantier : journal du mois, constat, liste des réserves, bon de régie.
import { acompteSituation, effectifTotal, garantieDepuis, reserveOuverte, retardReserve, totalLigneRegie, totalRegie, totalRegieParType, type Situation } from "@/domaine/lib/chantier";
import { aujourdhui, formatCHFPrecis, formatDate, moisEnClair } from "@/domaine/lib/format";
import { MENTION_SIA, sia } from "@/domaine/lib/sia118";
import type { Contrat, Projet } from "@/domaine/types";
import type { Constat, EntreeJournalChantier, Reception, Regie, Reserve } from "@/domaine/types-chantier";
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
  blocs.push({ type: "paragraphe", texte: `Les défauts ci-dessus sont à éliminer dans le délai indiqué pour chacun (${sia("defautsMineurs")}). L'entreprise annonce la levée de chaque réserve ; la levée est constatée sur place par la direction des travaux.` });
  blocs.push({ type: "paragraphe", italique: true, texte: MENTION_SIA });
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
    { type: "paragraphe", texte: `Travaux en régie au sens de la ${sia("regie")} : exécutés sur ordre de la direction des travaux et rapportés au jour le jour. La signature du bon reconnaît les heures et les quantités ; elle ne vaut pas reconnaissance du bien-fondé de la régie.` },
    { type: "paragraphe", italique: true, texte: MENTION_SIA },
  ];
}
export const exporterRegie = (projet: Projet, r: Regie, o: { contrat?: string }) => telechargerDocx(nomFichier(`${projet.code}-regie-${r.numero}`), blocsRegie(projet, r, o), pied(projet));

// ----------------------------------------------------------------------------------- Réception

const SIGNATURES_RECEPTION: Bloc = { type: "tableau", entetes: ["Maître de l'ouvrage", "Direction des travaux", "Entrepreneur"], lignes: [["\n\n\nLieu, date et signature", "\n\n\nLieu, date et signature", "\n\n\nLieu, date et signature"]], largeurs: [1, 1, 1] };

/**
 * Procès-verbal de réception, dans l'ordre de la SIA 118 : vérification commune, résultat (sans
 * défaut, défauts mineurs, défauts majeurs), délais qui en découlent, sûreté, signatures.
 * Les réserves « bloquantes » sont les défauts majeurs ; les autres sont des défauts mineurs.
 */
export function blocsReception(projet: Projet, x: Reception, reserves: Reserve[], o: { contrat?: string; entreprise?: string; nomEntreprise: (id?: string) => string }): Bloc[] {
  const recue = x.resultat !== "Refusée";
  const majeurs = reserves.filter((r) => r.gravite === "Bloquante" && reserveOuverte(r));
  const mineurs = reserves.filter((r) => !(r.gravite === "Bloquante" && reserveOuverte(r)));
  const garantie = garantieDepuis(x.debutGarantie || x.date);
  const tableau = (liste: Reserve[]): Bloc => ({
    type: "tableau", entetes: ["N°", "Défaut et localisation", "Entreprise", "À éliminer jusqu'au", "État"], largeurs: [0.8, 3.6, 1.6, 1.3, 1.1],
    lignes: liste.sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true })).map((r) => [r.numero, `${r.libelle}${r.localisation ? `\n${r.localisation}` : ""}${r.description ? `\n${r.description}` : ""}`, o.nomEntreprise(r.entrepriseId), r.delai ? formatDate(r.delai) : "", r.statut === "Levée" && r.dateLevee ? `Levée le ${formatDate(r.dateLevee)}` : r.statut]),
  });
  const blocs: Bloc[] = [
    { type: "titre", texte: `Procès-verbal de réception ${x.type === "Finale" ? "de l'ouvrage" : "partielle"}` },
    { type: "champs", lignes: [entete(projet), ["Maître de l'ouvrage", projet.maitreOuvrage ?? ""], ["Ouvrage ou partie d'ouvrage", x.objet], ["Contrat", o.contrat ?? ""], ["Entrepreneur", o.entreprise ?? ""], ["Lieu", x.lieu ?? projet.lieu ?? ""], ["Avis d'achèvement", x.avisAchevement ? formatDate(x.avisAchevement) : ""], ["Vérification commune", formatDate(x.date)], ["Participants", x.participants ?? ""]] },
    { type: "sousTitre", texte: "1. Vérification commune" },
    { type: "paragraphe", texte: `À la suite de l'avis d'achèvement de l'entrepreneur, les parties ont vérifié ensemble l'ouvrage désigné ci-dessus (${sia("verification")}). ${x.type === "Partielle" ? "La réception porte sur une partie d'ouvrage formant un tout (" + sia("reception") + ")." : "La réception porte sur l'ensemble de l'ouvrage."}` },
    { type: "sousTitre", texte: "2. Résultat" },
    { type: "cases", elements: [
      { libelle: `Aucun défaut constaté : l'ouvrage est reçu à l'issue de la vérification (${sia("sansDefaut")})`, coche: x.resultat === "Acceptée" },
      { libelle: `Défauts mineurs : l'ouvrage est reçu ; les défauts sont éliminés dans les délais fixés ci-dessous (${sia("defautsMineurs")})`, coche: x.resultat === "Acceptée avec réserves" },
      { libelle: `Défauts majeurs : la réception est différée jusqu'à leur élimination et à une nouvelle vérification commune (${sia("defautsMajeurs")})`, coche: x.resultat === "Refusée" },
    ] },
  ];
  if (mineurs.length) { blocs.push({ type: "paragraphe", gras: true, texte: `Défauts mineurs (${mineurs.length})` }); blocs.push(tableau(mineurs)); }
  if (majeurs.length) { blocs.push({ type: "paragraphe", gras: true, texte: `Défauts majeurs (${majeurs.length})` }); blocs.push(tableau(majeurs)); }
  if (!reserves.length) blocs.push({ type: "paragraphe", texte: "Aucun défaut n'a été relevé." });
  blocs.push({ type: "sousTitre", texte: "3. Effets de la réception" });
  if (recue) {
    blocs.push({ type: "champs", lignes: [
      ["Ouvrage reçu le", formatDate(x.debutGarantie || x.date)],
      [`Délai de dénonciation des défauts (${sia("denonciation")})`, `jusqu'au ${formatDate(x.finGarantie || garantie.finGarantie)}`],
      [`Prescription des droits du maître (${sia("prescription")})`, formatDate(garantie.prescription)],
      [`Sûreté (${sia("surete")})`, x.surete ?? "selon contrat"],
    ] });
    blocs.push({ type: "paragraphe", texte: `Dès la réception, l'ouvrage passe sous la garde du maître et les délais ci-dessus commencent à courir. Avant l'expiration du délai de dénonciation, chaque partie peut demander une nouvelle vérification commune (${sia("verificationFinale")}). Les défauts découverts après ce délai sont traités selon la ${sia("defautsCaches")}.` });
  } else {
    blocs.push({ type: "paragraphe", texte: `L'ouvrage n'est pas reçu : les délais de dénonciation et de prescription ne courent pas, et l'ouvrage reste sous la garde de l'entrepreneur. ${x.secondeVerification ? `Nouvelle vérification commune prévue le ${formatDate(x.secondeVerification)}.` : "La date de la nouvelle vérification commune reste à fixer."}` });
  }
  if (x.documentsRemis) { blocs.push({ type: "sousTitre", texte: "4. Documents remis" }); blocs.push({ type: "liste", elements: x.documentsRemis.split(/\n|;/).map((l) => l.trim()).filter(Boolean) }); }
  if (x.remarques) { blocs.push({ type: "sousTitre", texte: x.documentsRemis ? "5. Remarques" : "4. Remarques" }); blocs.push({ type: "paragraphe", texte: x.remarques }); }
  blocs.push({ type: "sousTitre", texte: "Signatures" });
  blocs.push(SIGNATURES_RECEPTION);
  blocs.push({ type: "paragraphe", italique: true, texte: MENTION_SIA });
  return blocs;
}
export const exporterReception = (projet: Projet, x: Reception, reserves: Reserve[], o: { contrat?: string; entreprise?: string; nomEntreprise: (id?: string) => string }) =>
  telechargerDocx(nomFichier(`${projet.code}-reception-${x.date}`), blocsReception(projet, x, reserves, o), pied(projet));

// ----------------------------------------------------------------------- Situation et acompte

const nombre = (v: number) => (Math.round(v * 1000) / 1000).toLocaleString("fr-CH");
const sansUnite = (v: number) => formatCHFPrecis(v).replace(/\s?CHF/, "").trim();

/** Situation mensuelle d'un contrat : métré contradictoire par position, puis calcul de l'acompte */
export function blocsSituation(projet: Projet, contrat: Contrat, s: Situation, periode: string, o: { entreprise?: string }): Bloc[] {
  const a = acompteSituation(s, contrat.retenuePct, projet.tauxTVA);
  return [
    { type: "titre", texte: `Situation de ${moisEnClair(periode)}` },
    { type: "champs", lignes: [entete(projet), ["Contrat", `${contrat.numero} – ${contrat.objet}`], ["Entrepreneur", o.entreprise ?? ""], ["Période", moisEnClair(periode)]] },
    { type: "sousTitre", texte: "1. Métré" },
    { type: "paragraphe", texte: `Quantités relevées en commun par la direction des travaux et l'entrepreneur (${sia("metre")}). Les relevés contestés figurent au métré mais n'entrent pas dans les montants.` },
    // Montants sans l'unité monétaire, donnée une fois sous le tableau : les colonnes restent lisibles en portrait
    { type: "tableau", entetes: ["Position", "Désignation", "Un.", "Prix unit.", "Ant.", "Mois", "Cumul", "Montant du mois", "Montant cumulé"], largeurs: [1.5, 2.2, 0.7, 1.35, 0.9, 0.85, 0.9, 1.3, 1.4],
      lignes: [
        ...s.lignes.map((l) => [l.position, l.libelle + (l.metres.some((m) => m.statut === "Contesté") ? "\n(relevé contesté ce mois)" : ""), l.unite, sansUnite(l.prixUnitaire), nombre(l.anterieur), nombre(l.periode), nombre(l.cumul), sansUnite(l.montantPeriode), sansUnite(l.montantCumul)]),
        ["", "Total", "", "", "", "", "", sansUnite(s.montantPeriode), sansUnite(s.montantCumul)],
      ] },
    { type: "paragraphe", italique: true, texte: "Prix et montants en CHF, hors TVA. Ant. : quantité des périodes antérieures." },
    { type: "sousTitre", texte: "2. Acompte demandé" },
    { type: "tableau", largeurs: [4, 1.5],
      lignes: [
        ["Prestations cumulées à la fin de la période", formatCHFPrecis(a.cumul)],
        [`./. Retenue de ${contrat.retenuePct} % (${sia("retenue")})`, formatCHFPrecis(-a.retenue)],
        ["Cumul après retenue", formatCHFPrecis(a.netCumul)],
        ["./. Acomptes des périodes antérieures", formatCHFPrecis(-a.anterieurNet)],
        ["Acompte de la période, hors TVA", formatCHFPrecis(a.acompteHT)],
        [`TVA ${String(projet.tauxTVA).replace(".", ",")} %`, formatCHFPrecis(a.tva)],
        ["Acompte de la période, TVA comprise", formatCHFPrecis(a.acompteTTC)],
      ] },
    { type: "paragraphe", texte: `Acompte au sens de la ${sia("acomptes")}. La retenue est libérée selon le contrat, au plus tard avec le décompte final (${sia("decompteFinal")}) et contre remise de la sûreté (${sia("surete")}).${s.conteste ? ` Relevés contestés ce mois, hors montants : ${formatCHFPrecis(s.conteste)}.` : ""}` },
    { type: "sousTitre", texte: "Signatures" },
    { type: "tableau", entetes: ["Direction des travaux", "Entrepreneur"], lignes: [["\n\n\nDate et signature", "\n\n\nDate et signature"]], largeurs: [1, 1] },
    { type: "paragraphe", italique: true, texte: MENTION_SIA },
  ];
}
export const exporterSituation = (projet: Projet, contrat: Contrat, s: Situation, periode: string, o: { entreprise?: string }) =>
  telechargerDocx(nomFichier(`${projet.code}-situation-${contrat.numero}-${periode}`), blocsSituation(projet, contrat, s, periode, o), pied(projet));
