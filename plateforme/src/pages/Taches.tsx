import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarRange, FileCheck2, Plus, ShieldAlert } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { aujourdhui, formatDate } from "../lib/format";
import { attendDe } from "../lib/validations";
import { estActif } from "../lib/risques";
import { FormulaireAction, nouvelleAction, PRIORITES, STATUTS_ACTION } from "../components/FormulaireAction";
import { Avatar, Badge, Bouton, Carte, cx, EnTetePage, Indicateur, Liste, Onglets, useLectureSeule, type CouleurBadge } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { Action, StatutAction } from "../types";

const COULEUR_PRIORITE: Record<Action["priorite"], CouleurBadge> = { Basse: "gris", Normale: "bleu", Haute: "orange", Urgente: "rouge" };
const COULEUR_COLONNE: Record<StatutAction, string> = { "À faire": "#64748b", "En cours": "#6366f1", "En attente": "#f59e0b", "Terminé": "#10b981" };

type Vue = "kanban" | "personnes" | "moi";

export function Taches() {
  const d = useProjetActif();
  const { personnes, modifier, utilisateurId } = useStore();
  const lecture = useLectureSeule();
  const [vue, setVue] = useState<Vue>("kanban");
  const [edition, setEdition] = useState<Action | null>(null);
  const [filtrePersonne, setFiltrePersonne] = useState("");
  const [priorite, setPriorite] = useState("");
  const [survol, setSurvol] = useState<StatutAction | null>(null);
  if (!d.projet) return <SansProjet />;
  const projetId = d.projet.id;
  const jour = aujourdhui();

  const actions = d.actions.filter((a) => (!filtrePersonne || a.assigneId === filtrePersonne) && (!priorite || a.priorite === priorite));
  const ouvertes = d.actions.filter((a) => a.statut !== "Terminé");
  const enRetard = ouvertes.filter((a) => a.echeance && a.echeance < jour);
  const semaine = ouvertes.filter((a) => a.echeance && a.echeance >= jour && a.echeance <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));

  // Personnes concernées : membres affectés au projet + personnes ayant des tâches
  const membres = personnes.filter((p) => d.affectations.some((a) => a.personneId === p.id) || d.actions.some((a) => a.assigneId === p.id));

  const carte = (a: Action) => {
    const pers = personnes.find((p) => p.id === a.assigneId);
    const retard = a.statut !== "Terminé" && !!a.echeance && a.echeance < jour;
    return (
      <div key={a.id} draggable={!lecture} onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)} onClick={() => setEdition(a)}
        className={cx("cursor-pointer rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md dark:bg-slate-900 dark:ring-slate-700", a.statut === "Terminé" && "opacity-60")}>
        <div className="flex items-start gap-2">
          <p className={cx("flex-1 text-sm font-medium text-slate-800 dark:text-slate-100", a.statut === "Terminé" && "line-through")}>{a.titre}</p>
          {pers && <Avatar nom={pers.nom} taille={22} />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <Badge couleur={COULEUR_PRIORITE[a.priorite]}>{a.priorite}</Badge>
          {a.origine && <Badge>{a.origine}</Badge>}
          {a.echeance && <span className={cx("ml-auto flex items-center gap-1", retard ? "font-medium text-rose-600" : "text-slate-500")}><CalendarClock size={12} />{formatDate(a.echeance)}</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <EnTetePage titre="Tâches" description="Actions attribuées aux membres du projet, en complément du planning"
        actions={<Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setEdition(nouvelleAction(projetId, { assigneId: filtrePersonne || undefined }))}>Tâche</Bouton>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Tâches ouvertes" valeur={ouvertes.length} />
        <Indicateur libelle="En retard" valeur={enRetard.length} tendance={enRetard.length ? "mauvais" : "bon"} detail={enRetard.length ? "échéance dépassée" : "aucune"} />
        <Indicateur libelle="À échéance cette semaine" valeur={semaine.length} />
        <Indicateur libelle="Terminées" valeur={d.actions.length - ouvertes.length} detail={`sur ${d.actions.length}`} />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-3">
        <Onglets valeur={vue} onChange={setVue} options={[
          { id: "kanban", libelle: "Tableau" },
          { id: "personnes", libelle: "Par personne" },
          { id: "moi", libelle: "Mes tâches", compte: ouvertes.filter((a) => a.assigneId === utilisateurId).length },
        ]} />
        {vue === "kanban" && (
          <>
            <Liste libre value={filtrePersonne} onChange={(e) => setFiltrePersonne(e.target.value)} className="!w-52"><option value="">Toutes les personnes</option>{membres.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste>
            <Liste libre value={priorite} onChange={(e) => setPriorite(e.target.value)} className="!w-40"><option value="">Toutes priorités</option>{PRIORITES.map((p) => <option key={p}>{p}</option>)}</Liste>
          </>
        )}
      </div>

      {vue === "kanban" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUTS_ACTION.map((s) => {
            const col = actions.filter((a) => a.statut === s).sort((a, b) => (a.echeance ?? "9").localeCompare(b.echeance ?? "9"));
            return (
              <div key={s}
                onDragOver={(e) => { if (!lecture) { e.preventDefault(); setSurvol(s); } }} onDragLeave={() => setSurvol(null)}
                onDrop={(e) => { e.preventDefault(); setSurvol(null); modifier("actions", e.dataTransfer.getData("text/plain"), { statut: s }); }}
                className={cx("rounded-xl bg-slate-100/70 p-3 transition dark:bg-slate-900/50", survol === s && "ring-2 ring-brand-400")}>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COULEUR_COLONNE[s] }} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s}</p>
                  <span className="text-xs text-slate-400">{col.length}</span>
                </div>
                <div className="min-h-24 space-y-2">{col.map(carte)}</div>
              </div>
            );
          })}
        </div>
      )}

      {vue === "personnes" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {membres.map((p) => <ColonnePersonne key={p.id} personneId={p.id} carte={carte} onAjouter={() => setEdition(nouvelleAction(projetId, { assigneId: p.id }))} />)}
        </div>
      )}

      {vue === "moi" && utilisateurId && (
        <div className="max-w-2xl"><ColonnePersonne personneId={utilisateurId} carte={carte} onAjouter={() => setEdition(nouvelleAction(projetId, { assigneId: utilisateurId }))} detaille /></div>
      )}

      {edition && <FormulaireAction initial={edition} onFermer={() => setEdition(null)} />}
    </>
  );
}

