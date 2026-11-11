// Configuration fonctionnelle, versionnée : on modifie un brouillon, on en mesure l'effet, on publie.
// Chaque publication garde la version précédente, que l'on peut rétablir.
import { criticite, definirSeuilsCriticite, estActif, score } from "../domaine/lib/risques";
import { evaluerCompletude } from "../domaine/socle/completude";
import { sante } from "../domaine/socle/synthese";
import type { Configuration } from "../domaine/socle/types";
import type { Depot } from "./depot";
import { faitsCompletude, risquesARevoir } from "./gouvernance";
import { indicateursProjet } from "./lectures";

export const ID_COURANTE = "courante";
export const courante = (depot: Depot) => depot.parId("configurations", ID_COURANTE);

/** Versions archivées, de la plus récente à la plus ancienne */
export const versions = (depot: Depot) => depot.tous("configurations").filter((c) => c.id !== ID_COURANTE).sort((a, b) => b.version - a.version);

export function controlerConfiguration(c: Configuration): string[] {
  const e: string[] = [];
  if (!(c.seuilVariationPct > 0)) e.push("Le seuil de variation doit être supérieur à zéro.");
  if (!(c.matriceRisques.modere < c.matriceRisques.eleve && c.matriceRisques.eleve < c.matriceRisques.critique)) e.push("Les seuils de la matrice des risques doivent être croissants.");
  if (c.matriceRisques.critique > 25 || c.matriceRisques.modere < 1) e.push("Les seuils de criticité se situent entre 1 et 25.");
  if (!(c.seuilsSante.surveiller <= c.seuilsSante.critique)) e.push("Le seuil « critique » de santé doit être au moins égal au seuil « à surveiller ».");
  if (!(c.joursRevueRisque >= 1)) e.push("Le délai de revue des risques doit être d'au moins un jour.");
  if (!(c.conservationAnnees >= 1)) e.push("La durée de conservation doit être d'au moins un an.");
  if (!c.criteresCompletude.some((x) => x.actif)) e.push("Au moins un critère de complétude doit rester actif.");
  if (c.criteresCompletude.some((x) => x.actif && !(x.poids > 0))) e.push("Un critère actif doit avoir un poids supérieur à zéro.");
  if (c.circuits.some((x) => !x.nom.trim() || x.roles.length === 0)) e.push("Chaque circuit de validation a un nom et au moins un rôle.");
  return e;
}

export interface Impact {
  projets: number;
  /** Projets dont la santé change */
  sante: { code: string; avant: string; apres: string }[];
  risquesCritiques: { avant: number; apres: number };
  risquesARevoir: { avant: number; apres: number };
  completudeMoyenne: { avant: number; apres: number };
}

/** Effet d'un brouillon sur les projets en cours, sans rien écrire */
export function mesurerImpact(depot: Depot, brouillon: Configuration, jour: string): Impact {
  const actuelle = courante(depot) ?? brouillon;
  const projets = depot.tous("projets").filter((p) => !p.archive && !p.parentId);
  const LIBELLE = { bon: "Conforme", alerte: "À surveiller", mauvais: "Critique" } as const;
  const impact: Impact = { projets: projets.length, sante: [], risquesCritiques: { avant: 0, apres: 0 }, risquesARevoir: { avant: 0, apres: 0 }, completudeMoyenne: { avant: 0, apres: 0 } };
  let sommeAvant = 0, sommeApres = 0;
  for (const p of projets) {
    const i = indicateursProjet(depot, p, jour);
    const apres = sante(i.synthese, i.retards.length, brouillon.seuilsSante);
    if (apres !== i.sante) impact.sante.push({ code: p.code, avant: LIBELLE[i.sante], apres: LIBELLE[apres] });
    const risques = depot.parProjet("risques", p.id);
    for (const r of risques.filter(estActif)) {
      if (criticite(score(r), actuelle.matriceRisques) === "Critique") impact.risquesCritiques.avant++;
      if (criticite(score(r), brouillon.matriceRisques) === "Critique") impact.risquesCritiques.apres++;
    }
    impact.risquesARevoir.avant += risquesARevoir(risques, jour, actuelle.joursRevueRisque).length;
    impact.risquesARevoir.apres += risquesARevoir(risques, jour, brouillon.joursRevueRisque).length;
    const faits = faitsCompletude(depot, p, jour);
    sommeAvant += evaluerCompletude(actuelle.criteresCompletude, faits).indice;
    sommeApres += evaluerCompletude(brouillon.criteresCompletude, faits).indice;
  }
  impact.completudeMoyenne = { avant: projets.length ? Math.round(sommeAvant / projets.length) : 0, apres: projets.length ? Math.round(sommeApres / projets.length) : 0 };
  return impact;
}

/** Publie le brouillon : la configuration en vigueur est archivée sous son numéro de version */
export function publier(depot: Depot, brouillon: Configuration, commentaire: string, date = new Date().toISOString()): Configuration {
  const erreurs = controlerConfiguration(brouillon);
  if (erreurs.length) throw new Error(erreurs.join(" "));
  if (!commentaire.trim()) throw new Error("Décrivez en une phrase ce que cette publication change.");
  const actuelle = courante(depot);
  const nouvelle: Configuration = { ...brouillon, id: ID_COURANTE, version: (actuelle?.version ?? 0) + 1, date, auteurId: depot.acteurId, commentaire: commentaire.trim() };
  depot.grouper(`Publication de la configuration (version ${nouvelle.version})`, () => {
    if (actuelle && !depot.parId("configurations", `config-v${actuelle.version}`)) depot.ajouter("configurations", { ...actuelle, id: `config-v${actuelle.version}` });
    if (actuelle) depot.modifier("configurations", ID_COURANTE, nouvelle); else depot.ajouter("configurations", nouvelle);
  }, { motif: commentaire.trim(), irreversible: true });
  definirSeuilsCriticite(nouvelle.matriceRisques);
  return nouvelle;
}

/** Retour arrière : republie le contenu d'une version précédente comme nouvelle version */
export function retablir(depot: Depot, version: number, date = new Date().toISOString()): Configuration {
  const ancienne = depot.parId("configurations", `config-v${version}`);
  if (!ancienne) throw new Error(`La version ${version} n'est plus disponible.`);
  return publier(depot, ancienne, `Retour à la version ${version}`, date);
}
