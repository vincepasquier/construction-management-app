import { useMemo, useRef, useState } from "react";
import { Diamond, Plus, Sparkles } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { useUI } from "../store/useUI";
import { avancementPlanning, tachesEnRetard } from "../lib/finance";
import { ajouterJours, aujourdhui, formatDate, formatPct, joursEntre } from "../lib/format";
import { nouvelId } from "../lib/id";
import { Avatar, Badge, Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Liste, Modale, Onglets, Saisie } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { Tache } from "../types";

type Zoom = "trimestre" | "mois" | "semaine";
const PX_JOUR: Record<Zoom, number> = { trimestre: 1.6, mois: 4, semaine: 14 };
const HAUTEUR = 38;
const COULEURS_LOT = ["#6366f1", "#0891b2", "#059669", "#d97706", "#db2777", "#7c3aed"];

interface Glisse { id: string; mode: "deplacer" | "etirer"; x0: number; delta: number }

export function Planning() {
  const d = useProjetActif();
  const { personnes, modifier, ajouter, supprimer } = useStore();
  const { ouvrirAssistant } = useUI();
  const [zoom, setZoom] = useState<Zoom>("mois");
  const [edition, setEdition] = useState<Tache | null>(null);
  const [glisse, setGlisse] = useState<Glisse | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const jour = aujourdhui();

  const lignes = useMemo(() => {
    const ordre = new Map(d.lots.map((l, i) => [l.id, i]));
    return [...d.taches].sort((a, b) => (ordre.get(a.lotId ?? "") ?? 99) - (ordre.get(b.lotId ?? "") ?? 99) || a.debut.localeCompare(b.debut));
  }, [d.taches, d.lots]);

  if (!d.projet) return <SansProjet />;
  const p = d.projet;

  const debutVue = ajouterJours([p.dateDebut, ...d.taches.map((t) => t.debut)].sort()[0].slice(0, 7) + "-01", 0);
  const finVue = ajouterJours([p.dateFin, ...d.taches.map((t) => t.fin)].sort().at(-1)!, 30);
  const px = PX_JOUR[zoom];
  const largeur = joursEntre(debutVue, finVue) * px;
  const x = (iso: string) => joursEntre(debutVue, iso) * px;

  const mois: { iso: string; x: number; l: number }[] = [];
  for (let dt = new Date(debutVue); dt.toISOString().slice(0, 10) < finVue; dt.setMonth(dt.getMonth() + 1)) {
    const iso = dt.toISOString().slice(0, 10);
    const suivant = new Date(dt); suivant.setMonth(suivant.getMonth() + 1);
    mois.push({ iso, x: x(iso), l: joursEntre(iso, suivant.toISOString().slice(0, 10)) * px });
  }

  const retards = new Set(tachesEnRetard(d.taches, jour).map((t) => t.id));
  const couleurLot = (lotId?: string) => { const i = d.lots.findIndex((l) => l.id === lotId); return i >= 0 ? COULEURS_LOT[i % COULEURS_LOT.length] : "#64748b"; };
  const nomPers = (id?: string) => personnes.find((x) => x.id === id)?.nom;

  const dates = (t: Tache) => {
    if (glisse?.id !== t.id) return { debut: t.debut, fin: t.fin };
    const n = Math.round(glisse.delta / px);
    return glisse.mode === "deplacer" ? { debut: ajouterJours(t.debut, n), fin: ajouterJours(t.fin, n) } : { debut: t.debut, fin: ajouterJours(t.fin, Math.max(n, -joursEntre(t.debut, t.fin))) };
  };

  const commencer = (e: React.PointerEvent, t: Tache, mode: Glisse["mode"]) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setGlisse({ id: t.id, mode, x0: e.clientX, delta: 0 });
  };
  const bouger = (e: React.PointerEvent) => glisse && setGlisse({ ...glisse, delta: e.clientX - glisse.x0 });
  const finir = () => {
    if (!glisse) return;
    const t = d.taches.find((x) => x.id === glisse.id)!;
    if (Math.abs(glisse.delta) < 3) setEdition(t);
    else modifier("taches", t.id, dates(t));
    setGlisse(null);
  };

  const indexDe = new Map(lignes.map((t, i) => [t.id, i]));

  return (
    <>
      <EnTetePage titre="Planning" description="Diagramme de Gantt – glissez les barres pour décaler, tirez le bord droit pour modifier la durée"
        actions={<>
          <Onglets valeur={zoom} onChange={setZoom} options={[{ id: "trimestre", libelle: "Trimestre" }, { id: "mois", libelle: "Mois" }, { id: "semaine", libelle: "Semaine" }]} />
          <Bouton icone={<Sparkles size={15} />} onClick={() => ouvrirAssistant("Analyse le planning : tâches en retard, chemin critique probable (selon les dépendances), impact sur les jalons et la date de réception, et propose des mesures de rattrapage.")}>Analyse IA</Bouton>
          <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setEdition({ id: nouvelId("t"), projetId: p.id, nom: "", debut: jour, fin: ajouterJours(jour, 14), avancement: 0, jalon: false, dependances: [], lotId: d.lots[0]?.id })}>Tâche</Bouton>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Avancement global" valeur={formatPct(avancementPlanning(d.taches), 0)} />
        <Indicateur libelle="Tâches" valeur={d.taches.filter((t) => !t.jalon).length} detail={`${d.taches.filter((t) => t.avancement >= 100).length} terminée(s)`} />
        <Indicateur libelle="En retard" valeur={retards.size} tendance={retards.size ? "mauvais" : "bon"} detail={retards.size ? "à traiter" : "aucune"} />
        <Indicateur libelle="Réception prévue" valeur={formatDate(p.dateFin)} detail={`J-${Math.max(0, joursEntre(jour, p.dateFin))}`} />
      </div>

      <Carte className="overflow-hidden">
        <div className="flex">
          {/* Colonne des libellés */}
          <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-800">
            <div className="flex h-12 items-end border-b border-slate-200 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800">Tâche</div>
            {lignes.map((t) => (
              <button key={t.id} onClick={() => setEdition(t)} style={{ height: HAUTEUR }} className="flex w-full items-center gap-2 border-b border-slate-100 px-4 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleurLot(t.lotId) }} />
                <span className={cx("flex-1 truncate", t.jalon && "font-medium")}>{t.nom}</span>
                {retards.has(t.id) && <Badge couleur="rouge">retard</Badge>}
                {nomPers(t.responsableId) && <Avatar nom={nomPers(t.responsableId)!} taille={20} />}
              </button>
            ))}
          </div>

          {/* Zone chronologique */}
          <div ref={zone} className="flex-1 overflow-x-auto" onPointerMove={bouger} onPointerUp={finir}>
            <div style={{ width: largeur }} className="relative select-none">
              <div className="flex h-12 border-b border-slate-200 dark:border-slate-800">
                {mois.map((m) => (
                  <div key={m.iso} style={{ width: m.l }} className="shrink-0 border-l border-slate-100 px-1.5 pt-6 text-xs text-slate-500 dark:border-slate-800">
                    {m.l > 34 && new Date(m.iso).toLocaleDateString("fr-CH", { month: zoom === "trimestre" ? "narrow" : "short", year: m.iso.slice(5, 7) === "01" || zoom === "semaine" ? "2-digit" : undefined })}
                  </div>
                ))}
              </div>
              <div className="relative" style={{ height: lignes.length * HAUTEUR }}>
                {mois.map((m) => <div key={m.iso} className="absolute inset-y-0 border-l border-slate-100 dark:border-slate-800/70" style={{ left: m.x }} />)}
                {lignes.map((_, i) => <div key={i} className="absolute inset-x-0 border-b border-slate-100 dark:border-slate-800" style={{ top: (i + 1) * HAUTEUR - 1 }} />)}
                {jour >= debutVue && jour <= finVue && (
                  <div className="absolute inset-y-0 z-10 w-px bg-rose-500" style={{ left: x(jour) }}>
                    <span className="absolute -top-5 -translate-x-1/2 rounded bg-rose-500 px-1 text-[10px] font-medium text-white">Auj.</span>
                  </div>
                )}

                {/* Dépendances */}
                <svg className="pointer-events-none absolute inset-0" width={largeur} height={lignes.length * HAUTEUR}>
                  {lignes.flatMap((t) => t.dependances.filter((dep) => indexDe.has(dep)).map((dep) => {
                    const pred = lignes[indexDe.get(dep)!];
                    const x1 = x(dates(pred).fin) + (pred.jalon ? 0 : px);
                    const y1 = indexDe.get(dep)! * HAUTEUR + HAUTEUR / 2;
                    const x2 = x(dates(t).debut);
                    const y2 = indexDe.get(t.id)! * HAUTEUR + HAUTEUR / 2;
                    const xm = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 12));
                    return <path key={`${dep}-${t.id}`} d={`M${x1},${y1} H${xm} V${y2} H${x2 - 2}`} fill="none" stroke="#94a3b8" strokeWidth={1.2} markerEnd="url(#fleche)" />;
                  }))}
                  <defs><marker id="fleche" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#94a3b8" /></marker></defs>
                </svg>

                {lignes.map((t, i) => {
                  const { debut, fin } = dates(t);
                  const couleur = couleurLot(t.lotId);
                  const top = i * HAUTEUR;
                  if (t.jalon) {
                    return (
                      <div key={t.id} className="absolute z-20 -translate-x-1/2 cursor-grab" style={{ left: x(fin), top: top + HAUTEUR / 2 - 8 }}
                        onPointerDown={(e) => commencer(e, t, "deplacer")} title={`${t.nom} – ${formatDate(fin)}`}>
                        <Diamond size={16} fill={t.avancement >= 100 ? couleur : "white"} stroke={couleur} strokeWidth={2.5} />
                      </div>
                    );
                  }
                  const w = Math.max(px, (joursEntre(debut, fin) + 1) * px);
                  return (
                    <div key={t.id} className={cx("group absolute z-20 cursor-grab overflow-hidden rounded-md shadow-sm ring-1 ring-black/5 active:cursor-grabbing", retards.has(t.id) && "ring-2 ring-rose-400")}
                      style={{ left: x(debut), top: top + 8, width: w, height: HAUTEUR - 16, background: `${couleur}33` }}
                      onPointerDown={(e) => commencer(e, t, "deplacer")} title={`${t.nom}\n${formatDate(debut)} → ${formatDate(fin)} · ${t.avancement} %`}>
                      <div className="h-full" style={{ width: `${t.avancement}%`, background: couleur }} />
                      {w > 60 && <span className="pointer-events-none absolute inset-0 flex items-center px-2 text-[11px] font-medium text-slate-800 dark:text-white">{t.avancement} %</span>}
                      <div className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" style={{ background: couleur }}
                        onPointerDown={(e) => commencer(e, t, "etirer")} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Carte>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        {d.lots.map((l) => <span key={l.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: couleurLot(l.id) }} />{l.code} {l.nom}</span>)}
      </div>

      {edition && (
        <Modale ouverte onFermer={() => setEdition(null)} titre={d.taches.some((t) => t.id === edition.id) ? "Modifier la tâche" : "Nouvelle tâche"}
          pied={<>
            {d.taches.some((t) => t.id === edition.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("taches", edition.id); setEdition(null); }}>Supprimer</Bouton>}
            <Bouton onClick={() => setEdition(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!edition.nom || edition.fin < edition.debut} onClick={() => {
              if (d.taches.some((t) => t.id === edition.id)) modifier("taches", edition.id, edition); else ajouter("taches", edition);
              setEdition(null);
            }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Nom" className="col-span-2"><Saisie value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></Champ>
            <Champ libelle="Début"><Saisie type="date" value={edition.debut} onChange={(e) => setEdition({ ...edition, debut: e.target.value, fin: edition.jalon ? e.target.value : edition.fin })} /></Champ>
            <Champ libelle="Fin"><Saisie type="date" value={edition.fin} disabled={edition.jalon} onChange={(e) => setEdition({ ...edition, fin: e.target.value })} /></Champ>
            <Champ libelle="Lot">
              <Liste value={edition.lotId ?? ""} onChange={(e) => setEdition({ ...edition, lotId: e.target.value || undefined })}>
                <option value="">—</option>{d.lots.map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="Responsable">
              <Liste value={edition.responsableId ?? ""} onChange={(e) => setEdition({ ...edition, responsableId: e.target.value || undefined })}>
                <option value="">—</option>{personnes.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </Liste>
            </Champ>
            <Champ libelle={`Avancement : ${edition.avancement} %`} className="col-span-2">
              <input type="range" min={0} max={100} step={5} value={edition.avancement} onChange={(e) => setEdition({ ...edition, avancement: Number(e.target.value) })} className="w-full accent-brand-600" />
            </Champ>
            <Champ libelle="Prédécesseurs" className="col-span-2">
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {d.taches.filter((t) => t.id !== edition.id).map((t) => {
                  const actif = edition.dependances.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => setEdition({ ...edition, dependances: actif ? edition.dependances.filter((x) => x !== t.id) : [...edition.dependances, t.id] })}
                      className={cx("rounded-full px-2.5 py-1 text-xs ring-1", actif ? "bg-brand-600 text-white ring-brand-600" : "ring-slate-200 dark:ring-slate-700")}>{t.nom}</button>
                  );
                })}
              </div>
            </Champ>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edition.jalon} onChange={(e) => setEdition({ ...edition, jalon: e.target.checked, fin: e.target.checked ? edition.debut : edition.fin })} className="accent-brand-600" /> Jalon
            </label>
          </div>
        </Modale>
      )}
    </>
  );
}
