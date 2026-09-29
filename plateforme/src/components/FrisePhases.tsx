import { useState } from "react";
import { CalendarRange, Pencil, Table2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { GROUPES_PHASES, PHASES, couleurPhase, indexPhase, phaseCourte } from "../data/phasesSia";
import { formatDate, joursEntre } from "../lib/format";
import type { Lot, PhaseSIA, Projet } from "../types";
import { Bouton, Carte, cx, Modale, Onglets, Saisie, useLectureSeule } from "./ui";

/**
 * Frise des phases SIA 112 : une ligne pour le projet, une par lot. Un clic sur une case
 * fixe la phase en cours ; les phases précédentes apparaissent comme terminées.
 */
export function FrisePhases({ projet, lots }: { projet: Projet; lots: Lot[] }) {
  const { modifier } = useStore();
  const lecture = useLectureSeule();
  const [vue, setVue] = useState<"phases" | "calendrier">("phases");
  const [dates, setDates] = useState<Lot | null>(null);

  const lignes: { id: string; libelle: string; phase?: PhaseSIA; lot?: Lot }[] = [
    { id: projet.id, libelle: "Projet (global)", phase: projet.phase },
    ...lots.map((l) => ({ id: l.id, libelle: `${l.code} ${l.nom}`, phase: l.phase, lot: l })),
  ];
  const fixer = (ligne: (typeof lignes)[number], p: PhaseSIA) => {
    if (lecture) return;
    if (ligne.lot) modifier("lots", ligne.lot.id, { phase: p }); else modifier("projets", projet.id, { phase: p });
  };
  const aDesDates = lots.some((l) => Object.keys(l.datesPhases ?? {}).length > 0);

  return (
    <Carte titre="Frise des phases SIA 112" sousTitre={lecture ? "Phase en cours du projet et de chaque lot" : "Cliquez sur une case pour indiquer la phase en cours du projet ou d'un lot"}
      action={<Onglets valeur={vue} onChange={setVue} options={[{ id: "phases", libelle: "Phases" }, { id: "calendrier", libelle: "Calendrier" }]} />}>
      {vue === "phases" ? (
        <div className="overflow-x-auto p-4">
          <table className="w-full table-fixed border-separate border-spacing-x-0.5 border-spacing-y-1 text-xs">
            <thead>
              <tr>
                <th className="w-52" />
                {GROUPES_PHASES.map((g) => (
                  <th key={g.numero} colSpan={g.phases.length} className="max-w-0 truncate px-1 pb-1 text-left text-[11px] font-semibold" style={{ color: g.couleur }} title={`${g.numero} · ${g.nom}`}>
                    {g.numero} · {g.nom}
                  </th>
                ))}
                <th />
              </tr>
              <tr>
                <th />
                {PHASES.map((p) => <th key={p} className="truncate px-1 pb-1 text-left font-normal text-slate-500" title={p}>{p.split(" ")[0]}</th>)}
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const courant = indexPhase(l.phase);
                return (
                  <tr key={l.id}>
                    <td className={cx("truncate pr-3 text-sm", i === 0 ? "font-semibold" : "text-slate-700 dark:text-slate-300")} title={l.libelle}>{l.libelle}</td>
                    {PHASES.map((p, j) => {
                      const periode = l.lot?.datesPhases?.[p];
                      return (
                        <td key={p} className="p-0">
                          <button disabled={lecture} onClick={() => fixer(l, p)}
                            title={`${p}${periode?.debut ? ` · ${formatDate(periode.debut)} → ${formatDate(periode.fin)}` : ""}`}
                            className={cx("flex h-8 w-full items-center justify-center rounded transition enabled:hover:ring-2 enabled:hover:ring-slate-300",
                              j === courant && "font-semibold text-white shadow-sm", j > courant && "bg-slate-100 dark:bg-slate-800")}
                            style={j < courant ? { background: `${couleurPhase(p)}33` } : j === courant ? { background: couleurPhase(p) } : undefined}>
                            {j === courant ? p.split(" ")[0] : j < courant ? "✓" : periode?.debut ? <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="pl-2">
                      {l.lot && !lecture && <button title="Dates des phases" onClick={() => setDates(l.lot!)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : aDesDates ? (
        <CalendrierPhases lots={lots} />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-slate-500">
          <CalendarRange size={24} className="text-slate-300" />
          Renseignez les dates des phases d'un lot (crayon dans la vue « Phases ») pour afficher le calendrier.
          <Bouton libre taille="sm" icone={<Table2 size={14} />} onClick={() => setVue("phases")}>Vue phases</Bouton>
        </div>
      )}

      {dates && <DatesPhases lot={dates} onFermer={() => setDates(null)} />}
    </Carte>
  );
}

function CalendrierPhases({ lots }: { lots: Lot[] }) {
  const toutes = lots.flatMap((l) => Object.values(l.datesPhases ?? {})).flatMap((d) => [d?.debut, d?.fin]).filter((x): x is string => !!x).sort();
  const debut = toutes[0].slice(0, 7) + "-01";
  const fin = toutes.at(-1)!;
  const total = Math.max(1, joursEntre(debut, fin) + 31);
  const pct = (iso: string) => (joursEntre(debut, iso) / total) * 100;
  const annees: string[] = [];
  for (let a = Number(debut.slice(0, 4)); a <= Number(fin.slice(0, 4)); a++) annees.push(String(a));
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-2 p-4">
      <div className="relative ml-44 h-5 text-[11px] text-slate-500">
        {annees.map((a) => { const x = pct(`${a}-01-01`); return x >= 0 && x <= 100 ? <span key={a} className="absolute border-l border-slate-200 pl-1 dark:border-slate-700" style={{ left: `${x}%` }}>{a}</span> : null; })}
      </div>
      {lots.map((l) => (
        <div key={l.id} className="flex items-center gap-2">
          <span className="w-42 shrink-0 truncate text-sm">{l.code} {l.nom}</span>
          <div className="relative h-7 flex-1 rounded bg-slate-50 dark:bg-slate-800/50">
            {PHASES.map((p) => {
              const d = l.datesPhases?.[p];
              if (!d?.debut || !d.fin) return null;
              return (
                <div key={p} className="absolute inset-y-0.5 flex items-center overflow-hidden whitespace-nowrap rounded px-1.5 text-[10px] font-medium text-white"
                  style={{ left: `${pct(d.debut)}%`, width: `${Math.max(0.8, pct(d.fin) - pct(d.debut))}%`, background: couleurPhase(p), opacity: l.phase === p ? 1 : 0.75 }}
                  title={`${p} : ${formatDate(d.debut)} → ${formatDate(d.fin)}`}>
                  {phaseCourte(p)}
                </div>
              );
            })}
            {aujourdhui >= debut && aujourdhui <= fin && <div className="absolute inset-y-0 w-px bg-rose-500" style={{ left: `${pct(aujourdhui)}%` }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function DatesPhases({ lot, onFermer }: { lot: Lot; onFermer: () => void }) {
  const { modifier } = useStore();
  const [d, setD] = useState(lot.datesPhases ?? {});
  const maj = (p: PhaseSIA, champ: "debut" | "fin", v: string) => setD({ ...d, [p]: { ...d[p], [champ]: v || undefined } });
  return (
    <Modale ouverte large onFermer={onFermer} titre={`Dates des phases – ${lot.code} ${lot.nom}`}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" onClick={() => { modifier("lots", lot.id, { datesPhases: d }); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {PHASES.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleurPhase(p) }} />
            <span className="w-44 truncate text-sm" title={p}>{p}</span>
            <Saisie type="date" value={d[p]?.debut ?? ""} onChange={(e) => maj(p, "debut", e.target.value)} className="!px-2 !py-1 text-xs" />
            <Saisie type="date" value={d[p]?.fin ?? ""} onChange={(e) => maj(p, "fin", e.target.value)} className="!px-2 !py-1 text-xs" />
          </div>
        ))}
      </div>
    </Modale>
  );
}
