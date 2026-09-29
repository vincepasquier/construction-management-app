import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Copy, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { useUI } from "../store/useUI";
import { construireContexte } from "../lib/contexteIA";
import { demanderAssistant } from "../lib/ia";
import { aujourdhui } from "../lib/format";
import type { ChatMessage } from "../types";
import { cx } from "./ui";

const SUGGESTIONS = [
  "Fais-moi un point de situation du projet pour le maître d'ouvrage",
  "Quels CFC présentent un risque de dépassement et pourquoi ?",
  "Analyse les avenants en attente et recommande une position",
  "Compare les offres de l'appel d'offres en évaluation et propose l'adjudication",
  "Quelles tâches du planning sont en retard et quel est l'impact ?",
  "Rédige l'ordre du jour de la prochaine séance de chantier",
];

export function AssistantIA() {
  const { assistantOuvert, fermerAssistant, consommerQuestion, questionEnAttente } = useUI();
  const donnees = useProjetActif();
  const { entreprises, personnes, conversations, setConversation } = useStore();
  const projetId = donnees.projet?.id ?? "global";
  const messages = conversations[projetId] ?? [];
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [reflexion, setReflexion] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const annulation = useRef<AbortController | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  const contexte = useMemo(
    () => (donnees.projet ? construireContexte({ ...donnees, projet: donnees.projet, entreprises, personnes }, aujourdhui()) : ""),
    [donnees, entreprises, personnes],
  );

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, reflexion]);

  const envoyer = async (texte: string) => {
    const question = texte.trim();
    if (!question || enCours) return;
    setErreur(null);
    setSaisie("");
    const historique: ChatMessage[] = [...messages, { role: "user", content: question }];
    setConversation(projetId, [...historique, { role: "assistant", content: "" }]);
    setEnCours(true);
    const ctrl = new AbortController();
    annulation.current = ctrl;
    let reponse = "";
    await demanderAssistant(historique, contexte, (e) => {
      if (e.type === "reflexion") setReflexion(true);
      if (e.type === "texte") {
        setReflexion(false);
        reponse += e.texte;
        setConversation(projetId, [...historique, { role: "assistant", content: reponse }]);
      }
      if (e.type === "erreur") setErreur(e.message);
    }, ctrl.signal);
    // Retire la réponse vide (erreur ou annulation) ; la question reste affichée
    if (!reponse) setConversation(projetId, historique);
    setEnCours(false);
    setReflexion(false);
  };

  useEffect(() => {
    if (assistantOuvert && questionEnAttente) {
      const q = consommerQuestion();
      if (q) void envoyer(q);
    }
  }, [assistantOuvert, questionEnAttente]);

  if (!assistantOuvert) return null;

  return (
    <aside className="apparition fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl xl:shadow-none dark:border-slate-800 dark:bg-slate-900">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white"><Sparkles size={16} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Assistant IA</p>
          <p className="truncate text-xs text-slate-500">{donnees.projet ? `Contexte : ${donnees.projet.code}${donnees.filtreActif ? " · mes lots" : ""}` : "Aucun projet sélectionné"}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { annulation.current?.abort(); setConversation(projetId, []); setErreur(null); }} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" title="Nouvelle conversation"><RotateCcw size={16} /></button>
        )}
        <button onClick={fermerAssistant} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Fermer"><X size={18} /></button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Je connais les finances, contrats, appels d'offres, planning et documents du projet actif. Posez une question ou choisissez une suggestion :
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => envoyer(s)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("group", m.role === "user" && "flex justify-end")}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">{m.content}</div>
            ) : (
              <div className="prose-ia text-sm text-slate-700 dark:text-slate-300">
                {m.content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown> : null}
                {m.content && !enCours && (
                  <button onClick={() => navigator.clipboard.writeText(m.content)} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-slate-600">
                    <Copy size={12} /> Copier
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {enCours && (reflexion || !messages.at(-1)?.content) && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${i * 120}ms` }} />)}
            </span>
            {reflexion ? "Analyse des données du projet…" : "Connexion…"}
          </div>
        )}
        {erreur && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{erreur}</div>}
        <div ref={fin} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void envoyer(saisie); }} className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-end gap-2 rounded-xl bg-slate-100 p-2 focus-within:ring-2 focus-within:ring-brand-500 dark:bg-slate-800">
          <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} rows={1} placeholder="Votre question…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(saisie); } }}
            className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none" />
          {enCours ? (
            <button type="button" onClick={() => annulation.current?.abort()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-white" aria-label="Arrêter"><Square size={14} /></button>
          ) : (
            <button type="submit" disabled={!saisie.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40" aria-label="Envoyer"><ArrowUp size={18} /></button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-slate-400">Les réponses de l'IA peuvent contenir des erreurs : vérifiez les chiffres importants.</p>
      </form>
    </aside>
  );
}
