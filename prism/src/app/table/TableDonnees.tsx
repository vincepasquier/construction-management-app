// Tableau commun à toute l'application : recherche, tri, regroupement, choix des colonnes, totaux,
// vues enregistrées, saisie en ligne avec collage depuis Excel, export Excel, et affichage fenêtré
// pour les longues listes.
import { ArrowDown, ArrowUp, Bookmark, Columns3, Download, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { formatCHFPrecis, formatDate, formatNombre, formatPct } from "../../domaine/lib/format";
import { nouvelId } from "../../domaine/lib/id";
import { useDonnees, useUtilisateur } from "../../donnees/hooks";
import { nomFichier, telechargerXlsx } from "../../outils/telechargement";
import type { Cellule } from "../../outils/xlsx";
import { Bouton, cx, useLectureSeule } from "../ui";

type Valeur = string | number | boolean | null | undefined;

export interface Colonne<T> {
  id: string;
  titre: string;
  /** Valeur brute : sert au tri, à la recherche, au regroupement, aux totaux et à l'export */
  valeur: (ligne: T) => Valeur;
  /** Affichage sur mesure ; par défaut la valeur est formatée selon `type` */
  rendu?: (ligne: T) => ReactNode;
  type?: "texte" | "nombre" | "montant" | "date" | "pourcent";
  largeur?: string;
  /** Somme affichée en pied de tableau et dans les en-têtes de groupe */
  total?: boolean;
  /** Colonne masquée tant que l'utilisateur ne l'affiche pas */
  masquee?: boolean;
  /** On peut regrouper les lignes sur cette colonne */
  groupable?: boolean;
  /** Saisie directe dans la cellule */
  edition?: { type: "texte" | "nombre" | "date" | "liste"; options?: string[]; enregistrer: (ligne: T, valeur: string) => void };
}

interface Props<T> {
  /** Identifiant du tableau, pour les vues enregistrées et le nom du fichier exporté */
  id: string;
  lignes: T[];
  colonnes: Colonne<T>[];
  cle: (ligne: T) => string;
  onOuvrir?: (ligne: T) => void;
  /** Actions de fin de ligne */
  actions?: (ligne: T) => ReactNode;
  grouperPar?: string;
  triInitial?: { colonne: string; sens: "asc" | "desc" };
  vide?: ReactNode;
  /** Éléments ajoutés dans la barre du tableau (filtres propres à l'écran) */
  barre?: ReactNode;
  /** Masque la barre (petits tableaux d'une fiche) */
  simple?: boolean;
  classeLigne?: (ligne: T) => string | undefined;
}

interface DefinitionVue {
  tri: { colonne: string; sens: "asc" | "desc" } | null;
  groupe: string;
  masquees: string[];
  recherche: string;
}

const HAUTEUR_LIGNE = 41;
const SEUIL_FENETRE = 120;

function formater(v: Valeur, type: Colonne<unknown>["type"]): ReactNode {
  if (v === null || v === undefined || v === "") return <span className="text-slate-300 dark:text-slate-600">—</span>;
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "number") return type === "montant" ? formatCHFPrecis(v) : type === "pourcent" ? formatPct(v) : formatNombre(v);
  return type === "date" ? formatDate(v) : v;
}

const comparer = (a: Valeur, b: Valeur) => {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1;
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr", { numeric: true, sensitivity: "base" });
};

type Rangee<T> = { type: "groupe"; cle: string; libelle: string; lignes: T[] } | { type: "ligne"; ligne: T };

