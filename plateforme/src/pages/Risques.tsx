import { useState } from "react";
import { ListPlus, Plus, ShieldAlert, Sparkles, X } from "lucide-react";
import { useDroit, useProjetActif, useStore } from "../store/useStore";
import { COULEUR_CRITICITE, criticite, estActif, exposition, score } from "../lib/risques";
import { aujourdhui, formatCHF, formatCompact, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import { appelIA } from "../lib/ia";
import { construireContexte } from "../lib/contexteIA";
import { FormulaireAction, nouvelleAction } from "../components/FormulaireAction";
import { Avatar, Badge, BadgeStatut, Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Liste, Modale, Onglets, Saisie, Tableau, Vide, Zone } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { Action, CategorieRisque, Risque, StatutRisque } from "../types";

export const CATEGORIES_RISQUE: CategorieRisque[] = ["Technique", "Financier", "Délais", "Juridique", "Environnement", "Sécurité", "Organisation", "Tiers"];
const STATUTS: StatutRisque[] = ["Ouvert", "En traitement", "Survenu", "Clos"];
const PROBA = ["", "Rare", "Peu probable", "Possible", "Probable", "Quasi certain"];
const IMPACT = ["", "Négligeable", "Mineur", "Modéré", "Important", "Majeur"];

function BadgeCriticite({ r }: { r: Pick<Risque, "probabilite" | "impact"> }) {
  const s = score(r);
  const c = criticite(s);
  return <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: COULEUR_CRITICITE[c] }}>{s} · {c}</span>;
}

type SuggestionRisque = Pick<Risque, "titre" | "description" | "categorie" | "probabilite" | "impact" | "mesures" | "impactFinancier">;

