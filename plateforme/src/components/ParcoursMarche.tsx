import { ArrowRight, Check } from "lucide-react";
import { parcoursMarche, type IdEtape } from "../lib/parcours";
import type { AppelOffres, Contrat, Facture } from "../types";
import { Bouton, cx } from "./ui";

export interface ActionEtape {
  libelle: string;
  aide?: string;
  faire: () => void;
}

/**
 * Fil conducteur d'un marché affiché en tête des pages appel d'offres et contrat :
 * où en est-on, et quelle est la prochaine action (un clic).
 */
export function ParcoursMarche({ ao, contrat, factures, actions, onEtape }: {
  ao?: AppelOffres; contrat?: Contrat; factures: Facture[];
  actions: Partial<Record<IdEtape, ActionEtape>>;
  onEtape?: (id: IdEtape) => void;
}) {
  const etapes = parcoursMarche(ao, contrat, factures);
  const actuelle = etapes.find((e) => e.etat === "actuel");
  const action = actuelle ? actions[actuelle.id] : undefined;

  return (
    <div className="mb-6 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <ol className="flex overflow-x-auto px-2 py-3">
        {etapes.map((e, i) => (
          <li key={e.id} className="flex min-w-32 flex-1 items-center">
            <button onClick={() => onEtape?.(e.id)} disabled={!onEtape || e.etat === "sans-objet"}
              className={cx("flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1 text-center transition enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800", e.etat === "sans-objet" && "opacity-35")}>
              <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                e.etat === "fait" && "bg-emerald-500 text-white",
                e.etat === "actuel" && "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-indigo-950",
                (e.etat === "a-venir" || e.etat === "sans-objet") && "bg-slate-100 text-slate-400 dark:bg-slate-800")}>
                {e.etat === "fait" ? <Check size={14} /> : i + 1}
              </span>
              <span className={cx("text-xs font-medium", e.etat === "actuel" ? "text-brand-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>{e.libelle}</span>
              <span className="text-[11px] text-slate-400">{e.detail}</span>
            </button>
            {i < etapes.length - 1 && <span className={cx("h-0.5 w-4 shrink-0 rounded", e.etat === "fait" ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700")} />}
          </li>
        ))}
      </ol>
      {action && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-brand-50/50 px-5 py-3 dark:border-slate-800 dark:bg-indigo-950/30">
          <div className="flex-1 text-sm">
            <span className="font-medium text-brand-700 dark:text-indigo-300">Prochaine étape : </span>
            <span className="text-slate-700 dark:text-slate-300">{action.aide ?? action.libelle}</span>
          </div>
          <Bouton variante="primaire" taille="sm" icone={<ArrowRight size={14} />} onClick={action.faire}>{action.libelle}</Bouton>
        </div>
      )}
    </div>
  );
}