/** Tout ce qui est attribué à une personne : tâches, tâches du planning, validations en attente, risques */
function ColonnePersonne({ personneId, carte, onAjouter, detaille }: { personneId: string; carte: (a: Action) => React.ReactNode; onAjouter: () => void; detaille?: boolean }) {
  const d = useProjetActif();
  const { personnes } = useStore();
  const p = personnes.find((x) => x.id === personneId);
  const jour = aujourdhui();
  if (!p) return null;
  const mes = d.actions.filter((a) => a.assigneId === personneId);
  const ouvertes = mes.filter((a) => a.statut !== "Terminé").sort((a, b) => (a.echeance ?? "9").localeCompare(b.echeance ?? "9"));
  const retard = ouvertes.filter((a) => a.echeance && a.echeance < jour).length;
  const planning = d.taches.filter((t) => t.responsableId === personneId && !t.jalon && t.avancement < 100 && t.debut <= jour);
  const validations = d.validations.filter((v) => attendDe(v, personneId));
  const risques = d.risques.filter((r) => r.proprietaireId === personneId && estActif(r));

  return (
    <Carte>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <Avatar nom={p.nom} taille={34} />
        <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900 dark:text-white">{p.nom}</p><p className="text-xs text-slate-500">{p.role}</p></div>
        <div className="text-right text-xs">
          <p className="font-semibold text-slate-700 dark:text-slate-200">{ouvertes.length} ouverte(s)</p>
          {retard > 0 && <p className="text-rose-600">{retard} en retard</p>}
        </div>
      </div>
      <div className="space-y-2 p-3">
        {ouvertes.map(carte)}
        {ouvertes.length === 0 && <p className="py-3 text-center text-sm text-slate-400">Aucune tâche ouverte</p>}
        <Bouton taille="sm" variante="fantome" icone={<Plus size={14} />} onClick={onAjouter} className="w-full">Attribuer une tâche</Bouton>
      </div>
      {(planning.length > 0 || validations.length > 0 || risques.length > 0) && (
        <div className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
          {validations.length > 0 && <Link to="/validations" className="flex items-center gap-2 text-rose-600 hover:underline"><FileCheck2 size={14} />{validations.length} validation(s) en attente</Link>}
          {planning.map((t) => (
            <Link key={t.id} to="/planning" className="flex items-center gap-2 text-slate-600 hover:underline dark:text-slate-300"><CalendarRange size={14} className="shrink-0" /><span className="truncate">Planning : {t.nom}</span><span className="ml-auto text-xs text-slate-400">{t.avancement} %</span></Link>
          ))}
          {risques.length > 0 && <Link to="/risques" className="flex items-center gap-2 text-amber-600 hover:underline"><ShieldAlert size={14} />{risques.length} risque(s) sous sa responsabilité</Link>}
        </div>
      )}
      {detaille && mes.some((a) => a.statut === "Terminé") && (
        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <p className="px-1 text-xs font-medium uppercase tracking-wide text-slate-400">Terminées</p>
          {mes.filter((a) => a.statut === "Terminé").map(carte)}
        </div>
      )}
    </Carte>
  );
}
