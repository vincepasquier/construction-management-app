// Fil de commentaires attaché à un objet (projet, risque, contrat, rapport…). Une mention
// « @Prénom Nom » prévient la personne ; une modification garde la version précédente.
import { MessageSquare, Pencil, Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { demander } from "@/app/etatUI";
import { Avatar, Bouton, cx, Zone } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { creerCommentaire, filDe, modifierCommentaire } from "@/domaine/socle/collaboration";
import { projetVisible } from "@/domaine/socle/droits";
import type { RefObjet } from "@/domaine/types";
import { useActions, useDonnees, useUtilisateur } from "@/donnees/hooks";

const heure = (iso: string) => `${formatDate(iso)} ${new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}`;

/** Texte avec ses mentions mises en évidence */
function Texte({ texte, noms }: { texte: string; noms: string[] }) {
  if (!noms.length) return <>{texte}</>;
  const motif = new RegExp(`(@(?:${noms.sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "gi");
  return <>{texte.split(motif).map((m, i) => (i % 2 ? <span key={i} className="rounded bg-brand-50 px-1 font-medium text-brand-700 dark:bg-sky-950 dark:text-sky-300">{m}</span> : m))}</>;
}

export function Commentaires({ cible, projetId, titre = "Commentaires", compact }: { cible: RefObjet; projetId?: string; titre?: string; compact?: boolean }) {
  const { commentaires, personnes, projets } = useDonnees();
  const { ajouter, modifier, supprimer } = useActions();
  const utilisateur = useUtilisateur();
  const [texte, setTexte] = useState("");
  const [edition, setEdition] = useState<{ id: string; texte: string } | null>(null);
  const [historique, setHistorique] = useState<string | null>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const fil = filDe(commentaires, cible);
  const projet = projets.find((p) => p.id === projetId);
  // On ne propose à la mention que les personnes qui peuvent voir le projet
  const mentionnables = personnes.filter((p) => !projet || projetVisible(p, projet));
  const fragment = texte.match(/@([\p{L} '-]*)$/u)?.[1];
  const suggestions = fragment !== undefined ? mentionnables.filter((p) => p.nom.toLowerCase().startsWith(fragment.toLowerCase()) && p.id !== utilisateur?.id).slice(0, 5) : [];
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "Utilisateur supprimé";

  const publier = () => {
    if (!texte.trim()) return;
    ajouter("commentaires", creerCommentaire({ id: nouvelId("com"), cible, projetId, texte, auteurId: utilisateur?.id, date: new Date().toISOString() }, mentionnables));
    setTexte("");
  };
  const completer = (n: string) => { setTexte(texte.replace(/@[\p{L} '-]*$/u, `@${n} `)); zone.current?.focus(); };

  return (
    <section className={cx("pas-impression", !compact && "rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800")}>
      <h3 className={cx("flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white", compact ? "mb-2" : "border-b border-slate-100 px-5 py-3 dark:border-slate-800")}><MessageSquare size={15} /> {titre}{fil.length > 0 && <span className="text-xs font-normal text-slate-400">{fil.length}</span>}</h3>
      <div className={compact ? "" : "p-5"}>
        {fil.length > 0 && (
          <ul className="mb-4 space-y-3">
            {fil.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar nom={nom(c.auteurId)} taille={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-500">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{nom(c.auteurId)}</span>{heure(c.date)}
                    {c.modifieLe && <button type="button" className="underline decoration-dotted" title="Voir les versions précédentes" onClick={() => setHistorique(historique === c.id ? null : c.id)}>modifié le {formatDate(c.modifieLe)}</button>}
                    {c.auteurId === utilisateur?.id && edition?.id !== c.id && (
                      <span className="ml-auto flex gap-1">
                        <button type="button" aria-label="Modifier le commentaire" className="rounded p-0.5 text-slate-300 hover:text-slate-600" onClick={() => setEdition({ id: c.id, texte: c.texte })}><Pencil size={12} /></button>
                        <button type="button" aria-label="Supprimer le commentaire" className="rounded p-0.5 text-slate-300 hover:text-rose-600" onClick={async () => { if (await demander("Supprimer ce commentaire ?", "Supprimer")) supprimer("commentaires", c.id); }}><Trash2 size={12} /></button>
                      </span>
                    )}
                  </p>
                  {edition?.id === c.id ? (
                    <div className="mt-1 space-y-2">
                      <Zone libre rows={2} value={edition.texte} onChange={(e) => setEdition({ id: c.id, texte: e.target.value })} />
                      <div className="flex gap-2"><Bouton libre taille="sm" variante="primaire" onClick={() => { modifier("commentaires", c.id, modifierCommentaire(c, edition.texte, new Date().toISOString(), mentionnables)); setEdition(null); }}>Enregistrer</Bouton><Bouton libre taille="sm" variante="fantome" onClick={() => setEdition(null)}>Annuler</Bouton></div>
                    </div>
                  ) : <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"><Texte texte={c.texte} noms={c.mentions.map((id) => nom(id))} /></p>}
                  {historique === c.id && c.historique && (
                    <ul className="mt-2 space-y-1 border-l-2 border-slate-200 pl-3 text-xs text-slate-500 dark:border-slate-700">{c.historique.map((h, i) => <li key={i}><span className="font-medium">{heure(h.date)}</span> — {h.texte}</li>)}</ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="relative">
          <Zone libre ref={zone} rows={2} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Écrire un commentaire… @ pour mentionner quelqu'un"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); publier(); } }} />
          {suggestions.length > 0 && (
            <ul className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              {suggestions.map((p) => <li key={p.id}><button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => completer(p.nom)}><Avatar nom={p.nom} taille={20} />{p.nom}</button></li>)}
            </ul>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Ctrl + Entrée pour publier. Les personnes mentionnées reçoivent une notification.</p>
          <Bouton libre taille="sm" variante="primaire" icone={<Send size={13} />} disabled={!texte.trim()} onClick={publier}>Publier</Bouton>
        </div>
      </div>
    </section>
  );
}
