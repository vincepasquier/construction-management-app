// Recherche globale (Ctrl+K). L'index vient de `construireIndex`, qui n'y met que ce que
// l'utilisateur a le droit de voir : aucun filtre d'affichage à ajouter ici.
import { Bookmark, CornerDownLeft, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ui } from "../../app/etatUI";
import { Badge, cx, Liste, Saisie } from "../../app/ui";
import { nouvelId } from "../../domaine/lib/id";
import { useDepot, useDonnees, useUtilisateur } from "../../donnees/hooks";
import { chercher, construireIndex, type FiltresRecherche } from "../../donnees/recherche";

const MAX = 40;

export function Palette() {
  const depot = useDepot();
  const { projets, directions, programmes, personnes, vues, ajouter, supprimer } = useDonnees();
  const utilisateur = useUtilisateur();
  const navigate = useNavigate();
  const [requete, setRequete] = useState("");
  const [filtres, setFiltres] = useState<FiltresRecherche>({});
  const [avance, setAvance] = useState(false);
  const [actif, setActif] = useState(0);
  const liste = useRef<HTMLDivElement>(null);

  // L'index est reconstruit à l'ouverture : il reflète l'état des données et des droits à cet instant
  const index = useMemo(() => construireIndex(depot, utilisateur), [depot, utilisateur]);
  const types = useMemo(() => [...new Set(index.map((r) => r.type))].sort((a, b) => a.localeCompare(b, "fr")), [index]);
  const visibles = useMemo(() => new Set(index.filter((r) => r.type === "Projet").map((r) => r.projetId)), [index]);
  const resultats = useMemo(() => chercher(index, requete, filtres, projets), [index, requete, filtres, projets]);
  const affiches = resultats.slice(0, MAX);
  const enregistrees = vues.filter((v) => v.table === "recherche" && (v.partagee || v.proprietaireId === utilisateur?.id));
  const nbFiltres = Object.values(filtres).filter(Boolean).length;
  const vide = !requete.trim() && nbFiltres === 0;

  const fermer = () => ui.ecrire({ paletteOuverte: false });
  const ouvrir = (lien: string) => { fermer(); navigate(lien); };
  const filtrer = (patch: FiltresRecherche) => { setFiltres({ ...filtres, ...patch }); setActif(0); };

  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-rang="${actif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actif]);

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); fermer(); }
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((a) => Math.min(a + 1, affiches.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && affiches[actif]) { e.preventDefault(); ouvrir(affiches[actif].lien); }
  };

  const enregistrer = () => {
    const nom = requete.trim() || [filtres.type, filtres.statut].filter(Boolean).join(" · ") || "Recherche";
    ajouter("vues", { id: nouvelId("vue"), proprietaireId: utilisateur?.id, table: "recherche", nom, definition: { requete, filtres }, partagee: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] pas-impression" onMouseDown={fermer}>
      <div role="dialog" aria-modal="true" aria-label="Recherche" onMouseDown={(e) => e.stopPropagation()} onKeyDown={clavier}
        className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input autoFocus value={requete} onChange={(e) => { setRequete(e.target.value); setActif(0); }} placeholder="Projet, contrat, risque, décision, document, contact…"
            aria-label="Rechercher" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          <button type="button" onClick={() => setAvance(!avance)} aria-pressed={avance} title="Filtres"
            className={cx("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium", avance || nbFiltres ? "bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-sky-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <SlidersHorizontal size={14} /> Filtres{nbFiltres ? ` (${nbFiltres})` : ""}
          </button>
          <button type="button" onClick={fermer} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          {[undefined, ...types].map((t) => (
            <button key={t ?? "tout"} type="button" onClick={() => filtrer({ type: t })}
              className={cx("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1", filtres.type === t ? "bg-brand-600 text-white ring-brand-600" : "text-slate-600 ring-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800")}>
              {t ?? "Tout"}
            </button>
          ))}
        </div>

        {avance && (
          <div className="grid gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
            <Liste libre aria-label="Projet" value={filtres.projetId ?? ""} onChange={(e) => filtrer({ projetId: e.target.value || undefined })}>
              <option value="">Tous les projets</option>
              {projets.filter((p) => visibles.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.nom}</option>)}
            </Liste>
            <Liste libre aria-label="Direction" value={filtres.directionId ?? ""} onChange={(e) => filtrer({ directionId: e.target.value || undefined })}>
              <option value="">Toutes les directions</option>
              {directions.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.nom}</option>)}
            </Liste>
            <Liste libre aria-label="Programme" value={filtres.programmeId ?? ""} onChange={(e) => filtrer({ programmeId: e.target.value || undefined })}>
              <option value="">Tous les programmes</option>
              {programmes.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </Liste>
            <Liste libre aria-label="Responsable" value={filtres.responsableId ?? ""} onChange={(e) => filtrer({ responsableId: e.target.value || undefined })}>
              <option value="">Tous les responsables</option>
              {[...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </Liste>
            <Saisie libre type="date" aria-label="À partir du" title="À partir du" value={filtres.du ?? ""} onChange={(e) => filtrer({ du: e.target.value || undefined })} />
            <Saisie libre type="date" aria-label="Jusqu'au" title="Jusqu'au" value={filtres.au ?? ""} onChange={(e) => filtrer({ au: e.target.value || undefined })} />
          </div>
        )}

        <div ref={liste} className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Résultats">
          {vide && enregistrees.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recherches enregistrées</p>
              {enregistrees.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => {
                    const d = v.definition as { requete?: string; filtres?: FiltresRecherche };
                    setRequete(d.requete ?? ""); setFiltres(d.filtres ?? {}); setActif(0);
                  }}><Bookmark size={14} className="shrink-0 text-slate-400" /><span className="truncate">{v.nom}</span></button>
                  <button type="button" aria-label={`Supprimer la recherche ${v.nom}`} className="rounded p-1 text-slate-400 hover:text-rose-600" onClick={() => supprimer("vues", v.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
          {vide ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Saisissez un mot : un code de projet, un nom d'entreprise, le titre d'un risque…<br /><span className="text-xs text-slate-400">La recherche ne parcourt que les projets et les modules auxquels vous avez accès.</span></p>
          ) : affiches.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Aucun résultat dans votre périmètre.</p>
          ) : affiches.map((r, i) => (
            <button key={r.cle} type="button" role="option" aria-selected={i === actif} data-rang={i} onMouseEnter={() => setActif(i)} onClick={() => ouvrir(r.lien)}
              className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === actif ? "bg-brand-50 dark:bg-sky-950/60" : "")}>
              <span className="w-28 shrink-0"><Badge couleur={r.type === "Projet" ? "bleu" : "gris"}>{r.type}</Badge></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{r.titre}</span>
                {r.detail && <span className="block truncate text-xs text-slate-500">{r.detail}</span>}
              </span>
              {i === actif && <CornerDownLeft size={14} className="shrink-0 text-slate-400" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
          <span className="num">{vide ? `${index.length} objets consultables` : `${resultats.length} résultat${resultats.length > 1 ? "s" : ""}${resultats.length > MAX ? ` · ${MAX} affichés` : ""}`}</span>
          {!vide && <button type="button" onClick={enregistrer} className="ml-auto inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"><Bookmark size={12} /> Enregistrer cette recherche</button>}
          <span className={cx("hidden sm:inline", vide && "ml-auto")}>↑ ↓ pour parcourir · Entrée pour ouvrir · Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
}
