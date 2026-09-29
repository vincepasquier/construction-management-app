// Serveur API : relaie les requêtes de l'assistant IA vers Claude (la clé API reste côté
// serveur) et sert l'application compilée (production ou version prête à lancer).
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { extraire, SchemaChiffrage, SchemaRisques, SYSTEME_CHIFFRAGE, SYSTEME_RISQUES } from "./extractions";

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env : on utilise les variables d'environnement existantes.
}

const MODELE = "claude-opus-5-5";
const PORT = Number(process.env.PORT ?? 8787);

const SYSTEME = `Tu es l'assistant IA intégré à Chantier+, une plateforme de gestion de projets d'infrastructure et de construction en Suisse romande. Tu aides les directeurs de projet et les responsables de lot.

Ton domaine :
- Suivi financier par code CFC (SN 506 500) : budget, engagé, facturé, prévision (coût final probable), écarts, réserves.
- Appels d'offres : descriptifs selon le CAN (Catalogue des articles normalisés, CRB), comparaison des soumissions, évaluation multicritère, marchés publics (AIMP/LMP, procédures ouverte, sélective, sur invitation, gré à gré).
- Contrats d'entreprise selon la norme SIA 118, mandats SIA 102/103/108, avenants, retenue de garantie, décomptes et situations.
- Planning, chemin critique, retards, ressources.
- Rédaction : courriers aux entreprises, lettres d'adjudication ou de non-adjudication, ordres du jour et PV de séance, rapports au maître d'ouvrage.

Règles :
- Réponds en français (Suisse), de manière concise et structurée (titres courts, listes, tableaux Markdown quand utile).
- Montants en CHF, séparateur de milliers « ' » (ex. 1'250'000 CHF), hors TVA sauf mention.
- Base-toi en priorité sur les données du projet fournies ci-dessous. Si une information manque, dis-le plutôt que d'inventer un chiffre.
- Pour les questions juridiques (marchés publics, SIA 118), donne l'orientation générale et rappelle de vérifier le texte applicable ou de consulter un juriste lorsque l'enjeu est important.
- Signale proactivement les risques (dépassements, avenants en attente, factures en retard, tâches critiques).`;

const app = express();
// Les fichiers (PDF, images) sont transmis en base64 : limite adaptée aux devis scannés
app.use(express.json({ limit: "30mb" }));

const client = new Anthropic();

