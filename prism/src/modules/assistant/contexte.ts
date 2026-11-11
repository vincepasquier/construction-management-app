// Contexte transmis à l'assistant : les données du projet ouvert, réduites à ce que l'utilisateur
// a le droit de lire. Un module fermé pour lui n'entre pas dans le résumé envoyé au modèle.
import { resumeChantier } from "@/domaine/lib/chantier";
import { construireContexte } from "@/domaine/lib/contexteIA";
import { niveau, projetVisible } from "@/domaine/socle/droits";
import type { Entreprise, Personne } from "@/domaine/types";
import type { DonneesProjet } from "@/donnees/hooks";
import { META, type NomCollection } from "@/donnees/schema";

const COLLECTIONS_CONTEXTE = [
  "lots", "budget", "appelsOffres", "contrats", "factures", "taches", "documents", "risques", "actions", "validations",
  "autorisations", "servitudes", "mutations", "offres", "ajustements", "facturesHorsCommande", "clotures",
] as const satisfies readonly NomCollection[];

export function contexteAssistant(d: DonneesProjet, utilisateur: Personne | undefined, entreprises: Entreprise[], personnes: Personne[], jour: string): string {
  const projet = d.projet;
  if (!projet || !projetVisible(utilisateur, projet)) return "";
  const lisible = (c: NomCollection) => c === "lots" || niveau(utilisateur, META[c].module) !== "aucun";
  const donnees = Object.fromEntries(COLLECTIONS_CONTEXTE.map((c) => [c, lisible(c) ? d[c] : []])) as unknown as { [C in (typeof COLLECTIONS_CONTEXTE)[number]]: DonneesProjet[C] };
  const fermes = [...new Set(COLLECTIONS_CONTEXTE.filter((c) => !lisible(c)).map((c) => META[c].module))];
  const texte = construireContexte({ ...donnees, projet, entreprises: niveau(utilisateur, "entreprises") === "aucun" ? [] : entreprises, personnes }, jour);
  const chantier = niveau(utilisateur, "chantier") === "aucun" ? "" : resumeChantier({ journal: d.journalChantier, reserves: d.reserves, receptions: d.receptions, regies: d.regies, constats: d.constats }, jour);
  const complet = chantier ? `${texte}\n\n${chantier}` : texte;
  return fermes.length ? `${complet}\n\nModules non accessibles à cet utilisateur (ne rien en dire, ne rien en déduire) : ${fermes.join(", ")}.` : complet;
}
