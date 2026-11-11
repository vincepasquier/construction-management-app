// Documents Word des contrats : contrat d'entreprise, de mandat ou de fourniture, et avenant.
// La structure suit la SIA 118 (éléments du contrat, prix, délais, paiements, réception, défauts) ;
// le texte est propre à PRISM et renvoie à la norme sans la reproduire.
import { montantContrat } from "@/domaine/lib/finance";
import { aujourdhui, formatCHFPrecis, formatDate } from "@/domaine/lib/format";
import { MENTION_SIA, sia } from "@/domaine/lib/sia118";
import type { AppelOffres, Avenant, Contrat, Entreprise, Projet } from "@/domaine/types";
import type { Bloc } from "@/outils/docx";
import { nomFichier, telechargerDocx } from "@/outils/telechargement";

const TITRE: Record<Contrat["type"], string> = { "Contrat d'entreprise": "Contrat d'entreprise", Mandat: "Contrat de mandat", Fourniture: "Contrat de fourniture" };
const PARTIE: Record<Contrat["type"], string> = { "Contrat d'entreprise": "Entrepreneur", Mandat: "Mandataire", Fourniture: "Fournisseur" };
const pied = (projet: Projet) => `${projet.code} · édité le ${formatDate(aujourdhui())}`;
const signatures = (c: Contrat): Bloc => ({ type: "tableau", entetes: ["Maître de l'ouvrage", PARTIE[c.type]], lignes: [["\n\n\nLieu, date et signature", "\n\n\nLieu, date et signature"]], largeurs: [1, 1] });
const identite = (e?: Entreprise) => (e ? [e.nom, e.localite, e.ide && `IDE ${e.ide}`].filter(Boolean).join(", ") : "");

/** Pièces du contrat dans l'ordre de priorité : celles qui ont été saisies, sinon la liste usuelle */
export function elementsContrat(c: Contrat, ao?: AppelOffres): string[] {
  const saisis = c.conditions?.elements?.split("\n").map((l) => l.trim()).filter(Boolean);
  if (saisis?.length) return saisis;
  if (c.type === "Mandat") {
    return ["Le présent contrat", "L'offre d'honoraires du mandataire", "Le cahier des charges du mandat", `Le règlement ${c.conditions?.reglement ?? "SIA concernant les prestations et honoraires applicable au métier du mandataire"}`];
  }
  return [
    "Le présent contrat",
    `L'offre de l'entrepreneur${ao ? `, remise dans le cadre de l'appel d'offres ${ao.numero}` : ""}`,
    "Les conditions particulières du maître de l'ouvrage",
    "Le descriptif des prestations et les plans",
    "La norme SIA 118 « Conditions générales pour l'exécution des travaux de construction »",
    "Les autres normes de la SIA et des associations professionnelles applicables aux travaux",
  ];
}

