// Procès-verbal d'une séance pour l'export Word.
import { formatCHF, formatDate } from "@/domaine/lib/format";
import type { Seance } from "@/domaine/socle/types";
import type { Bloc } from "@/outils/docx";

export function blocsSeance(s: Seance, o: { nomPersonne: (id?: string) => string | undefined; codeProjet: (id?: string) => string | undefined; projet?: string; fonctionPersonne?: (id?: string) => string | undefined }): Bloc[] {
  const qui = (p: { personneId?: string; nom?: string }) => o.nomPersonne(p.personneId) ?? p.nom ?? "";
  const lignes = (presence: string) => s.participants.filter((p) => p.presence === presence).map((p) => [qui(p), p.organisation || o.fonctionPersonne?.(p.personneId) || "", p.diffusion ? "oui" : ""]);
  const blocs: Bloc[] = [
    { type: "titre", texte: `${s.titre} – procès-verbal` },
    { type: "champs", lignes: [...(o.projet ? [["Projet", o.projet] as [string, string]] : []), ["Date", formatDate(s.date)], ["Lieu", s.lieu ?? ""], ["Rédaction", o.nomPersonne(s.redacteurId) ?? ""], ["Prochaine séance", s.prochaineSeance ? formatDate(s.prochaineSeance) : ""]] },
    { type: "sousTitre", texte: "Participants" },
    { type: "tableau", entetes: ["Présents", "Organisation", "Diffusion"], lignes: lignes("Présent"), largeurs: [2, 2, 1] },
  ];
  const absents = [...lignes("Excusé").map((l) => [l[0], "excusé"]), ...lignes("Absent").map((l) => [l[0], "absent"])];
  if (absents.length) blocs.push({ type: "paragraphe", texte: `Excusés et absents : ${absents.map((a) => `${a[0]} (${a[1]})`).join(", ")}` });
  blocs.push({ type: "sousTitre", texte: "Points traités" });
  blocs.push({
    type: "tableau", entetes: ["N°", "Objet et décision", "Nature", "Responsable", "Délai", "État"], largeurs: [0.6, 3.5, 1.25, 1.5, 1.25, 0.8],
    lignes: s.points.map((p) => [
      p.numero,
      `${o.codeProjet(p.projetId) && !s.projetId ? `[${o.codeProjet(p.projetId)}] ` : ""}${p.titre}${p.texte ? `\n${p.texte}` : ""}${p.decision?.montant ? `\nMontant : ${formatCHF(p.decision.montant)}` : ""}${p.decision?.conditions.length ? `\nConditions : ${p.decision.conditions.map((c) => c.texte).join(" ; ")}` : ""}`,
      p.nature === "Décision" && p.decision ? `Décision (${p.decision.statut.toLowerCase()})` : p.nature,
      o.nomPersonne(p.responsableId) ?? p.responsableNom ?? "", p.echeance ? formatDate(p.echeance) : "", p.statut,
    ]),
  });
  blocs.push({ type: "paragraphe", italique: true, texte: "Sans remarque écrite dans les dix jours suivant sa diffusion, ce procès-verbal est réputé accepté." });
  return blocs;
}
