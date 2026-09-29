import type { ChatMessage } from "../types";

export type EvenementIA =
  | { type: "reflexion" }
  | { type: "texte"; texte: string }
  | { type: "erreur"; message: string }
  | { type: "fin" };

/** Envoie la conversation au serveur et relaie la réponse en continu (SSE). */
export async function demanderAssistant(
  messages: ChatMessage[],
  contexte: string,
  onEvenement: (e: EvenementIA) => void,
  signal?: AbortSignal,
): Promise<void> {
  let reponse: Response;
  try {
    reponse = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, contexte }),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) return;
    onEvenement({ type: "erreur", message: "Serveur de l'assistant injoignable. Lancez « npm run dev » (front + API)." });
    return;
  }
  if (!reponse.ok || !reponse.body) {
    onEvenement({ type: "erreur", message: `Le serveur a répondu ${reponse.status}.` });
    return;
  }
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });
    const blocs = tampon.split("\n\n");
    tampon = blocs.pop() ?? "";
    for (const bloc of blocs) {
      const ligne = bloc.split("\n").find((l) => l.startsWith("data: "));
      if (ligne) onEvenement(JSON.parse(ligne.slice(6)) as EvenementIA);
    }
  }
}
