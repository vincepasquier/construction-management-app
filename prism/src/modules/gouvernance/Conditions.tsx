// Conditions et réserves attachées à une décision : saisie dans un formulaire, et suivi jusqu'à
// leur levée. Composants partagés par les passages de phase et les décisions des comités.
import { Plus, Trash2 } from "lucide-react";
import { Badge, Bouton, Liste, Saisie, useLectureSeule, type CouleurBadge } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { ConditionSuivie, StatutCondition } from "@/domaine/socle/types";
import type { ConditionOuverte } from "@/donnees/gouvernance";
import { useActions, useDepot, useDonnees } from "@/donnees/hooks";

export const STATUTS_CONDITION: StatutCondition[] = ["À traiter", "En cours", "Remplie", "Levée"];
const COULEUR: Record<StatutCondition, CouleurBadge> = { "À traiter": "orange", "En cours": "bleu", Remplie: "vert", "Levée": "gris" };
export const BadgeCondition = ({ statut }: { statut: StatutCondition }) => <Badge couleur={COULEUR[statut]}>{statut}</Badge>;

/** Saisie des conditions dans le formulaire d'une décision */
export function SaisieConditions({ valeur, onChange }: { valeur: ConditionSuivie[]; onChange: (v: ConditionSuivie[]) => void }) {
  const { personnes } = useDonnees();
  const maj = (id: string, patch: Partial<ConditionSuivie>) => onChange(valeur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Conditions et réserves</p>
      <div className="space-y-2">
        {valeur.map((c) => (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
            <Saisie aria-label="Condition" placeholder="Ce qui doit être fait ou vérifié" value={c.texte} onChange={(e) => maj(c.id, { texte: e.target.value })} />
            <button type="button" aria-label="Retirer la condition" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => onChange(valeur.filter((x) => x.id !== c.id))}><Trash2 size={14} /></button>
            <div className="grid grid-cols-2 gap-2">
              <Liste aria-label="Responsable" value={c.responsableId ?? ""} onChange={(e) => maj(c.id, { responsableId: e.target.value || undefined })}>
                <option value="">Responsable…</option>{[...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </Liste>
              <Saisie type="date" aria-label="Échéance" value={c.echeance ?? ""} onChange={(e) => maj(c.id, { echeance: e.target.value || undefined })} />
            </div>
          </div>
        ))}
      </div>
      <Bouton taille="sm" variante="fantome" className="mt-1" icone={<Plus size={13} />} onClick={() => onChange([...valeur, { id: nouvelId("cnd"), texte: "", statut: "À traiter" }])}>Condition</Bouton>
    </div>
  );
}

/** Suivi des conditions ouvertes : le statut se change sur place, dans la décision qui porte la condition */
export function SuiviConditions({ conditions, avecProjet }: { conditions: ConditionOuverte[]; avecProjet?: boolean }) {
  const depot = useDepot();
  const { personnes, projets } = useDonnees();
  const { modifier } = useActions();
  const lecture = useLectureSeule();
  const changer = (o: ConditionOuverte, statut: StatutCondition) => {
    const collection = o.source.type === "decision" ? "decisions" : "decisionsPhase";
    const doc = depot.parId(collection, o.source.id);
    if (!doc) return;
    modifier(collection, doc.id, { conditions: doc.conditions.map((c) => (c.id === o.condition.id ? { ...c, statut } : c)) }, { libelle: `Condition « ${o.condition.texte.slice(0, 40)} » : ${statut}` });
  };
  if (conditions.length === 0) return <p className="px-5 py-6 text-center text-sm text-slate-500">Aucune condition ouverte.</p>;
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {conditions.map((o) => (
        <li key={`${o.source.id}-${o.condition.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{o.condition.texte}</p>
            <p className="truncate text-xs text-slate-500">{avecProjet ? `${projets.find((p) => p.id === o.projetId)?.code ?? ""} · ` : ""}{o.origine}</p>
          </div>
          <span className="text-xs text-slate-500">{personnes.find((p) => p.id === o.condition.responsableId)?.nom ?? "Sans responsable"}</span>
          <span className={o.echue ? "text-xs font-medium text-rose-600" : "text-xs text-slate-500"}>{o.condition.echeance ? `${o.echue ? "échue le" : "pour le"} ${formatDate(o.condition.echeance)}` : "sans échéance"}</span>
          {lecture ? <BadgeCondition statut={o.condition.statut} /> : (
            <div className="w-32"><Liste aria-label="Statut de la condition" value={o.condition.statut} onChange={(e) => changer(o, e.target.value as StatutCondition)}>{STATUTS_CONDITION.map((s) => <option key={s}>{s}</option>)}</Liste></div>
          )}
        </li>
      ))}
    </ul>
  );
}
