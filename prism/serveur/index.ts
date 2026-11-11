// Serveur API : relaie les requêtes de l'assistant IA vers Claude (la clé API reste côté
// serveur) et sert l'application compilée (production ou version prête à lancer).
import { CONSIGNES_ASSISTANT as SYSTEME } from "../src/domaine/ia/consignes";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { extraire, SchemaChiffrage, SchemaRisques, SYSTEME_CHIFFRAGE, SYSTEME_RISQUES } from "./extractions";

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env : on utilise les variables d'environnement existantes.
}

// Modèle par défaut ; PRISM_MODELE permet d'en changer sans toucher au code (ex. claude-fable-5-2)
const MODELE = process.env.PRISM_MODELE?.trim() || "claude-opus-5-5";
const PORT = Number(process.env.PORT ?? 8787);
// PRISM_RESEAU=1 : l'application est aussi servie aux appareils du même réseau (téléphone sur le
// chantier). Le relais de l'assistant, qui détient la clé API, reste réservé à ce poste.
const RESEAU = /^(1|oui|true)$/i.test(process.env.PRISM_RESEAU?.trim() ?? "");
const estLocale = (adresse?: string) => !adresse || adresse === "::1" || adresse.startsWith("127.") || adresse === "::ffff:127.0.0.1";


const app = express();
// Les fichiers (PDF, images) sont transmis en base64 : limite adaptée aux devis scannés
app.use(express.json({ limit: "30mb" }));

const client = new Anthropic();

// Hors de ce poste, seul l'état du serveur se consulte : aucune requête ne part vers le modèle
app.use("/api", (req, res, suite) => {
  if (estLocale(req.socket.remoteAddress) || req.path === "/sante") { suite(); return; }
  res.status(403).json({ erreur: "L'assistant n'est disponible que sur le poste qui héberge PRISM." });
});

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

// Par défaut le serveur n'écoute que sur ce poste. Avec PRISM_RESEAU=1 il écoute aussi sur le réseau
// local, et le filtre ci-dessus garde le relais de l'assistant pour ce poste.
app.listen(PORT, RESEAU ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(dossierWeb ? `PRISM est prêt : ouvrez http://localhost:${PORT}` : `API PRISM sur http://localhost:${PORT}`);
  if (!RESEAU || !dossierWeb) return;
  const adresses = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === "IPv4" && !a.internal).map((a) => `http://${a!.address}:${PORT}`);
  console.log(adresses.length ? `Depuis un téléphone du même réseau : ${adresses.join(" ou ")}` : "Aucune adresse de réseau local trouvée.");
  console.log("Chaque appareil garde ses propres données : elles ne sont pas partagées avec ce poste.");
});