app.get("/api/sante", (_req, res) => {
  res.json({ ok: true, modele: MODELE, cleConfiguree: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
});

interface CorpsAssistant {
  messages: Anthropic.MessageParam[];
  contexte: string;
}

app.post("/api/assistant", async (req, res) => {
  const { messages, contexte } = req.body as CorpsAssistant;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ erreur: "Aucun message fourni." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const envoyer = (donnees: Record<string, unknown>) => res.write(`data: ${JSON.stringify(donnees)}\n\n`);

  const controle = new AbortController();
  res.on("close", () => controle.abort());

  try {
    const stream = client.beta.messages.stream(
      {
        model: MODELE,
        max_tokens: 64000,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [
          { type: "text", text: SYSTEME, cache_control: { type: "ephemeral" } },
          { type: "text", text: `Données actuelles du projet :\n\n${contexte || "(aucun projet sélectionné)"}` },
        ],
        messages,
      },
      { signal: controle.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "thinking") {
        envoyer({ type: "reflexion" });
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        envoyer({ type: "texte", texte: event.delta.text });
      }
    }

    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      envoyer({ type: "erreur", message: "L'assistant n'a pas pu répondre à cette demande. Reformulez la question." });
    } else if (final.stop_reason === "max_tokens") {
      envoyer({ type: "texte", texte: "\n\n_(réponse tronquée)_" });
    }
    envoyer({ type: "fin" });
  } catch (err) {
    if (controle.signal.aborted) return;
    const message = messageErreur(err);
    console.error("[assistant]", err);
    envoyer({ type: "erreur", message });
  } finally {
    res.end();
  }
});

/** Message compréhensible pour l'utilisateur selon le type d'erreur du SDK */
function messageErreur(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Clé API Anthropic absente ou invalide. Renseignez ANTHROPIC_API_KEY dans le fichier .env du serveur.";
  if (err instanceof Anthropic.RateLimitError) return "Limite de requêtes atteinte. Réessayez dans quelques instants.";
  if (err instanceof Anthropic.APIConnectionError) return "Impossible de joindre l'API Anthropic (connexion réseau).";
  if (err instanceof Anthropic.APIError) return `Erreur API (${err.status ?? "?"}) : ${err.message}`;
  // Aucune clé ni profil trouvé : le SDK échoue avant même d'appeler l'API
  if (err instanceof Anthropic.AnthropicError) return "Aucune clé API Anthropic configurée. Copiez .env.example vers .env et renseignez ANTHROPIC_API_KEY, puis redémarrez le serveur.";
  if (err instanceof Error) return err.message;
  return "Erreur inattendue de l'assistant.";
}

// ---------------------------------------------------------------------------
// Traitements structurés
// ---------------------------------------------------------------------------

interface CorpsChiffrage {
  texte?: string;
  fichier?: { nom: string; type: string; base64: string };
  consignes?: string;
}

const IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

app.post("/api/ia/chiffrage", async (req, res) => {
  const { texte, fichier, consignes } = req.body as CorpsChiffrage;
  const contenu: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (fichier?.type === "application/pdf") {
    contenu.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: fichier.base64 }, title: fichier.nom });
  } else if (fichier && (IMAGES as readonly string[]).includes(fichier.type)) {
    contenu.push({ type: "image", source: { type: "base64", media_type: fichier.type as (typeof IMAGES)[number], data: fichier.base64 } });
  }
  if (texte?.trim()) contenu.push({ type: "text", text: `Contenu du chiffrage${fichier ? ` (${fichier.nom})` : ""} :\n\n${texte}` });
  if (contenu.length === 0) {
    res.status(400).json({ erreur: "Aucun contenu à analyser (formats acceptés : Excel, CSV, texte, PDF, image)." });
    return;
  }
  contenu.push({ type: "text", text: `Convertis ce chiffrage en lignes budgétaires CFC.${consignes?.trim() ? `\n\nConsignes de l'utilisateur : ${consignes}` : ""}` });
  try {
    res.json({ resultat: await extraire(client, MODELE, SchemaChiffrage, SYSTEME_CHIFFRAGE, contenu) });
  } catch (err) {
    console.error("[chiffrage]", err);
    res.status(500).json({ erreur: messageErreur(err) });
  }
});

app.post("/api/ia/risques", async (req, res) => {
  const { contexte } = req.body as { contexte?: string };
  if (!contexte) {
    res.status(400).json({ erreur: "Contexte du projet manquant." });
    return;
  }
  try {
    res.json({ resultat: await extraire(client, MODELE, SchemaRisques, SYSTEME_RISQUES, [{ type: "text", text: contexte }]) });
  } catch (err) {
    console.error("[risques]", err);
    res.status(500).json({ erreur: messageErreur(err) });
  }
});

// Front compilé : « web/ » à côté du serveur (version prête à lancer) ou « ../dist » (npm start)
const ici = path.dirname(fileURLToPath(import.meta.url));
const dossierWeb = [path.join(ici, "web"), path.resolve(ici, "../dist")].find((d) => fs.existsSync(path.join(d, "index.html")));
if (dossierWeb && (process.env.NODE_ENV === "production" || dossierWeb.endsWith("web"))) {
  app.use(express.static(dossierWeb));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dossierWeb, "index.html")));
}

app.listen(PORT, () => {
  console.log(dossierWeb ? `Chantier+ est prêt : ouvrez http://localhost:${PORT}` : `API Chantier+ sur http://localhost:${PORT}`);
});