export function blocsContrat(projet: Projet, c: Contrat, o: { entreprise?: Entreprise; lot?: string; ao?: AppelOffres }): Bloc[] {
  const k = c.conditions ?? {};
  const mandat = c.type === "Mandat";
  const tva = projet.tauxTVA ?? 8.1;
  const approuves = c.avenants.filter((a) => a.statut === "Approuvé");
  const blocs: Bloc[] = [
    { type: "titre", texte: `${TITRE[c.type]} ${c.numero}` },
    { type: "champs", lignes: [
      ["Projet", `${projet.code} – ${projet.nom}`], ["Maître de l'ouvrage", projet.maitreOuvrage ?? ""], [PARTIE[c.type], identite(o.entreprise)],
      ...(mandat ? [] : [["Direction des travaux", k.directionTravaux ?? ""] as [string, string]]),
      ["Objet", c.objet], ["Code des frais de construction", c.cfc], ...(o.lot ? [["Lot", o.lot] as [string, string]] : []),
    ] },
    { type: "sousTitre", texte: "1. Objet" },
    { type: "paragraphe", texte: mandat
      ? `Le maître de l'ouvrage confie au mandataire les prestations désignées ci-dessus${k.phases ? `, pour les phases ${k.phases}` : ""}. Le mandataire les exécute avec diligence, dans les règles de l'art.`
      : `Le maître de l'ouvrage confie à l'entrepreneur, qui l'accepte, l'exécution des travaux désignés ci-dessus, conformément aux pièces énumérées au chiffre 2.` },
    { type: "sousTitre", texte: "2. Éléments du contrat et ordre de priorité" },
    { type: "paragraphe", texte: mandat ? "Le contrat se compose des pièces suivantes ; en cas de contradiction, elles s'appliquent dans cet ordre :" : `Le contrat se compose des pièces suivantes ; en cas de contradiction, elles s'appliquent dans cet ordre (${sia("ordrePriorite")}) :` },
    { type: "liste", elements: elementsContrat(c, o.ao) },
    { type: "sousTitre", texte: mandat ? "3. Honoraires" : "3. Prix" },
    { type: "champs", lignes: [
      [mandat ? "Mode de rémunération" : "Nature des prix", k.typePrix ?? (mandat ? "Honoraires selon l'offre" : "Prix unitaires selon le descriptif")],
      ["Montant du contrat, hors TVA", formatCHFPrecis(c.montantInitial)], [`TVA ${String(tva).replace(".", ",")} %`, formatCHFPrecis(c.montantInitial * tva / 100)], ["Montant, TVA comprise", formatCHFPrecis(c.montantInitial * (1 + tva / 100))],
    ] },
  ];
  if (!mandat) blocs.push({ type: "paragraphe", texte: `Les travaux en régie ne sont exécutés que sur ordre de la direction des travaux et font l'objet d'un rapport pour chaque jour (${sia("regie")}).` });

  blocs.push({ type: "sousTitre", texte: "4. Délais" });
  blocs.push({ type: "champs", lignes: [
    [mandat ? "Début des prestations" : "Début des travaux", k.debutTravaux ? formatDate(k.debutTravaux) : "selon programme"],
    [mandat ? "Fin des prestations" : "Achèvement des travaux", k.finTravaux ? formatDate(k.finTravaux) : "selon programme"],
    ...(mandat ? [] : [["Peine conventionnelle", k.peineParJour ? `${formatCHFPrecis(k.peineParJour)} par jour ouvrable de retard${k.peinePlafondPct ? `, au plus ${k.peinePlafondPct} % du montant du contrat` : ""}` : "aucune"] as [string, string]]),
  ] });
  if (!mandat) blocs.push({ type: "paragraphe", texte: `Les délais et leur prolongation sont régis par la ${sia("delais")}.` });

  blocs.push({ type: "sousTitre", texte: "5. Paiements" });
  blocs.push({ type: "champs", lignes: mandat
    ? [["Acomptes", "selon l'avancement des prestations, sur note d'honoraires"], ["Délai de paiement", `${k.delaiPaiementJours ?? 30} jours`]]
    : [
      ["Acomptes", `sur situations mensuelles établies d'après les métrés (${sia("metre")}, ${sia("acomptes").replace("SIA 118, ", "")})`],
      ["Retenue", c.retenuePct ? `${c.retenuePct} % de chaque acompte (${sia("retenue")})` : "aucune"],
      ["Délai de paiement", `${k.delaiPaiementJours ?? 30} jours dès réception de la situation vérifiable`],
      ["Décompte final", `remis après la réception, vérifié par la direction des travaux (${sia("decompteFinal")})`],
    ] });

  if (mandat) {
    blocs.push({ type: "sousTitre", texte: "6. Prestations et responsabilité" });
    blocs.push({ type: "paragraphe", texte: `Les prestations, les droits et les obligations des parties sont ceux du règlement ${k.reglement ?? "SIA applicable"}, dans la mesure où le présent contrat n'y déroge pas.` });
  } else {
    blocs.push({ type: "sousTitre", texte: "6. Réception et défauts" });
    blocs.push({ type: "champs", lignes: [
      ["Réception", `vérification commune après l'avis d'achèvement, constatée par procès-verbal (${sia("reception")})`],
      ["Délai de dénonciation des défauts", `deux ans dès la réception (${sia("denonciation")})`],
      ["Prescription", `cinq ans dès la réception (${sia("prescription")})`],
      ["Sûreté", k.surete && k.surete !== "Aucune" ? `${k.surete}${k.suretePct ? ` de ${k.suretePct} % du montant du décompte final` : ""}, pour la durée du délai de dénonciation (${sia("surete")})` : "aucune"],
    ] });
  }

  blocs.push({ type: "sousTitre", texte: mandat ? "7. Modifications" : "7. Modifications de commande" });
  blocs.push({ type: "paragraphe", texte: mandat ? "Toute modification des prestations ou des honoraires fait l'objet d'un avenant écrit." : `Toute modification de commande fait l'objet d'un avenant écrit, établi avant l'exécution des travaux concernés (${sia("modification")}).` });
  if (c.avenants.length) {
    blocs.push({ type: "tableau", entetes: ["Avenant", "Date", "Objet", "Montant HT", "État"], largeurs: [0.9, 1, 3.4, 1.3, 1],
      lignes: [...c.avenants.map((a) => [a.numero, formatDate(a.date), a.objet, formatCHFPrecis(a.montant), a.statut]), ...(approuves.length ? [["", "", "Montant du contrat, avenants approuvés compris", formatCHFPrecis(montantContrat(c)), ""]] : [])] });
  }
  blocs.push({ type: "sousTitre", texte: "8. Dispositions finales" });
  blocs.push({ type: "paragraphe", texte: `Le droit suisse est applicable. For : ${k.for ?? "au siège du maître de l'ouvrage"}.${c.remarques ? `\n${c.remarques}` : ""}` });
  blocs.push({ type: "paragraphe", texte: `Fait en deux exemplaires${c.dateSignature ? `, le ${formatDate(c.dateSignature)}` : ""}.` });
  blocs.push(signatures(c));
  if (!mandat) blocs.push({ type: "paragraphe", italique: true, texte: MENTION_SIA });
  return blocs;
}
export const exporterContrat = (projet: Projet, c: Contrat, o: { entreprise?: Entreprise; lot?: string; ao?: AppelOffres }) => telechargerDocx(nomFichier(`${projet.code}-contrat-${c.numero}`), blocsContrat(projet, c, o), pied(projet));

