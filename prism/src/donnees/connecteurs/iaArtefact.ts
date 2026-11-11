// Assistant dans la version publiée en artefact : pas de serveur ni de clé, les questions passent
// par la visionneuse, sur le compte Claude de la personne qui consulte, avec son accord.
import { capacite, type ErreurHote } from "@/app/hote";
import { CATEGORIES_RISQUE_IA, CONSIGNES_ASSISTANT, CONSIGNES_RISQUES } from "@/domaine/ia/consignes";
import type { ChatMessage } from "@/domaine/types";
import type { EvenementIA } from "./ia";

/** Les données du projet passent dans la question : on reste sous la limite de taille d'une demande */
const LIMITE_CONTEXTE = 180_000;
const INDISPONIBLE = "L'assistant n'est pas disponible dans cette vue de l'artefact.";

const MESSAGES: Record<string, string> = {
  not_granted: "L'assistant n'a pas été autorisé pour cet artefact.",
  sampling_disabled: "Claude n'est pas disponible pour ce compte.",
  rate_limited: "Trop de demandes pour l'instant, ou limite d'utilisation atteinte. Réessayez plus tard.",
  session_expired: "La session a expiré : reconnectez-vous à claude.ai.",
  refused: "L'assistant n'a pas pu répondre à cette demande. Reformulez la question.",
  prompt_too_large: "La conversation est trop longue : effacez-la et reposez la question.",
  empty_completion: "L'assistant n'a rien répondu. Reformulez la question.",
};
const messageErreur = (e: unknown) => MESSAGES[(e as ErreurHote).code ?? ""] ?? "La réponse a été interrompue. Réessayez.";

export async function demanderViaClaude(messages: ChatMessage[], contexte: string, onEvenement: (e: EvenementIA) => void, signal?: AbortSignal): Promise<void> {
  const claude = await capacite("sample");
  if (!claude) return onEvenement({ type: "erreur", message: INDISPONIBLE });
  onEvenement({ type: "reflexion" });
  const consignes = `${CONSIGNES_ASSISTANT}\n\nDonnées actuelles du projet :\n\n${contexte.slice(0, LIMITE_CONTEXTE) || "(aucun projet sélectionné)"}`;
  try {
    const { truncated } = await claude(
      [{ role: "user", content: consignes }, ...messages.filter((m) => m.content.trim()).map(({ role, content }) => ({ role, content }))],
      { cache: false, signal, onText: ({ delta }) => onEvenement({ type: "texte", texte: delta }) },
    );
    if (truncated) onEvenement({ type: "texte", texte: "\n\n_(réponse tronquée)_" });
    onEvenement({ type: "fin" });
  } catch (e) {
    if ((e as ErreurHote).code !== "cancelled") onEvenement({ type: "erreur", message: messageErreur(e) });
  }
}

/** Traitements à réponse structurée : seule la suggestion de risques se passe de serveur */
export async function appelViaClaude<T>(route: string, corps: unknown, signal?: AbortSignal): Promise<T> {
  if (route !== "risques") throw new Error("Ce traitement lit des fichiers avec l'IA : il demande la version installée sur le poste (LANCER.bat).");
  const claude = await capacite("sample");
  if (!claude) throw new Error(INDISPONIBLE);
  const contexte = String((corps as { contexte?: string }).contexte ?? "").slice(0, LIMITE_CONTEXTE);
  const demande = `${CONSIGNES_RISQUES}

Réponds uniquement par un objet JSON de la forme {"risques": [{"titre": string, "description": string, "categorie": string, "probabilite": number, "impact": number, "mesures": string, "impactFinancier": number}]}.
- description : cause et conséquence en une ou deux phrases
- categorie : l'une de ${CATEGORIES_RISQUE_IA.join(", ")}
- probabilite et impact : entiers de 1 à 5
- impactFinancier : coût estimé en CHF hors TVA si le risque survient, 0 s'il n'est pas chiffrable

Données du projet :

${contexte}`;
  let reponse: { risques?: unknown };
  try {
    reponse = await claude.json<{ risques?: unknown }>(demande, { signal });
  } catch (e) {
    throw new Error((e as ErreurHote).code === "invalid_json" ? "La réponse de l'assistant n'était pas exploitable. Réessayez." : messageErreur(e));
  }
  // La réponse n'est pas validée par la plateforme : chaque champ est contrôlé avant d'entrer dans l'écran
  const borne = (v: unknown) => Math.min(5, Math.max(1, Math.round(Number(v)) || 3));
  const risques = (Array.isArray(reponse?.risques) ? reponse.risques : []).map((r) => r as Record<string, unknown>).filter((r) => typeof r?.titre === "string" && r.titre.trim()).map((r) => ({
    titre: String(r.titre).trim(), description: String(r.description ?? ""), mesures: String(r.mesures ?? ""),
    categorie: (CATEGORIES_RISQUE_IA as readonly string[]).includes(String(r.categorie)) ? String(r.categorie) : "Technique",
    probabilite: borne(r.probabilite), impact: borne(r.impact), impactFinancier: Math.max(0, Math.round(Number(r.impactFinancier)) || 0),
  }));
  if (!risques.length) throw new Error("L'assistant n'a proposé aucun risque. Réessayez.");
  return { risques } as T;
}