export function TableDonnees<T>({ id, lignes, colonnes, cle, onOuvrir, actions, grouperPar = "", triInitial, vide, barre, simple, classeLigne }: Props<T>) {
  const lecture = useLectureSeule();
  const utilisateur = useUtilisateur();
  const { vues, ajouter, supprimer } = useDonnees();
  const [vue, setVue] = useState<DefinitionVue>({
    tri: triInitial ?? null, groupe: grouperPar, masquees: colonnes.filter((c) => c.masquee).map((c) => c.id), recherche: "",
  });
  const [menu, setMenu] = useState<"colonnes" | "vues" | null>(null);
  const [defilement, setDefilement] = useState(0);
  const conteneur = useRef<HTMLDivElement>(null);

  const visibles = colonnes.filter((c) => !vue.masquees.includes(c.id));
  const colonneGroupe = colonnes.find((c) => c.id === vue.groupe);
  const mesVues = vues.filter((v) => v.table === id && (v.partagee || v.proprietaireId === utilisateur?.id));

  const filtrees = useMemo(() => {
    const termes = vue.recherche.toLowerCase().split(/\s+/).filter(Boolean);
    let r = termes.length
      ? lignes.filter((l) => {
        const texte = colonnes.map((c) => c.valeur(l)).filter((v) => v !== null && v !== undefined).join(" ").toLowerCase();
        return termes.every((t) => texte.includes(t));
      })
      : lignes;
    const tri = vue.tri && colonnes.find((c) => c.id === vue.tri!.colonne);
    if (tri) {
      const sens = vue.tri!.sens === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => sens * comparer(tri.valeur(a), tri.valeur(b)));
    }
    return r;
  }, [lignes, colonnes, vue.recherche, vue.tri]);

  const rangees = useMemo((): Rangee<T>[] => {
    if (!colonneGroupe) return filtrees.map((ligne) => ({ type: "ligne", ligne }));
    const groupes = new Map<string, T[]>();
    for (const l of filtrees) {
      const v = colonneGroupe.valeur(l);
      const k = v === null || v === undefined || v === "" ? "(non renseigné)" : String(v);
      groupes.set(k, [...(groupes.get(k) ?? []), l]);
    }
    return [...groupes.entries()].sort(([a], [b]) => comparer(a, b)).flatMap(([k, ls]): Rangee<T>[] => [
      { type: "groupe", cle: k, libelle: k, lignes: ls },
      ...ls.map((ligne): Rangee<T> => ({ type: "ligne", ligne })),
    ]);
  }, [filtrees, colonneGroupe]);

  const somme = (c: Colonne<T>, ls: T[]) => ls.reduce((s, l) => s + (Number(c.valeur(l)) || 0), 0);
  const avecTotaux = visibles.some((c) => c.total);

  // Affichage fenêtré : seules les lignes visibles à l'écran sont dans la page
  const fenetre = rangees.length > SEUIL_FENETRE;
  const debut = fenetre ? Math.max(0, Math.floor(defilement / HAUTEUR_LIGNE) - 10) : 0;
  const fin = fenetre ? Math.min(rangees.length, debut + 60) : rangees.length;

  const trier = (colonne: string) => setVue((v) => ({
    ...v,
    tri: v.tri?.colonne !== colonne ? { colonne, sens: "asc" } : v.tri.sens === "asc" ? { colonne, sens: "desc" } : null,
  }));

  const exporter = () => {
    const entetes = visibles.map((c) => c.titre);
    const donnees = filtrees.map((l) => visibles.map((c): Cellule => {
      const v = c.valeur(l);
      return c.type === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(`${v.slice(0, 10)}T00:00:00`) : v;
    }));
    telechargerXlsx(nomFichier(`prism-${id}`), [{
      nom: id, lignes: [entetes, ...donnees],
      largeurs: visibles.map((c) => (c.type === "montant" || c.type === "nombre" ? 16 : c.type === "date" ? 12 : 30)),
      montants: visibles.flatMap((c, i) => (c.type === "montant" ? [i] : [])),
    }]);
  };

  /** Collage d'un bloc copié depuis Excel : remplit les cellules modifiables vers le bas et la droite */
  const coller = (e: ClipboardEvent, ligne: T, colonne: Colonne<T>) => {
    const texte = e.clipboardData.getData("text/plain");
    if (!texte.includes("\n") && !texte.includes("\t")) return;
    e.preventDefault();
    const bloc = texte.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((r) => r.split("\t"));
    const editables = visibles.filter((c) => c.edition);
    const c0 = editables.indexOf(colonne);
    const l0 = filtrees.indexOf(ligne);
    bloc.forEach((valeurs, i) => {
      const cible = filtrees[l0 + i];
      if (!cible) return;
      valeurs.forEach((v, j) => editables[c0 + j]?.edition?.enregistrer(cible, v.trim()));
    });
  };

  const enregistrerVue = () => {
    const nom = (document.getElementById(`vue-${id}`) as HTMLInputElement | null)?.value.trim();
    if (!nom) return;
    ajouter("vues", { id: nouvelId("vue"), proprietaireId: utilisateur?.id, table: id, nom, definition: vue as unknown as Record<string, unknown>, partagee: false });
    setMenu(null);
  };

  if (lignes.length === 0 && vide) return <>{vide}</>;

  return (
    <div>
      {!simple && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 pas-impression">
          <div className="relative min-w-40 flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={vue.recherche} onChange={(e) => setVue((v) => ({ ...v, recherche: e.target.value }))} placeholder="Filtrer…" aria-label="Filtrer le tableau"
              className="h-8 w-full max-w-xs rounded-lg bg-slate-50 pl-8 pr-3 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-brand-500 dark:bg-slate-800 dark:focus:bg-slate-900" />
          </div>
          {barre}
          {colonnes.some((c) => c.groupable) && (
            <select value={vue.groupe} onChange={(e) => setVue((v) => ({ ...v, groupe: e.target.value }))} aria-label="Regrouper par"
              className="h-8 rounded-lg bg-white px-2 text-xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <option value="">Sans regroupement</option>
              {colonnes.filter((c) => c.groupable).map((c) => <option key={c.id} value={c.id}>Par {c.titre.toLowerCase()}</option>)}
            </select>
          )}
          <div className="relative">
            <Bouton libre taille="sm" variante="fantome" icone={<Columns3 size={14} />} onClick={() => setMenu(menu === "colonnes" ? null : "colonnes")}>Colonnes</Bouton>
            {menu === "colonnes" && (
              <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                {colonnes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={!vue.masquees.includes(c.id)}
                      onChange={() => setVue((v) => ({ ...v, masquees: v.masquees.includes(c.id) ? v.masquees.filter((x) => x !== c.id) : [...v.masquees, c.id] }))} />
                    {c.titre}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <Bouton libre taille="sm" variante="fantome" icone={<Bookmark size={14} />} onClick={() => setMenu(menu === "vues" ? null : "vues")}>Vues{mesVues.length ? ` (${mesVues.length})` : ""}</Bouton>
            {menu === "vues" && (
              <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                {mesVues.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-500">Aucune vue enregistrée pour ce tableau.</p>}
                {mesVues.map((v) => (
                  <div key={v.id} className="flex items-center gap-1">
                    <button type="button" className="flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => { setVue(v.definition as unknown as DefinitionVue); setMenu(null); }}>{v.nom}</button>
                    <button type="button" aria-label={`Supprimer la vue ${v.nom}`} className="rounded p-1 text-slate-400 hover:text-rose-600" onClick={() => supprimer("vues", v.id)}><Trash2 size={13} /></button>
                  </div>
                ))}
                <div className="mt-2 flex gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
                  <input id={`vue-${id}`} placeholder="Nom de la vue actuelle" className="h-8 min-w-0 flex-1 rounded-lg bg-slate-50 px-2 text-sm outline-none focus:ring-1 focus:ring-brand-500 dark:bg-slate-800"
                    onKeyDown={(e) => e.key === "Enter" && enregistrerVue()} />
                  <Bouton libre taille="sm" onClick={enregistrerVue}>Enregistrer</Bouton>
                </div>
              </div>
            )}
          </div>
          <Bouton libre taille="sm" variante="fantome" icone={<Download size={14} />} onClick={exporter} title="Exporter les lignes affichées vers Excel">Excel</Bouton>
          <span className="text-xs text-slate-400 num">{filtrees.length}{filtrees.length !== lignes.length ? ` / ${lignes.length}` : ""} ligne{filtrees.length > 1 ? "s" : ""}</span>
        </div>
      )}
      <div ref={conteneur} className={cx("overflow-auto", fenetre && "max-h-[70vh]")} onScroll={fenetre ? (e) => setDefilement(e.currentTarget.scrollTop) : undefined}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
            <tr>
              {visibles.map((c) => {
                const nombre = c.type === "montant" || c.type === "nombre" || c.type === "pourcent";
                const tri = vue.tri?.colonne === c.id ? vue.tri.sens : null;
                return (
                  <th key={c.id} style={{ width: c.largeur }} aria-sort={tri === "asc" ? "ascending" : tri === "desc" ? "descending" : undefined}
                    className={cx("whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500", nombre ? "text-right" : "text-left")}>
                    <button type="button" className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800 dark:hover:text-white" onClick={() => trier(c.id)}>
                      {c.titre}
                      {tri === "asc" && <ArrowUp size={12} />}
                      {tri === "desc" && <ArrowDown size={12} />}
                    </button>
                  </th>
                );
              })}
              {actions && <th className="w-px" />}
            </tr>
          </thead>
          <tbody>
            {debut > 0 && <tr style={{ height: debut * HAUTEUR_LIGNE }}><td colSpan={visibles.length + 1} /></tr>}
            {rangees.slice(debut, fin).map((r) => {
              if (r.type === "groupe") {
                return (
                  <tr key={`g-${r.cle}`} className="border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50">
                    {visibles.map((c, i) => (
                      <td key={c.id} className={cx("px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200", i > 0 && "text-right num")}>
                        {i === 0 ? <>{r.libelle} <span className="font-normal text-slate-400">· {r.lignes.length}</span></> : c.total ? formater(somme(c, r.lignes), c.type) : null}
                      </td>
                    ))}
                    {actions && <td />}
                  </tr>
                );
              }
              const l = r.ligne;
              return (
                <tr key={cle(l)} className={cx("border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/30", onOuvrir && "cursor-pointer", classeLigne?.(l))}
                  onClick={onOuvrir ? () => onOuvrir(l) : undefined}>
                  {visibles.map((c) => {
                    const nombre = c.type === "montant" || c.type === "nombre" || c.type === "pourcent";
                    const edition = !lecture && c.edition;
                    return (
                      // Une ligne = une hauteur : le texte long est coupé (et lisible au survol), jamais replié
                      <td key={c.id} className={cx("px-4 py-2.5", nombre && "text-right num", edition && "!py-1", !edition && !c.rendu && "max-w-md truncate whitespace-nowrap")}
                        title={!edition && !c.rendu && !nombre ? String(c.valeur(l) ?? "") || undefined : undefined} onClick={edition ? (e) => e.stopPropagation() : undefined}>
                        {edition ? <CelluleSaisie colonne={c} ligne={l} onColler={(e) => coller(e, l, c)} /> : c.rendu ? c.rendu(l) : formater(c.valeur(l), c.type)}
                      </td>
                    );
                  })}
                  {actions && <td className="whitespace-nowrap px-2 py-1 text-right" onClick={(e) => e.stopPropagation()}>{actions(l)}</td>}
                </tr>
              );
            })}
            {fin < rangees.length && <tr style={{ height: (rangees.length - fin) * HAUTEUR_LIGNE }}><td colSpan={visibles.length + 1} /></tr>}
            {filtrees.length === 0 && (
              <tr><td colSpan={visibles.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">Aucune ligne ne correspond au filtre.</td></tr>
            )}
          </tbody>
          {avecTotaux && filtrees.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold dark:border-slate-700 dark:bg-slate-800/50">
                {visibles.map((c, i) => (
                  <td key={c.id} className={cx("px-4 py-2.5", i > 0 && "text-right num")}>{i === 0 && !c.total ? "Total" : c.total ? formater(somme(c, filtrees), c.type) : null}</td>
                ))}
                {actions && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/** Cellule modifiable : la valeur est enregistrée à la sortie du champ ou sur Entrée */
function CelluleSaisie<T>({ colonne, ligne, onColler }: { colonne: Colonne<T>; ligne: T; onColler: (e: ClipboardEvent) => void }) {
  const e = colonne.edition!;
  const v = colonne.valeur(ligne);
  const initiale = v === null || v === undefined ? "" : String(v);
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const valider = () => {
    if (brouillon !== null && brouillon !== initiale) e.enregistrer(ligne, brouillon);
    setBrouillon(null);
  };
  if (e.type === "liste") {
    return (
      <select className="cellule-saisie" value={initiale} aria-label={colonne.titre} onChange={(ev) => e.enregistrer(ligne, ev.target.value)}>
        {!e.options?.includes(initiale) && <option value={initiale}>{initiale || "—"}</option>}
        {e.options?.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input className={cx("cellule-saisie", e.type === "nombre" && "text-right num")} aria-label={colonne.titre}
      type={e.type === "date" ? "date" : "text"} inputMode={e.type === "nombre" ? "decimal" : undefined}
      value={brouillon ?? (e.type === "nombre" && typeof v === "number" ? formatNombre(v) : initiale)}
      onFocus={(ev) => { setBrouillon(initiale); requestAnimationFrame(() => ev.target.select()); }}
      onChange={(ev) => setBrouillon(ev.target.value)}
      onBlur={valider}
      onPaste={onColler}
      onKeyDown={(ev) => {
        if (ev.key === "Enter") ev.currentTarget.blur();
        if (ev.key === "Escape") { setBrouillon(null); requestAnimationFrame(() => (ev.target as HTMLInputElement).blur()); }
      }} />
  );
}

/** Nombre saisi par l'utilisateur : accepte « 1'250.50 », « 1 250,5 », « 12 % » */
export function lireNombre(s: string): number {
  const n = Number(s.replace(/['’\s\u00a0%]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
