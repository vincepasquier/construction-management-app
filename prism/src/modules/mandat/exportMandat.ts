// Mise en page du mandat de projet pour l'export Word, dans l'ordre des rubriques du modèle du groupe.
import { formatCHF, formatDate } from "@/domaine/lib/format";
import { MOTIFS } from "@/domaine/socle/mandat";
import type { Mandat } from "@/domaine/socle/types";
import type { Bloc } from "@/outils/docx";

export function blocsMandat(m: Mandat, code: string): Bloc[] {
  const c = m.contenu;
  const signature = (role: string) => {
    const s = m.signatures.find((x) => x.role === role);
    return s ? `${s.nom ?? ""}${s.date ? `\nSigné le ${formatDate(s.date)}` : "\nSignature attendue"}` : "—";
  };
  return [
    { type: "titre", texte: "Mandat de projet" },
    { type: "champs", lignes: [
      ["Nom du projet (n° si existant)", c.nomProjet], ["Code", code], ["Auteur du document", c.auteur],
      ["Version et date du document", `${m.version} – ${formatDate(m.dateSoumission ?? m.dateCreation)} (${m.statut})`], ["Portefeuille de projet", c.portefeuille],
    ] },
    { type: "sousTitre", texte: "Parties prenantes" },
    { type: "champs", lignes: [["Commanditaire / sponsor", c.commanditaire], ["Chef de projet", c.chefProjet], ["Client", c.client], ["Autres parties prenantes", c.autresParties]] },
    { type: "sousTitre", texte: "Motif(s) du projet" },
    { type: "cases", elements: MOTIFS.map((x) => ({ libelle: x.libelle, coche: c.motifs[x.cle] })) },
    { type: "sousTitre", texte: "Contexte" }, { type: "paragraphe", texte: c.contexte },
    { type: "sousTitre", texte: "Bénéfices attendus" }, { type: "paragraphe", texte: c.benefices },
    { type: "sousTitre", texte: "Objectifs du projet" },
    { type: "tableau", entetes: ["Objectif", "Critère de succès", "Responsabilité d'approbation"], lignes: c.objectifs.map((o) => [o.objectif, o.critere, o.approbateur]), largeurs: [2, 3, 1.6] },
    ...(c.perimetre || c.exclusions ? [{ type: "sousTitre", texte: "Périmètre" } as Bloc, { type: "champs", lignes: [["Dans le périmètre", c.perimetre], ["Hors périmètre", c.exclusions]] } as Bloc] : []),
    { type: "sousTitre", texte: "Impacts environnementaux et sociétaux du projet" },
    { type: "tableau", entetes: ["Impacts environnementaux", "Impacts sociaux"], lignes: [[c.impactsEnvironnementaux, c.impactsSociaux]] },
    { type: "sousTitre", texte: "Projets connexes" }, { type: "paragraphe", texte: c.projetsConnexes || "Aucun" },
    { type: "sousTitre", texte: "Composante IT" },
    { type: "cases", elements: [{ libelle: "Oui", coche: c.composanteIT }, { libelle: "Non", coche: !c.composanteIT }] },
    ...(c.composanteIT ? [{ type: "paragraphe", texte: c.descriptionIT } as Bloc, { type: "champs", lignes: [["Validation en Archiboard reçue le", c.dateArchiboard ? formatDate(c.dateArchiboard) : ""]] } as Bloc] : []),
    { type: "sousTitre", texte: "Jalons et livrables du projet" },
    { type: "tableau", entetes: ["Phase", "Début estimé", "Fin estimée", "Livrables"], largeurs: [1.6, 1, 1, 3],
      lignes: c.phases.map((p) => [`${p.applicable ? "☒" : "☐"} ${p.phase}`, p.applicable && p.debut ? formatDate(p.debut) : "", p.applicable && p.fin ? formatDate(p.fin) : "", p.applicable ? p.livrables ?? "" : ""]) },
    { type: "sousTitre", texte: "Coûts estimés du projet" },
    { type: "paragraphe", texte: c.coutsTexte },
    { type: "champs", lignes: [["Budget", formatCHF(c.budget)], ["N° de centre de coût ou d'ordre", c.centreCout]] },
    { type: "sousTitre", texte: "Estimation et disponibilité des ressources humaines" },
    { type: "tableau", entetes: ["Provenance des ressources", "Quantité (J/H)", "Disponibilité confirmée"], largeurs: [3, 1, 1.4],
      lignes: [...c.ressources.map((r) => [r.provenance, String(r.joursHommes), r.confirmee ? "☒ Oui" : "☐ Non"]), ["Total", String(c.ressources.reduce((s, r) => s + r.joursHommes, 0)), ""]] },
    { type: "sousTitre", texte: "Risques majeurs identifiés" },
    { type: "tableau", entetes: ["Risques", "Réponses envisagées"], lignes: c.risques.map((r) => [r.risque, r.reponse]), largeurs: [1, 2] },
    { type: "sousTitre", texte: "Décision de démarrage" },
    { type: "cases", elements: [{ libelle: "Autorisé", coche: m.decision === "Autorisé" }, { libelle: "Refusé", coche: m.decision === "Refusé" }, { libelle: "Complément d'information demandé", coche: m.decision === "Complément demandé" }] },
    { type: "paragraphe", texte: `Préavis ComInv nécessaire : ${c.preavisComInv ? "oui" : "non"}` },
    { type: "sousTitre", texte: "Signatures" },
    { type: "tableau", entetes: ["Commanditaire", "Client", "Chef de projet"], lignes: [[signature("Commanditaire"), signature("Client"), signature("Chef de projet")]] },
    ...(m.empreinte ? [{ type: "paragraphe", texte: `Empreinte du contenu signé : ${m.empreinte}`, italique: true } as Bloc] : []),
    ...(c.annexes.trim() ? [{ type: "sousTitre", texte: "Annexes" } as Bloc, { type: "paragraphe", texte: c.annexes } as Bloc] : []),
  ];
}
