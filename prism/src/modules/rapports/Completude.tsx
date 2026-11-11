// Indice de complétude du projet : la note, ses deux axes, et ce qu'il reste à faire pour l'améliorer.
import { CheckCircle2, CircleAlert, MinusCircle } from "lucide-react";
import { Carte, cx, Progression } from "@/app/ui";
import type { Completude } from "@/domaine/socle/completude";

export const couleurIndice = (v: number) => (v >= 85 ? "text-emerald-600" : v >= 60 ? "text-amber-600" : "text-rose-600");

export function CarteCompletude({ c, compact }: { c: Completude; compact?: boolean }) {
  return (
    <Carte titre="Indice de complétude" sousTitre="Dossier et qualité des données du projet, selon les critères de la configuration">
      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
        <div className="text-center">
          <p className={cx("text-4xl font-semibold num", couleurIndice(c.indice))}>{c.indice}<span className="text-xl"> %</span></p>
          <div className="mt-3 space-y-2 text-left text-xs text-slate-500">
            {(Object.entries(c.parAxe) as [string, number][]).map(([axe, v]) => (
              <div key={axe} className="w-40"><div className="mb-0.5 flex justify-between"><span>{axe}</span><span className="num">{v} %</span></div><Progression valeur={v} /></div>
            ))}
          </div>
        </div>
        <ul className="space-y-1.5 text-sm">
          {c.criteres.filter((r) => !compact || !r.rempli || r.sansObjet).map((r) => (
            <li key={r.critere.id} className="flex items-start gap-2">
              {r.sansObjet ? <MinusCircle size={15} className="mt-0.5 shrink-0 text-slate-300" /> : r.rempli ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-500" />}
              <span className="min-w-0"><span className={r.rempli ? "text-slate-600 dark:text-slate-300" : "font-medium text-slate-900 dark:text-white"}>{r.critere.libelle}</span>
                <span className="block text-xs text-slate-500">{r.explication}{r.sansObjet ? " · sans objet" : ` · poids ${r.critere.poids}`}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </Carte>
  );
}
