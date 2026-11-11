// Registre enrichi : nature, enchaînement cause → événement → conséquence, impacts non financiers,
// stratégie de réponse, évaluation résiduelle, mesures suivies et revues datées.
import { History, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { lireNombre } from "@/app/table/TableDonnees";
import { Bouton, Champ, Liste, Saisie, Zone } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { COULEUR_CRITICITE, criticite } from "@/domaine/lib/risques";
import type { MesureRisque, Risque } from "@/domaine/types";
import { derniereRevue } from "@/donnees/gouvernance";
import { useDonnees, useUtilisateur } from "@/donnees/hooks";

const STRATEGIES: NonNullable<Risque["strategie"]>[] = ["Éviter", "Réduire", "Transférer", "Accepter", "Exploiter"];
const STATUTS_MESURE: MesureRisque["statut"][] = ["Prévue", "En cours", "Réalisée", "Abandonnée"];
const AXES: { cle: keyof NonNullable<Risque["impacts"]>; libelle: string }[] = [{ cle: "delai", libelle: "Délai" }, { cle: "qualite", libelle: "Qualité" }, { cle: "securite", libelle: "Sécurité" }, { cle: "reputation", libelle: "Réputation" }];
const NIVEAUX = ["—", "1 Négligeable", "2 Mineur", "3 Modéré", "4 Important", "5 Majeur"];

export const scoreResiduel = (r: Risque) => (r.probabiliteResiduelle && r.impactResiduel ? r.probabiliteResiduelle * r.impactResiduel : undefined);

export function PastilleScore({ valeur, titre }: { valeur: number; titre?: string }) {
  const c = criticite(valeur);
  return <span title={titre} className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: COULEUR_CRITICITE[c] }}>{valeur} · {c}</span>;
}

