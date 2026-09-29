// Traitements IA à réponse structurée : la sortie est contrainte par un schéma (Zod),
// ce qui garantit un résultat directement exploitable par l'application.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { CFC } from "../src/data/cfc";

const listeCFC = Object.entries(CFC).map(([code, libelle]) => `${code} ${libelle}`).join("\n");

// ---------------------------------------------------------------------------
// Import d'un chiffrage quelconque → lignes budgétaires CFC
// ---------------------------------------------------------------------------

export const SchemaChiffrage = z.object({
  lignes: z.array(z.object({
    cfc: z.string().describe("Code CFC le plus précis possible (3 chiffres de préférence, sinon 2), ex. \"211\""),
    libelle: z.string().describe("Libellé court de la ligne budgétaire"),
    montant: z.number().describe("Montant en CHF hors TVA"),
    confiance: z.enum(["haute", "moyenne", "faible"]).describe("Confiance dans l'attribution du code CFC et du montant"),
    origine: z.string().describe("Postes ou lignes du document source regroupés dans cette ligne"),
  })),
  totalDocument: z.number().nullable().describe("Total HT indiqué dans le document source, null s'il n'y en a pas"),
  baseMontants: z.enum(["HT", "TTC", "inconnu"]).describe("Base des montants dans le document source"),
  remarques: z.array(z.string()).describe("Hypothèses, conversions effectuées, éléments ambigus ou ignorés"),
});

export const SYSTEME_CHIFFRAGE = `Tu es économiste de la construction en Suisse. Tu reçois un chiffrage de n'importe quel format (devis estimatif, tableau Excel, offre, estimation sommaire, note manuscrite photographiée…) et tu le convertis en budget structuré selon le Code des frais de construction (CFC, SN 506 500).

Règles :
- Chaque ligne reçoit le code CFC le plus précis possible (3 chiffres si possible). Codes de référence :
${listeCFC}
- Pour les ouvrages de génie civil ou d'infrastructure sans correspondance évidente, utilise le groupe le plus proche (ex. routes → 461, canalisations → 463, conduites industrielles → 45, terrassements → 201, installations de chantier → 13) et baisse la confiance.
- Regroupe les postes détaillés d'un même code CFC en une seule ligne, et indique dans « origine » ce qui a été regroupé.
- Montants en CHF hors TVA. Si le document est TTC, convertis en HT (TVA 8,1 % sauf indication contraire) et signale-le dans les remarques.
- Les divers et imprévus vont en 583 « Réserve pour imprévus » ; les honoraires en 29x (bâtiment) ou 49x / 19x selon le cas.
- N'invente aucun montant. Si un montant est illisible ou absent, ne crée pas la ligne et mentionne-le dans les remarques.
- La somme des lignes doit correspondre au total HT du document ; si ce n'est pas le cas, explique l'écart dans les remarques.`;

// ---------------------------------------------------------------------------
// Suggestion de risques à partir du contexte du projet
// ---------------------------------------------------------------------------

export const SchemaRisques = z.object({
  risques: z.array(z.object({
    titre: z.string(),
    description: z.string().describe("Cause et conséquence en une ou deux phrases"),
    categorie: z.enum(["Technique", "Financier", "Délais", "Juridique", "Environnement", "Sécurité", "Organisation", "Tiers"]),
    probabilite: z.number().int().describe("1 rare, 2 peu probable, 3 possible, 4 probable, 5 quasi certain"),
    impact: z.number().int().describe("1 négligeable, 2 mineur, 3 modéré, 4 important, 5 majeur"),
    mesures: z.string().describe("Mesures de maîtrise concrètes"),
    impactFinancier: z.number().describe("Coût estimé en CHF HT si le risque survient, 0 si non chiffrable"),
  })),
});

export const SYSTEME_RISQUES = `Tu es directeur de projet expérimenté en infrastructure et génie civil en Suisse. À partir des données du projet, propose de 6 à 10 risques pertinents qui ne figurent pas déjà dans le registre existant. Sois concret et spécifique au projet (phase, ouvrages, contrats, planning, écarts financiers), évite les généralités. Évalue probabilité et impact de 1 à 5 et propose des mesures réalistes. Réponds en français.`;

// ---------------------------------------------------------------------------

export async function extraire<S extends z.ZodType>(
  client: Anthropic, modele: string, schema: S, systeme: string, contenu: Anthropic.Beta.BetaContentBlockParam[], signal?: AbortSignal,
): Promise<z.infer<S>> {
  const stream = client.beta.messages.stream(
    {
      model: modele,
      max_tokens: 32000,
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systeme,
      messages: [{ role: "user", content: contenu }],
    },
    { signal },
  );
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") throw new Error("L'IA n'a pas pu traiter ce contenu.");
  if (final.stop_reason === "max_tokens") throw new Error("Le document est trop volumineux pour être traité en une fois ; découpez-le.");
  if (!final.parsed_output) throw new Error("Réponse de l'IA inexploitable ; réessayez.");
  return final.parsed_output as z.infer<S>;
}
