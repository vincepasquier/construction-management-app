import { DemandesADecider } from "./DemandesAcces";
import { useState } from "react";
import { ChevronDown, Info, KeyRound, RotateCcw, X } from "lucide-react";
import { useDonnees } from "@/donnees/hooks";
import { accesDe, confidentialiteMax, DESCRIPTION_PROFIL, DROITS_PROFIL, LIBELLE_NIVEAU, MODULES, niveau, PROFILS } from "@/domaine/socle/droits";
import { CONFIDENTIALITES } from "@/domaine/socle/types";
import { Avatar, Badge, Bouton, Carte, cx, EnTetePage, Liste, useLectureSeule } from "@/app/ui";
import type { AccesPersonne, Confidentialite, ModuleApp, NiveauAcces, Personne, ProfilAcces } from "@/domaine/types";

const COULEUR_NIVEAU: Record<NiveauAcces, string> = {
  aucun: "bg-slate-100 text-slate-400 dark:bg-slate-800",
  lecture: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  ecriture: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function Acces() {
  const { personnes, projets, directions, modifier } = useDonnees();
  const lecture = useLectureSeule();
  const [ouvert, setOuvert] = useState<string | null>(null);

  const majAcces = (p: Personne, patch: Partial<AccesPersonne>) => modifier("personnes", p.id, { acces: { ...accesDe(p), ...patch } });
  const admins = personnes.filter((p) => accesDe(p).profil === "Administrateur");

  return (
    <>
      <EnTetePage titre="Gestion des accès" description="Profil, projets accessibles et droits par module pour chaque membre" />

      <div className="mb-6 flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          Le <strong>profil</strong> fixe les droits par défaut ; vous pouvez ensuite ajuster chaque module (<em>Aucun</em>, <em>Lecture</em>, <em>Modification</em>).
          Le <strong>périmètre</strong> (projets, directions, niveau de confidentialité) borne ce que la personne voit, y compris dans la recherche et les exports.
          Les droits sont contrôlés à chaque écriture et chaque modification d'accès est inscrite au journal. Les données restant dans le navigateur et
          l'identité étant simulée, ce contrôle n'est pas encore une protection de sécurité : celle-ci viendra avec le serveur de données et le compte du groupe.
        </p>
      </div>

      <DemandesADecider />
      <Carte>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...personnes].sort((x, y) => x.nom.localeCompare(y.nom, "fr")).map((p) => {
            const a = accesDe(p);
            const deplie = ouvert === p.id;
            const derogations = Object.keys(a.modules).length;
            const dernierAdmin = a.profil === "Administrateur" && admins.length === 1;
            return (
              <div key={p.id}>
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="flex w-60 items-center gap-3">
                    <Avatar nom={p.nom} taille={34} />
                    <div className="min-w-0"><p className="truncate font-medium">{p.nom}</p><p className="truncate text-xs text-slate-500">{p.role} · {p.email}</p></div>
                  </div>
                  <div className="w-56">
                    <Liste value={a.profil} disabled={dernierAdmin} title={dernierAdmin ? "Il doit rester au moins un administrateur" : undefined}
                      onChange={(e) => majAcces(p, { profil: e.target.value as ProfilAcces, modules: {} })}>
                      {PROFILS.map((x) => <option key={x}>{x}</option>)}
                    </Liste>
                    <p className="mt-1 text-xs text-slate-500">{DESCRIPTION_PROFIL[a.profil]}</p>
                  </div>
                  <div className="min-w-60 flex-1">
                    <p className="mb-1 text-xs font-medium text-slate-500">Périmètre : projets et directions</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button type="button" disabled={lecture} onClick={() => majAcces(p, { projets: a.projets === "tous" ? [] : "tous", directions: a.projets === "tous" ? a.directions : [] })}
                        className={cx("rounded-full px-2.5 py-1 text-xs ring-1", a.projets === "tous" ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200 dark:ring-slate-700")}>Tous les projets</button>
                      {a.projets !== "tous" && (a.directions ?? []).map((id) => {
                        const x = directions.find((y) => y.id === id);
                        return x && (
                          <button key={id} type="button" disabled={lecture} title={`Tous les projets de la direction ${x.nom} — retirer`}
                            onClick={() => majAcces(p, { directions: (a.directions ?? []).filter((y) => y !== id) })}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900">Direction {x.code} <X size={11} /></button>
                        );
                      })}
                      {a.projets !== "tous" && (a.projets as string[]).map((id) => {
                        const x = projets.find((y) => y.id === id);
                        return x && (
                          <button key={id} type="button" disabled={lecture} title={`${x.nom} — retirer`}
                            onClick={() => majAcces(p, { projets: (a.projets as string[]).filter((y) => y !== id) })}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 ring-1 ring-brand-300 dark:bg-sky-950 dark:text-sky-200">{x.code} <X size={11} /></button>
                        );
                      })}
                      {a.projets !== "tous" && !lecture && (
                        <select aria-label={`Ajouter au périmètre de ${p.nom}`} value="" className="h-7 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-2 text-xs text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-900"
                          onChange={(e) => {
                            const [genre, id] = e.target.value.split("|");
                            if (genre === "d") majAcces(p, { directions: [...(a.directions ?? []), id] });
                            if (genre === "p") majAcces(p, { projets: [...(a.projets as string[]), id] });
                          }}>
                          <option value="">+ Ajouter…</option>
                          <optgroup label="Directions (tous leurs projets)">
                            {directions.filter((x) => !(a.directions ?? []).includes(x.id)).map((x) => <option key={x.id} value={`d|${x.id}`}>{x.code} · {x.nom}</option>)}
                          </optgroup>
                          <optgroup label="Projets">
                            {projets.filter((x) => !x.archive && !(a.projets as string[]).includes(x.id)).map((x) => <option key={x.id} value={`p|${x.id}`}>{x.code} · {x.nom}</option>)}
                          </optgroup>
                        </select>
                      )}
                      {a.projets !== "tous" && (a.projets as string[]).length === 0 && (a.directions ?? []).length === 0 && <span className="text-xs text-amber-600">Aucun projet visible</span>}
                    </div>
                  </div>
                  <div className="w-52">
                    <p className="mb-1 text-xs font-medium text-slate-500">Confidentialité max.</p>
                    <Liste value={confidentialiteMax(p)} onChange={(e) => majAcces(p, { confidentialiteMax: e.target.value as Confidentialite })}>
                      {CONFIDENTIALITES.map((c) => <option key={c}>{c}</option>)}
                    </Liste>
                  </div>
                  <Bouton libre taille="sm" variante="fantome" onClick={() => setOuvert(deplie ? null : p.id)}>
                    Droits détaillés{derogations > 0 && <Badge couleur="orange">{derogations} dérogation(s)</Badge>}
                    <ChevronDown size={14} className={cx("transition", deplie && "rotate-180")} />
                  </Bouton>
                </div>
                {deplie && (
                  <div className="bg-slate-50/60 px-5 pb-5 dark:bg-slate-900/40">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {MODULES.map((m) => {
                        const n = niveau(p, m.id);
                        const derogation = a.modules[m.id] !== undefined;
                        return (
                          <div key={m.id} className="flex items-center gap-3 rounded-lg bg-white p-2.5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{m.libelle}</p>
                              <p className="truncate text-xs text-slate-500">{derogation ? `Profil : ${LIBELLE_NIVEAU[DROITS_PROFIL[a.profil][m.id]]}` : m.description}</p>
                            </div>
                            <div className="flex overflow-hidden rounded-md ring-1 ring-slate-200 dark:ring-slate-700">
                              {(["aucun", "lecture", "ecriture"] as NiveauAcces[]).map((v) => (
                                <button key={v} type="button" disabled={lecture || (dernierAdmin && m.id === "acces")}
                                  onClick={() => {
                                    const modules = { ...a.modules } as Record<ModuleApp, NiveauAcces>;
                                    if (v === DROITS_PROFIL[a.profil][m.id]) delete modules[m.id]; else modules[m.id] = v;
                                    majAcces(p, { modules });
                                  }}
                                  className={cx("px-2 py-1 text-[11px] font-medium transition", n === v ? COULEUR_NIVEAU[v] + " ring-1 ring-inset ring-current/30" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800")}>
                                  {LIBELLE_NIVEAU[v]}
                                </button>
                              ))}
                            </div>
                            {derogation && <span className="h-2 w-2 rounded-full bg-amber-500" title="Dérogation au profil" />}
                          </div>
                        );
                      })}
                    </div>
                    {derogations > 0 && (
                      <Bouton taille="sm" variante="fantome" className="mt-3" icone={<RotateCcw size={14} />} onClick={() => majAcces(p, { modules: {} })}>Revenir aux droits du profil</Bouton>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Carte>

      <Carte className="mt-6" titre={<span className="flex items-center gap-2"><KeyRound size={16} /> Droits par profil</span>} sousTitre="Référence des droits par défaut">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-500"><th className="px-4 py-2 text-left font-medium">Module</th>{PROFILS.map((p) => <th key={p} className="px-2 py-2 font-medium">{p}</th>)}</tr></thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-1.5">{m.libelle}</td>
                  {PROFILS.map((p) => {
                    const v = DROITS_PROFIL[p][m.id];
                    return <td key={p} className="px-2 py-1.5 text-center"><span className={cx("inline-block rounded px-2 py-0.5 text-[11px] font-medium", COULEUR_NIVEAU[v])}>{LIBELLE_NIVEAU[v]}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </>
  );
}