export function AnalyseRisque({ r, onChange }: { r: Risque; onChange: (r: Risque) => void }) {
  const { personnes } = useDonnees();
  const utilisateur = useUtilisateur();
  const [commentaire, setCommentaire] = useState("");
  const maj = (patch: Partial<Risque>) => onChange({ ...r, ...patch });
  const mesures = r.mesuresDetail ?? [];
  const majMesure = (id: string, patch: Partial<MesureRisque>) => maj({ mesuresDetail: mesures.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const residuel = scoreResiduel(r);
  const revues = [...(r.revues ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const opportunite = r.nature === "Opportunité";
  const note = (v: string) => Number(v) || undefined;

  return (
    <div className="mt-6 space-y-6 border-t border-slate-100 pt-5 dark:border-slate-800">
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Analyse</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <Champ libelle="Nature"><Liste value={r.nature ?? "Risque"} onChange={(e) => maj({ nature: e.target.value as Risque["nature"] })}><option>Risque</option><option>Opportunité</option></Liste></Champ>
          <Champ libelle="Stratégie de réponse"><Liste value={r.strategie ?? ""} onChange={(e) => maj({ strategie: (e.target.value || undefined) as Risque["strategie"] })}><option value="">—</option>{STRATEGIES.filter((s) => (opportunite ? s === "Exploiter" || s === "Accepter" : s !== "Exploiter")).map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
          <div />
          <Champ libelle="Cause"><Zone rows={2} value={r.cause ?? ""} placeholder="Ce qui peut le provoquer" onChange={(e) => maj({ cause: e.target.value })} /></Champ>
          <Champ libelle="Événement"><Zone rows={2} value={r.evenement ?? ""} placeholder="Ce qui se produirait" onChange={(e) => maj({ evenement: e.target.value })} /></Champ>
          <Champ libelle="Conséquence"><Zone rows={2} value={r.consequence ?? ""} placeholder="Effet sur le projet" onChange={(e) => maj({ consequence: e.target.value })} /></Champ>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {AXES.map((a) => (
            <Champ key={a.cle} libelle={`Impact · ${a.libelle}`}>
              <Liste value={r.impacts?.[a.cle] ?? 0} onChange={(e) => maj({ impacts: { ...r.impacts, [a.cle]: note(e.target.value) } })}>{NIVEAUX.map((n, i) => <option key={n} value={i}>{n}</option>)}</Liste>
            </Champ>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Mesures et évaluation résiduelle</legend>
        <div className="space-y-2">
          {mesures.map((m) => (
            <div key={m.id} className="grid gap-2 rounded-lg bg-slate-50 p-2 md:grid-cols-[minmax(0,1fr)_11rem_9rem_7rem_8rem_auto] dark:bg-slate-800/50">
              <Saisie aria-label="Mesure" placeholder="Mesure" value={m.texte} onChange={(e) => majMesure(m.id, { texte: e.target.value })} />
              <Liste aria-label="Responsable de la mesure" value={m.responsableId ?? ""} onChange={(e) => majMesure(m.id, { responsableId: e.target.value || undefined })}><option value="">Responsable…</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste>
              <Saisie type="date" aria-label="Échéance de la mesure" value={m.echeance ?? ""} onChange={(e) => majMesure(m.id, { echeance: e.target.value || undefined })} />
              <Saisie aria-label="Coût de la mesure" placeholder="Coût CHF" inputMode="decimal" className="text-right num" key={m.cout ?? 0} defaultValue={m.cout ? m.cout.toLocaleString("fr-CH") : ""} onBlur={(e) => majMesure(m.id, { cout: lireNombre(e.target.value) || undefined })} />
              <Liste aria-label="État de la mesure" value={m.statut} onChange={(e) => majMesure(m.id, { statut: e.target.value as MesureRisque["statut"] })}>{STATUTS_MESURE.map((s) => <option key={s}>{s}</option>)}</Liste>
              <button type="button" aria-label="Retirer la mesure" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => maj({ mesuresDetail: mesures.filter((x) => x.id !== m.id) })}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <Bouton taille="sm" variante="fantome" className="mt-1" icone={<Plus size={13} />} onClick={() => maj({ mesuresDetail: [...mesures, { id: nouvelId("mes"), texte: "", statut: "Prévue" }] })}>Mesure</Bouton>
        <div className="mt-4 grid items-end gap-4 md:grid-cols-4">
          <Champ libelle="Probabilité après mesures"><Liste value={r.probabiliteResiduelle ?? 0} onChange={(e) => maj({ probabiliteResiduelle: note(e.target.value) })}>{["—", 1, 2, 3, 4, 5].map((n, i) => <option key={i} value={i}>{n}</option>)}</Liste></Champ>
          <Champ libelle="Impact après mesures"><Liste value={r.impactResiduel ?? 0} onChange={(e) => maj({ impactResiduel: note(e.target.value) })}>{["—", 1, 2, 3, 4, 5].map((n, i) => <option key={i} value={i}>{n}</option>)}</Liste></Champ>
          <div className="pb-2 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
            Criticité brute <PastilleScore valeur={r.probabilite * r.impact} />{residuel !== undefined && <> → résiduelle <PastilleScore valeur={residuel} /></>}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><History size={13} /> Revues <span className="font-normal normal-case tracking-normal">dernière : {formatDate(derniereRevue(r))}</span></legend>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-60 flex-1"><Saisie aria-label="Commentaire de revue" placeholder="Constat de la revue : évolution, mesures engagées…" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} /></div>
          <Bouton onClick={() => { maj({ revues: [...(r.revues ?? []), { date: aujourdhui(), auteurId: utilisateur?.id, probabilite: r.probabilite, impact: r.impact, commentaire: commentaire.trim() || undefined }] }); setCommentaire(""); }}>Consigner la revue du jour</Bouton>
        </div>
        {revues.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {revues.map((v, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 py-1.5">
                <span className="w-24 text-slate-500">{formatDate(v.date)}</span><PastilleScore valeur={v.probabilite * v.impact} />
                <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{v.commentaire ?? "Sans commentaire"}</span>
                <span className="text-xs text-slate-400">{personnes.find((p) => p.id === v.auteurId)?.nom}</span>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
