import { Plus, Scale, Trash2 } from "lucide-react";
import { repartirAuProrata, sommeRepartition, type PositionCalculee } from "../../lib/budget";
import { formatCHF } from "../../lib/format";
import type { Lot, Repartition } from "../../types";
import { Bouton, cx, Liste, Saisie } from "../ui";

/** Liste déroulante des positions, groupées par lot */
export function ChoixPosition({ valeur, onChange, positions, lots, className }: {
  valeur: string; onChange: (id: string) => void; positions: PositionCalculee[]; lots: Lot[]; className?: string;
}) {
  const reelles = positions.filter((p) => !p.virtuelle);
  const groupes = [...lots.map((l) => ({ id: l.id, nom: `${l.code} – ${l.nom}` })), { id: "", nom: "Sans lot" }]
    .map((g) => ({ ...g, ps: reelles.filter((p) => (p.lotId ?? "") === g.id) }))
    .filter((g) => g.ps.length);
  return (
    <Liste value={valeur} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">Choisir une position…</option>
      {groupes.map((g) => (
        <optgroup key={g.id || "x"} label={g.nom}>
          {g.ps.map((p) => (
            <option key={p.id} value={p.id}>
              {[p.ligne.groupe, p.ligne.libelle].filter(Boolean).join(" · ")}{p.ligne.etape ? ` [Ét. ${p.ligne.etape}]` : ""}{p.ligne.cfc ? ` (${p.ligne.cfc})` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </Liste>
  );
}

/**
 * Édition d'une répartition sur des positions. `total` : montant à répartir (contrôle et prorata).
 * `signe` : pour les mutations, les montants sont saisis positifs et enregistrés avec ce signe.
 */
export function EditeurRepartition({ valeur, onChange, positions, lots, total, signe = 1, libelleMontant = "Montant" }: {
  valeur: Repartition[]; onChange: (r: Repartition[]) => void; positions: PositionCalculee[]; lots: Lot[];
  total?: number; signe?: 1 | -1; libelleMontant?: string;
}) {
  const maj = (i: number, patch: Partial<Repartition>) => onChange(valeur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const somme = Math.abs(sommeRepartition(valeur));
  const ecart = total !== undefined ? total - somme : 0;
  const pos = (id: string) => positions.find((p) => p.id === id);
  return (
    <div className="space-y-2">
      {valeur.map((r, i) => {
        const p = pos(r.budgetId);
        return (
          <div key={i} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ChoixPosition valeur={r.budgetId} onChange={(id) => maj(i, { budgetId: id })} positions={positions} lots={lots} />
              {p && (
                <p className="mt-0.5 pl-1 text-[11px] text-slate-500 num">
                  Révisé {formatCHF(p.revise)} · atterrissage {formatCHF(p.atterrissage)} · marge <span className={p.ecart < 0 ? "text-rose-600" : "text-emerald-600"}>{formatCHF(p.ecart)}</span>
                </p>
              )}
            </div>
            <Saisie type="number" step="0.01" className="!w-36 text-right" placeholder={libelleMontant} value={r.montant ? Math.abs(r.montant) : ""}
              onChange={(e) => maj(i, { montant: signe * Math.abs(Number(e.target.value)) })} />
            <Bouton variante="fantome" taille="sm" className="mt-0.5" onClick={() => onChange(valeur.filter((_, j) => j !== i))} aria-label="Retirer"><Trash2 size={14} /></Bouton>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Bouton taille="sm" icone={<Plus size={14} />} onClick={() => onChange([...valeur, { budgetId: "", montant: 0 }])}>Position</Bouton>
        {total !== undefined && valeur.filter((r) => r.budgetId).length > 0 && (
          <Bouton taille="sm" icone={<Scale size={14} />} title="Répartit le montant total au prorata du budget révisé des positions choisies"
            onClick={() => onChange(repartirAuProrata(total, valeur.filter((r) => r.budgetId).map((r) => r.budgetId), positions).map((r) => ({ ...r, montant: signe * r.montant })))}>
            Au prorata du budget
          </Bouton>
        )}
        {total !== undefined && (
          <span className={cx("ml-auto text-xs num", Math.abs(ecart) > 0.5 ? "text-amber-600" : "text-emerald-600")}>
            Réparti {formatCHF(somme)} / {formatCHF(total)}{Math.abs(ecart) > 0.5 ? ` (reste ${formatCHF(ecart)})` : " ✓"}
          </span>
        )}
      </div>
    </div>
  );
}