/** Avenant : modification de commande, son prix, son effet sur le délai et le nouveau montant du contrat */
export function blocsAvenant(projet: Projet, c: Contrat, a: Avenant, o: { entreprise?: Entreprise }): Bloc[] {
  const anterieurs = c.avenants.filter((x) => x.id !== a.id && x.statut === "Approuvé" && x.date <= a.date);
  const avant = c.montantInitial + anterieurs.reduce((t, x) => t + x.montant, 0);
  const mandat = c.type === "Mandat";
  return [
    { type: "titre", texte: `Avenant ${a.numero} au contrat ${c.numero}` },
    { type: "champs", lignes: [["Projet", `${projet.code} – ${projet.nom}`], ["Maître de l'ouvrage", projet.maitreOuvrage ?? ""], [PARTIE[c.type], identite(o.entreprise)], ["Contrat", `${c.numero} – ${c.objet}`], ["Date de l'avenant", formatDate(a.date)], ["État", a.statut]] },
    { type: "sousTitre", texte: "1. Objet de la modification" },
    { type: "paragraphe", texte: a.objet },
    ...(a.motif ? [{ type: "paragraphe", texte: `Motif : ${a.motif}` } satisfies Bloc] : []),
    ...(mandat ? [] : [{ type: "paragraphe", texte: `Modification de commande au sens de la ${sia("modification")}.` } satisfies Bloc]),
    { type: "sousTitre", texte: "2. Prix" },
    { type: "tableau", largeurs: [4, 1.5], lignes: [
      ["Montant initial du contrat, hors TVA", formatCHFPrecis(c.montantInitial)],
      ...anterieurs.map((x) => [`Avenant ${x.numero} du ${formatDate(x.date)} – ${x.objet}`, formatCHFPrecis(x.montant)]),
      ["Montant du contrat avant le présent avenant", formatCHFPrecis(avant)],
      [`Présent avenant ${a.numero}${a.montant < 0 ? " (moins-value)" : ""}`, formatCHFPrecis(a.montant)],
      ["Nouveau montant du contrat, hors TVA", formatCHFPrecis(avant + a.montant)],
    ] },
    { type: "sousTitre", texte: "3. Délais" },
    { type: "paragraphe", texte: a.incidenceDelaiJours ? `Le délai d'achèvement est ${a.incidenceDelaiJours > 0 ? "prolongé" : "réduit"} de ${Math.abs(a.incidenceDelaiJours)} jour(s) ouvrable(s).` : "Le présent avenant est sans effet sur les délais contractuels." },
    { type: "sousTitre", texte: "4. Autres dispositions" },
    { type: "paragraphe", texte: "Les autres dispositions du contrat restent inchangées et s'appliquent au présent avenant." },
    signatures(c),
    ...(mandat ? [] : [{ type: "paragraphe", italique: true, texte: MENTION_SIA } satisfies Bloc]),
  ];
}
export const exporterAvenant = (projet: Projet, c: Contrat, a: Avenant, o: { entreprise?: Entreprise }) => telechargerDocx(nomFichier(`${projet.code}-avenant-${c.numero}-${a.numero}`), blocsAvenant(projet, c, a, o), pied(projet));
