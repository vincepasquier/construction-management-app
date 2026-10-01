import { useEffect, useRef } from "react";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { COULEUR_NOEUD, enfants } from "../lib/organigramme";
import type { NoeudOrganigramme } from "../types";
import { Avatar, cx } from "./ui";

interface Proprietes {
  noeuds: NoeudOrganigramme[];
  edition?: boolean;
  onAjouter?: (parentId: string) => void;
  onModifier?: (n: NoeudOrganigramme) => void;
  onSupprimer?: (n: NoeudOrganigramme) => void;
}

/** Renseignements affichés pour un nœud : membre de l'équipe, entreprise ou nom libre */
export function useOccupant(n: NoeudOrganigramme) {
  const { personnes, entreprises } = useStore();
  const p = personnes.find((x) => x.id === n.personneId);
  const e = entreprises.find((x) => x.id === n.entrepriseId);
  return {
    nom: p?.nom ?? e?.nom ?? n.nomLibre ?? "",
    detail: p ? p.organisation : e ? [e.contact, e.localite].filter(Boolean).join(" · ") : "",
    email: p?.email ?? e?.email,
    telephone: p?.telephone ?? e?.telephone,
    estPersonne: !!p,
  };
}

function Carte({ n, edition, onAjouter, onModifier, onSupprimer }: { n: NoeudOrganigramme } & Omit<Proprietes, "noeuds">) {
  const o = useOccupant(n);
  const couleur = COULEUR_NOEUD[n.type];
  return (
    <div className="group relative w-48 rounded-xl bg-white text-left shadow-sm ring-1 ring-slate-200 transition hover:shadow-md dark:bg-slate-900 dark:ring-slate-700">
      <div className="h-1.5 rounded-t-xl" style={{ background: couleur }} />
      <div className="px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: couleur }}>{n.type}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">{n.titre}</p>
        {o.nom ? (
          <div className="mt-2 flex items-center gap-2">
            {o.estPersonne && <Avatar nom={o.nom} taille={24} />}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{o.nom}</p>
              {o.detail && <p className="truncate text-[11px] text-slate-500">{o.detail}</p>}
            </div>
          </div>
        ) : <p className="mt-2 text-xs italic text-slate-400">À attribuer</p>}
        {(o.email || o.telephone) && (
          <div className="mt-1.5 flex gap-2 text-slate-400">
            {o.email && <a href={`mailto:${o.email}`} title={o.email} className="hover:text-brand-600"><Mail size={13} /></a>}
            {o.telephone && <a href={`tel:${o.telephone}`} title={o.telephone} className="hover:text-brand-600"><Phone size={13} /></a>}
          </div>
        )}
      </div>
      {edition && (
        <div className="pas-impression absolute -right-2 -top-2 hidden gap-1 group-hover:flex">
          <button onClick={() => onAjouter?.(n.id)} title="Ajouter un subordonné" className="rounded-full bg-brand-600 p-1 text-white shadow"><Plus size={12} /></button>
          <button onClick={() => onModifier?.(n)} title="Modifier" className="rounded-full bg-white p-1 text-slate-600 shadow ring-1 ring-slate-200"><Pencil size={12} /></button>
          {n.parentId && <button onClick={() => onSupprimer?.(n)} title="Supprimer" className="rounded-full bg-white p-1 text-rose-600 shadow ring-1 ring-slate-200"><Trash2 size={12} /></button>}
        </div>
      )}
    </div>
  );
}

function Cadre({ liste, ...p }: { liste: NoeudOrganigramme[] } & Proprietes) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-2 dark:border-slate-600 dark:bg-slate-800/30">
      {liste.map((x) => <Carte key={x.id} n={x} {...p} />)}
    </div>
  );
}

function Branche({ n, ...p }: { n: NoeudOrganigramme } & Proprietes) {
  const sous = enfants(p.noeuds, n.id);
  const sansSuite = sous.filter((x) => enfants(p.noeuds, x.id).length === 0);
  const avecSuite = sous.filter((x) => enfants(p.noeuds, x.id).length > 0);
  const feuilles = sous.length > 4 && !avecSuite.length;
  // Branches mixtes : les postes sans subordonné sont réunis dans un cadre, à côté des branches
  const mixte = !feuilles && avecSuite.length > 0 && sansSuite.length >= 3;
  return (
    <li>
      <Carte n={n} {...p} />
      {sous.length > 0 && (feuilles ? (
        // Des subordonnés de même niveau sans descendance sont regroupés dans un cadre, pour garder l'arbre compact
        <div className="relative pt-[22px]">
          <span className="absolute top-0 left-1/2 h-[22px] border-l-[1.5px] border-slate-300 dark:border-slate-600" />
          <Cadre liste={sous} {...p} />
        </div>
      ) : mixte ? (
        <ul>
          <li><Cadre liste={sansSuite} {...p} /></li>
          {avecSuite.map((x) => <Branche key={x.id} n={x} {...p} />)}
        </ul>
      ) : (
        <ul>{sous.map((x) => <Branche key={x.id} n={x} {...p} />)}</ul>
      ))}
    </li>
  );
}

export function ArbreOrganigramme(p: Proprietes) {
  const racines = enfants(p.noeuds, undefined).concat(
    // Nœuds dont le parent a disparu : affichés comme racines pour ne rien perdre
    p.noeuds.filter((x) => x.parentId && !p.noeuds.some((y) => y.id === x.parentId)),
  );
  const ref = useRef<HTMLDivElement>(null);
  // Organigramme plus large que l'écran : la vue s'ouvre centrée sur la racine
  useEffect(() => {
    const el = ref.current;
    let parent = el?.parentElement;
    while (parent && parent.scrollWidth <= parent.clientWidth) parent = parent.parentElement;
    const racine = el?.querySelector("li > div");
    if (!parent || !racine) return;
    const r = racine.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    parent.scrollLeft += r.left + r.width / 2 - (pr.left + pr.width / 2);
  }, [p.noeuds.length]);
  return (
    <div ref={ref} className={cx("org min-w-max px-6 py-6")}>
      <ul>{racines.map((r) => <Branche key={r.id} n={r} {...p} />)}</ul>
    </div>
  );
}

export function LegendeOrganigramme() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
      {Object.entries(COULEUR_NOEUD).map(([t, c]) => (
        <span key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{t}</span>
      ))}
    </div>
  );
}