export function Risques() {
  const d = useProjetActif();
  const { personnes, entreprises, ajouter, modifier } = useStore();
  const [vue, setVue] = useState<"registre" | "personnes">("registre");
  const [cellule, setCellule] = useState<{ p: number; i: number } | null>(null);
  const [voirClos, setVoirClos] = useState(false);
  const [edition, setEdition] = useState<Risque | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [suggestions, setSuggestions] = useState<(SuggestionRisque & { garder: boolean })[] | null>(null);
  const [chargementIA, setChargementIA] = useState(false);
  const droitIA = useDroit("ia");
  if (!d.projet) return <SansProjet />;
  const projet = d.projet;
  const nomPers = (id?: string) => personnes.find((p) => p.id === id)?.nom;

  const actifs = d.risques.filter(estActif);
  const liste = d.risques
    .filter((r) => (voirClos || r.statut !== "Clos") && (!cellule || (r.probabilite === cellule.p && r.impact === cellule.i)))
    .sort((a, b) => score(b) - score(a));

  const suggerer = async () => {
    setChargementIA(true);
    try {
      const contexte = construireContexte({ ...d, projet, entreprises, personnes }, aujourdhui());
      const res = await appelIA<{ risques: SuggestionRisque[] }>("risques", { contexte });
      setSuggestions(res.risques.map((r) => ({ ...r, garder: true })));
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setChargementIA(false);
    }
  };

  const prochainCode = (decalage = 0) => `R-${String(d.risques.length + 1 + decalage).padStart(2, "0")}`;
  const nouveau = (): Risque => ({
    id: nouvelId("rsk"), projetId: projet.id, code: prochainCode(), titre: "", description: "", categorie: "Technique", probabilite: 3, impact: 3,
    impactFinancier: 0, statut: "Ouvert", mesures: "", dateIdentification: aujourdhui(),
  });

  return (
    <>
      <EnTetePage titre="Risques" description="Identification, évaluation et suivi des risques du projet"
        actions={<>
          {droitIA.ecrire && <Bouton icone={<Sparkles size={15} />} disabled={chargementIA} onClick={suggerer}>{chargementIA ? "Analyse en cours…" : "Suggérer avec l'IA"}</Bouton>}
          <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setEdition(nouveau())}>Risque</Bouton>
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Risques actifs" valeur={actifs.length} detail={`${d.risques.filter((r) => r.statut === "Clos").length} clos`} />
        <Indicateur libelle="Critiques" valeur={actifs.filter((r) => score(r) >= 15).length} tendance={actifs.some((r) => score(r) >= 15) ? "mauvais" : "bon"} detail="score ≥ 15" />
        <Indicateur libelle="Exposition pondérée" valeur={formatCompact(exposition(d.risques))} detail="CHF · impact × probabilité" />
        <Indicateur libelle="Survenus" valeur={d.risques.filter((r) => r.statut === "Survenu").length} tendance={d.risques.some((r) => r.statut === "Survenu") ? "alerte" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Carte titre="Matrice des risques" sousTitre="Cliquez sur une case pour filtrer le registre" action={cellule && <Bouton libre taille="sm" variante="fantome" icone={<X size={14} />} onClick={() => setCellule(null)}>Tout afficher</Bouton>}>
          <div className="p-4">
            <div className="flex">
              <div className="flex w-6 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-xs font-medium text-slate-500">Probabilité</span></div>
              <div className="min-w-0 flex-1">
                {[5, 4, 3, 2, 1].map((p) => (
                  <div key={p} className="flex items-center gap-1">
                    <span className="w-20 shrink-0 truncate pr-1 text-right text-[11px] text-slate-500" title={PROBA[p]}>{p} {PROBA[p]}</span>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const n = actifs.filter((r) => r.probabilite === p && r.impact === i).length;
                      const actif = cellule?.p === p && cellule?.i === i;
                      return (
                        <button key={i} onClick={() => setCellule(actif ? null : { p, i })}
                          className={cx("mb-1 flex aspect-square min-w-0 flex-1 items-center justify-center rounded-md text-sm font-semibold transition", actif ? "ring-2 ring-slate-900 dark:ring-white" : "hover:opacity-80", n ? "text-white" : "text-transparent")}
                          style={{ background: COULEUR_CRITICITE[criticite(p * i)], opacity: n ? 1 : 0.28 }}>
                          {n || "·"}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="flex gap-1 pl-[84px]">{[1, 2, 3, 4, 5].map((i) => <span key={i} className="flex-1 truncate text-center text-[10px] text-slate-500" title={IMPACT[i]}>{i} {IMPACT[i]}</span>)}</div>
                <p className="mt-1 pl-[84px] text-center text-xs font-medium text-slate-500">Impact</p>
              </div>
            </div>
          </div>
        </Carte>

        <div className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Onglets valeur={vue} onChange={setVue} options={[{ id: "registre", libelle: "Registre", compte: liste.length }, { id: "personnes", libelle: "Par responsable" }]} />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={voirClos} onChange={(e) => setVoirClos(e.target.checked)} className="accent-brand-600" /> Afficher les risques clos</label>
          </div>

          {vue === "registre" ? (
            <Carte>
              {liste.length === 0 ? <Vide icone={<ShieldAlert size={22} />} titre="Aucun risque" texte="Identifiez les risques du projet ou demandez des suggestions à l'IA." /> : (
                <Tableau>
                  <thead><tr><th>Risque</th><th>Criticité</th><th className="!text-right">Impact CHF</th><th>Responsable</th><th>Statut</th><th /></tr></thead>
                  <tbody>
                    {liste.map((r) => {
                      const resp = nomPers(r.proprietaireId);
                      const nbActions = d.actions.filter((a) => a.risqueId === r.id && a.statut !== "Terminé").length;
                      return (
                        <tr key={r.id} className="cursor-pointer" onClick={() => setEdition(r)}>
                          <td className="max-w-md">
                            <p className="font-medium"><span className="mr-1.5 text-xs text-slate-400">{r.code}</span>{r.titre}</p>
                            <p className="truncate text-xs text-slate-500">{r.categorie}{r.mesures && ` · ${r.mesures}`}</p>
                          </td>
                          <td><BadgeCriticite r={r} /></td>
                          <td className="num text-right">{r.impactFinancier ? formatCHF(r.impactFinancier) : "—"}</td>
                          <td>{resp ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Avatar nom={resp} taille={22} />{resp}</span> : <span className="text-slate-400">—</span>}</td>
                          <td><BadgeStatut statut={r.statut} />{nbActions > 0 && <p className="mt-1 text-xs text-slate-500">{nbActions} tâche(s)</p>}</td>
                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Bouton taille="sm" variante="fantome" title="Créer une tâche de traitement" onClick={() => setAction(nouvelleAction(projet.id, { titre: r.mesures.split(/[.;]/)[0] || `Traiter ${r.code}`, assigneId: r.proprietaireId, risqueId: r.id, origine: `Risque ${r.code}`, lotId: r.lotId, priorite: score(r) >= 15 ? "Urgente" : score(r) >= 9 ? "Haute" : "Normale" }))}>
                              <ListPlus size={15} />
                            </Bouton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tableau>
              )}
            </Carte>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {[...new Set(d.risques.filter((r) => voirClos || r.statut !== "Clos").map((r) => r.proprietaireId ?? ""))].map((pid) => {
                const siens = liste.filter((r) => (r.proprietaireId ?? "") === pid);
                if (!siens.length) return null;
                const nom = nomPers(pid) ?? "Sans responsable";
                return (
                  <Carte key={pid}>
                    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                      <Avatar nom={nom} taille={32} />
                      <div className="flex-1"><p className="font-semibold">{nom}</p><p className="text-xs text-slate-500">{siens.filter(estActif).length} actif(s) · exposition {formatCompact(exposition(siens))} CHF</p></div>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {siens.map((r) => (
                        <li key={r.id}><button onClick={() => setEdition(r)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COULEUR_CRITICITE[criticite(score(r))] }} />
                          <span className="flex-1 truncate">{r.code} {r.titre}</span>
                          {r.echeance && <span className={cx("text-xs", r.echeance < aujourdhui() && estActif(r) ? "text-rose-600" : "text-slate-400")}>{formatDate(r.echeance)}</span>}
                        </button></li>
                      ))}
                    </ul>
                  </Carte>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {edition && (
        <FormulaireRisque initial={edition} onFermer={() => setEdition(null)}
          onEnregistrer={(r) => (d.risques.some((x) => x.id === r.id) ? modifier("risques", r.id, r) : ajouter("risques", r))}
          onCreerTache={(r) => { setEdition(null); setAction(nouvelleAction(projet.id, { titre: `Traiter ${r.code} – ${r.titre}`, assigneId: r.proprietaireId, risqueId: r.id, origine: `Risque ${r.code}`, lotId: r.lotId })); }} />
      )}
      {action && <FormulaireAction initial={action} onFermer={() => setAction(null)} />}

      {suggestions && (
        <Modale ouverte large onFermer={() => setSuggestions(null)} titre="Risques suggérés par l'IA"
          pied={<>
            <Bouton libre onClick={() => setSuggestions(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!suggestions.some((s) => s.garder)} onClick={() => {
              suggestions.filter((s) => s.garder).forEach((s, i) => ajouter("risques", {
                ...s, id: nouvelId("rsk"), projetId: projet.id, code: prochainCode(i), statut: "Ouvert", dateIdentification: aujourdhui(),
                probabilite: Math.min(5, Math.max(1, Math.round(s.probabilite))), impact: Math.min(5, Math.max(1, Math.round(s.impact))),
              }));
              setSuggestions(null);
            }}>Ajouter {suggestions.filter((s) => s.garder).length} risque(s)</Bouton>
          </>}>
          <p className="mb-3 text-sm text-slate-500">Propositions basées sur les données du projet. Cochez celles à reprendre ; vous pourrez ensuite les ajuster et désigner un responsable.</p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <label key={i} className={cx("flex cursor-pointer gap-3 rounded-lg p-3 ring-1", s.garder ? "bg-brand-50/50 ring-brand-200 dark:bg-indigo-950/30" : "ring-slate-200 dark:ring-slate-700")}>
                <input type="checkbox" checked={s.garder} onChange={(e) => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, garder: e.target.checked } : x)))} className="mt-1 accent-brand-600" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{s.titre}</p><Badge>{s.categorie}</Badge><BadgeCriticite r={s} />{s.impactFinancier > 0 && <span className="text-xs text-slate-500">{formatCHF(s.impactFinancier)}</span>}</div>
                  {s.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.description}</p>}
                  {s.mesures && <p className="mt-1 text-sm"><span className="font-medium">Mesures : </span>{s.mesures}</p>}
                </div>
              </label>
            ))}
          </div>
        </Modale>
      )}
    </>
  );
}

function FormulaireRisque({ initial, onFermer, onEnregistrer, onCreerTache }: { initial: Risque; onFermer: () => void; onEnregistrer: (r: Risque) => void; onCreerTache: (r: Risque) => void }) {
  const { personnes, lots, actions } = useStore();
  const [r, setR] = useState(initial);
  const liees = actions.filter((a) => a.risqueId === r.id);
  return (
    <Modale ouverte large onFermer={onFermer} titre={`Risque ${r.code}`}
      pied={<>
        <Bouton variante="fantome" className="mr-auto" icone={<ListPlus size={15} />} disabled={!r.titre} onClick={() => { onEnregistrer(r); onCreerTache(r); }}>Créer une tâche de traitement</Bouton>
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!r.titre} onClick={() => { onEnregistrer(r); onFermer(); }}>Enregistrer</Bouton>
      </>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Champ libelle="Intitulé" className="md:col-span-2"><Saisie value={r.titre} onChange={(e) => setR({ ...r, titre: e.target.value })} /></Champ>
        <Champ libelle="Catégorie"><Liste value={r.categorie} onChange={(e) => setR({ ...r, categorie: e.target.value as CategorieRisque })}>{CATEGORIES_RISQUE.map((c) => <option key={c}>{c}</option>)}</Liste></Champ>
        <Champ libelle="Description / cause" className="md:col-span-3"><Zone rows={2} value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></Champ>
        <Champ libelle={`Probabilité : ${r.probabilite} – ${PROBA[r.probabilite]}`}>
          <input type="range" min={1} max={5} value={r.probabilite} onChange={(e) => setR({ ...r, probabilite: Number(e.target.value) })} className="w-full accent-brand-600" />
        </Champ>
        <Champ libelle={`Impact : ${r.impact} – ${IMPACT[r.impact]}`}>
          <input type="range" min={1} max={5} value={r.impact} onChange={(e) => setR({ ...r, impact: Number(e.target.value) })} className="w-full accent-brand-600" />
        </Champ>
        <div className="flex items-end pb-2"><BadgeCriticite r={r} /></div>
        <Champ libelle="Impact financier estimé (CHF)"><Saisie type="number" value={r.impactFinancier || ""} onChange={(e) => setR({ ...r, impactFinancier: Number(e.target.value) })} /></Champ>
        <Champ libelle="Responsable du risque">
          <Liste value={r.proprietaireId ?? ""} onChange={(e) => setR({ ...r, proprietaireId: e.target.value || undefined })}>
            <option value="">—</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Statut"><Liste value={r.statut} onChange={(e) => setR({ ...r, statut: e.target.value as StatutRisque })}>{STATUTS.map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
        <Champ libelle="Mesures de maîtrise" className="md:col-span-3"><Zone rows={2} value={r.mesures} onChange={(e) => setR({ ...r, mesures: e.target.value })} placeholder="Éviter, réduire, transférer, accepter…" /></Champ>
        <Champ libelle="Lot">
          <Liste value={r.lotId ?? ""} onChange={(e) => setR({ ...r, lotId: e.target.value || undefined })}>
            <option value="">—</option>{lots.filter((l) => l.projetId === r.projetId).map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Échéance de traitement"><Saisie type="date" value={r.echeance ?? ""} onChange={(e) => setR({ ...r, echeance: e.target.value || undefined })} /></Champ>
      </div>
      {liees.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <p className="mb-1 font-medium">Tâches de traitement</p>
          {liees.map((a) => <p key={a.id} className="flex justify-between"><span className={a.statut === "Terminé" ? "line-through text-slate-400" : ""}>{a.titre}</span><span className="text-xs text-slate-500">{personnes.find((p) => p.id === a.assigneId)?.nom} · {a.statut}</span></p>)}
        </div>
      )}
    </Modale>
  );
}
