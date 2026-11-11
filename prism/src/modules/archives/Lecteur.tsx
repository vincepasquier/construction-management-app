// Lecteur d'archive, en lecture seule : le projet tel qu'il a été figé, collection par collection,
// avec son historique et une recherche dans tout le contenu.
import { ArrowLeft, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Alerte, Badge, Carte, cx, Saisie } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import type { ArchiveRegistre } from "@/domaine/socle/types";
import { chercherDansArchive, type ResultatControle } from "@/donnees/archive";
import { resumerValeur } from "@/donnees/diff";
import { META, type DocQuelconque, type NomCollection } from "@/donnees/schema";

const libelle = (c: string) => (c === "projets" ? "Projet et sous-projets" : c === "journal" ? "Historique" : META[c as NomCollection]?.libelle ?? c);

/** Colonnes présentées pour une collection : les champs simples les plus renseignés */
function colonnesDe(docs: DocQuelconque[]): string[] {
  const compte = new Map<string, number>();
  for (const d of docs) for (const [k, v] of Object.entries(d)) if (k !== "id" && k !== "projetId" && v !== undefined && v !== null && v !== "" && typeof v !== "object") compte.set(k, (compte.get(k) ?? 0) + 1);
  const ordre = ["code", "numero", "nom", "titre", "objet", "libelle", "statut", "date", "montant"];
  return [...compte.entries()].sort((a, b) => (ordre.indexOf(a[0]) + 100) % 100 - (ordre.indexOf(b[0]) + 100) % 100 || b[1] - a[1]).slice(0, 7).map(([k]) => k);
}

export function Lecteur({ archive, resultat, onFermer }: { archive: ArchiveRegistre; resultat: ResultatControle; onFermer: () => void }) {
  const contenu = resultat.contenu;
  const [collection, setCollection] = useState("projets");
  const [requete, setRequete] = useState("");
  const [detail, setDetail] = useState<DocQuelconque | null>(null);
  const trouves = useMemo(() => (contenu && requete.trim().length > 1 ? chercherDansArchive(contenu, requete) : []), [contenu, requete]);

  if (!contenu) return <><Retour onFermer={onFermer} /><Alerte type="erreur"><p className="font-medium">Cette archive ne peut pas être lue.</p><ul className="mt-1 list-disc pl-5">{resultat.ecarts.map((e) => <li key={e}>{e}</li>)}</ul></Alerte></>;

  const references = contenu.references;
  const nomDe = (id: unknown) => (typeof id === "string" ? (references.personnes?.find((p) => p.id === id) as { nom?: string } | undefined)?.nom ?? (references.entreprises?.find((e) => e.id === id) as { nom?: string } | undefined)?.nom : undefined);
  const valeur = (v: unknown) => nomDe(v) ?? (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDate(v) : resumerValeur(v));
  const docs = (c: string): DocQuelconque[] => (c === "projets" ? contenu.projets : (contenu.collections as Record<string, DocQuelconque[]>)[c] ?? []);
  const sections = ["projets", ...Object.keys(contenu.collections).sort((a, b) => libelle(a).localeCompare(libelle(b), "fr")), "journal"];
  const courants = docs(collection);
  const colonnes = colonnesDe(courants);
  const ouvrir = (c: string, id: string) => { setCollection(c); setDetail(docs(c).find((d) => d.id === id) ?? null); };

  return (
    <div className="space-y-5">
      <Retour onFermer={onFermer} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{contenu.projet.code} · {contenu.projet.nom}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Badge>Archive en lecture seule</Badge>figée le {formatDate(contenu.date)}{contenu.auteur ? ` par ${contenu.auteur}` : ""} · {(archive.taille / 1024).toFixed(0)} Ko</p>
        </div>
        {resultat.conforme
          ? <p className="flex items-center gap-1.5 text-sm text-emerald-600"><ShieldCheck size={16} /> Empreinte et manifeste conformes</p>
          : <p className="flex items-center gap-1.5 text-sm font-medium text-rose-600"><ShieldAlert size={16} /> Archive non conforme</p>}
      </div>
      {!resultat.conforme && <Alerte type="erreur"><ul className="list-disc pl-5">{resultat.ecarts.map((e) => <li key={e}>{e}</li>)}</ul></Alerte>}

      <div className="relative max-w-xl">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Saisie libre aria-label="Rechercher dans l'archive" className="pl-9" placeholder="Rechercher dans tout le contenu de l'archive…" value={requete} onChange={(e) => setRequete(e.target.value)} />
      </div>
      {requete.trim().length > 1 && (
        <Carte titre={`${trouves.length} résultat(s)`}>
          {trouves.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">Rien ne correspond dans cette archive.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{trouves.map((r) => (
              <li key={`${r.collection}-${r.id}`}><button type="button" className="flex w-full items-start gap-3 px-5 py-2 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40" onClick={() => ouvrir(r.collection, r.id)}><span className="w-44 shrink-0"><Badge>{libelle(r.collection)}</Badge></span><span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">…{r.extrait}…</span></button></li>
            ))}</ul>
          )}
        </Carte>
      )}

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Contenu de l'archive" className="self-start rounded-xl bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          {sections.map((c) => (
            <button key={c} type="button" onClick={() => { setCollection(c); setDetail(null); }} className={cx("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm", collection === c ? "bg-brand-50 font-medium text-brand-700 dark:bg-sky-950 dark:text-sky-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
              <span className="truncate">{libelle(c)}</span><span className="text-xs text-slate-400 num">{c === "journal" ? contenu.journal.length : docs(c).length}</span>
            </button>
          ))}
        </nav>

        {collection === "journal" ? (
          <Carte titre="Historique des modifications">
            <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {[...contenu.journal].reverse().map((e) => (
                <li key={e.seq} className="px-5 py-2 text-sm"><span className="mr-3 text-xs text-slate-500 num">{formatDate(e.date)}</span>{e.libelle}<span className="ml-2 text-xs text-slate-500">{nomDe(e.acteurId) ?? "Système"} · {e.origine}{e.motif ? ` · motif : ${e.motif}` : ""}</span></li>
              ))}
            </ul>
          </Carte>
        ) : (
          <div className="space-y-5">
            <Carte titre={libelle(collection)} sousTitre={`${courants.length} enregistrement(s)`}>
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500 dark:bg-slate-800"><tr>{colonnes.map((c) => <th key={c} className="px-4 py-2 font-medium">{c}</th>)}</tr></thead>
                  <tbody>{courants.map((d) => (
                    <tr key={d.id} onClick={() => setDetail(d)} className={cx("cursor-pointer border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40", detail?.id === d.id && "bg-brand-50/60 dark:bg-sky-950/40")}>
                      {colonnes.map((c) => <td key={c} className="max-w-xs truncate px-4 py-2">{valeur((d as unknown as Record<string, unknown>)[c])}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Carte>
            {detail && (
              <Carte titre="Enregistrement" sousTitre={`Identifiant ${detail.id}`}>
                <dl className="grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
                  {Object.entries(detail).filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
                    <div key={k} className={cx("min-w-0", typeof v === "object" && "sm:col-span-2")}>
                      <dt className="text-xs text-slate-500">{k}</dt>
                      <dd className="mt-0.5 break-words">{typeof v === "object" ? <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800">{JSON.stringify(v, null, 1)}</pre> : valeur(v)}</dd>
                    </div>
                  ))}
                </dl>
              </Carte>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Retour({ onFermer }: { onFermer: () => void }) {
  return <button type="button" onClick={onFermer} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={14} /> Registre des archives</button>;
}
