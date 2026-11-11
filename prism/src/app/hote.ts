// Hôte de l'application. Sur le poste, un petit serveur local la sert et relaie l'assistant.
// Publiée en artefact claude.ai, elle tourne seule dans un cadre restreint : pas de serveur, pas
// d'adresse par écran, pas de téléchargement ni d'impression directs. Ce module réunit ce qui change.
import { notifier } from "./etatUI";

declare const __ARTEFACT__: boolean;
/** Vrai dans la version construite pour un artefact (`npm run artefact`) */
export const EN_ARTEFACT: boolean = typeof __ARTEFACT__ !== "undefined" && __ARTEFACT__;

export interface ErreurHote { code?: string; message?: string; text?: string }
interface Capacites {
  /** Propose un fichier au lecteur, qui confirme l'enregistrement */
  downloads: { save(demande: { filename: string; data: Blob | string }): Promise<{ status: string }> };
  /** Interroge Claude sur le compte du lecteur */
  sample: {
    (entree: string | { role: "user" | "assistant"; content: string }[], options?: { signal?: AbortSignal; cache?: boolean; onText?: (maj: { text: string; delta: string }) => void }): Promise<{ text: string; truncated: boolean }>;
    json<T = unknown>(entree: string, options?: { signal?: AbortSignal }): Promise<T>;
  };
}

/** Capacité accordée par la visionneuse d'artefacts, ou `null` quand cette vue ne l'offre pas */
export async function capacite<K extends keyof Capacites>(nom: K): Promise<Capacites[K] | null> {
  try {
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    return ((await claude?.use?.(nom)) as Capacites[K] | null | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Enregistrement d'un fichier produit par l'application, par la visionneuse d'artefacts */
export async function enregistrerParHote(nom: string, blob: Blob): Promise<void> {
  const telechargements = await capacite("downloads");
  if (!telechargements) return notifier("Le téléchargement n'est pas disponible dans cette vue. Ouvrez l'artefact dans claude.ai, ou utilisez la version installée.", "erreur");
  try {
    await telechargements.save({ filename: nom, data: blob });
  } catch (e) {
    const code = (e as ErreurHote).code;
    if (code === "declined") return;
    notifier(code === "rate_limited" ? "Un enregistrement attend déjà votre confirmation." : `Le fichier ${nom} n'a pas pu être enregistré depuis cette vue.`, "erreur");
  }
}

/** Impression de l'écran : la visionneuse d'artefacts ne l'autorise pas */
export function imprimer(): void {
  if (EN_ARTEFACT) notifier("L'impression n'est pas possible dans un artefact. Utilisez les exports Word et Excel, ou la version installée pour imprimer en PDF.");
  else window.print();
}

/** Thème demandé par la visionneuse : choix explicite, sinon celui du système */
export function themeHote(): "clair" | "sombre" {
  const choix = document.documentElement.dataset.theme;
  if (choix === "dark" || choix === "light") return choix === "dark" ? "sombre" : "clair";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "sombre" : "clair";
}
