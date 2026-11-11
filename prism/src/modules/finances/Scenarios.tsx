// Scénarios d'atterrissage : plusieurs lectures chiffrées de la fin du projet (probable, favorable,
// défavorable). Le scénario défavorable alimente l'atterrissage défavorable de la synthèse.
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { useSuppression } from "@/app/suppression";
import { lireNombre } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, Case, Liste, Saisie, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { Montant } from "@/app/ui/metier";
import { nouvelId } from "@/domaine/lib/id";
import { totalScenario } from "@/domaine/socle/synthese";
import type { LigneScenario, ScenarioAtterrissage } from "@/domaine/socle/types";
import { useActions, useProjet } from "@/donnees/hooks";
import { useSynthese } from "@/donnees/lectures";

const TYPES: ScenarioAtterrissage["type"][] = ["Probable", "Favorable", "Défavorable", "Autre"];
const COULEUR: Record<ScenarioAtterrissage["type"], CouleurBadge> = { Probable: "bleu", Favorable: "vert", "Défavorable": "rouge", Autre: "gris" };

export function Scenarios() {
  const { projet, scenarios, risques } = useProjet();
  const { ajouter, modifier } = useActions();
  const supprimer = useSuppression();
  const lecture = useLectureSeule();
  const s = useSynthese(projet?.id ?? "");
  if (!projet) return null;

  const nouveau = (type: ScenarioAtterrissage["type"]) => ajouter("scenarios", {
    id: nouvelId("sce"), projetId: projet.id, nom: `Scénario ${type.toLowerCase()}`, type,
    lignes: [{ id: nouvelId("lsc"), libelle: "Atterrissage de référence", montant: Math.round(s.atterrissage) }],
  });
  const majLignes = (sc: ScenarioAtterrissage, lignes: LigneScenario[]) => modifier("scenarios", sc.id, { lignes });
  const bouton = <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => nouveau(scenarios.some((x) => x.type === "Défavorable") ? "Autre" : "Défavorable")}>Scénario</Bouton>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Chaque scénario part de l'atterrissage de référence et y ajoute ses hypothèses. Le scénario défavorable le plus élevé devient l'atterrissage défavorable du projet.</p>
        {scenarios.length > 0 && bouton}
      </div>
      {scenarios.length === 0 && <Carte><Vide icone={<GitBranch size={22} />} titre="Aucun scénario" texte="Chiffrez un scénario défavorable pour montrer l'exposition du projet si ses principaux risques se réalisent." action={bouton} /></Carte>}
      <div className="space-y-6">
        {scenarios.map((sc) => {
          const total = totalScenario(sc);
          return (
            <Carte key={sc.id}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <div className="min-w-48 flex-1"><Saisie aria-label="Nom du scénario" className="font-medium" defaultValue={sc.nom} onBlur={(e) => e.target.value.trim() && e.target.value !== sc.nom && modifier("scenarios", sc.id, { nom: e.target.value.trim() })} /></div>
                <div className="w-40"><Liste aria-label="Type" value={sc.type} onChange={(e) => modifier("scenarios", sc.id, { type: e.target.value as ScenarioAtterrissage["type"] })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Liste></div>
                <Badge couleur={COULEUR[sc.type]}>{sc.type}</Badge>
                <button type="button" disabled={lecture} aria-label={`Supprimer ${sc.nom}`} className="rounded p-1 text-slate-300 hover:text-rose-600 disabled:opacity-40" onClick={() => void supprimer("scenarios", sc.id, { quoi: `« ${sc.nom} »` })}><Trash2 size={15} /></button>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="px-5 py-2 font-medium">Hypothèse</th><th className="w-64 px-2 py-2 font-medium">Risque lié</th><th className="w-28 px-2 py-2 font-medium">Année</th><th className="w-44 px-2 py-2 text-right font-medium">Montant CHF</th><th className="w-10" /></tr></thead>
                <tbody>
                  {sc.lignes.map((l) => {
                    const maj = (patch: Partial<LigneScenario>) => majLignes(sc, sc.lignes.map((x) => (x.id === l.id ? { ...x, ...patch } : x)));
                    return (
                      <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-5 py-1"><Saisie aria-label="Hypothèse" defaultValue={l.libelle} onBlur={(e) => e.target.value !== l.libelle && maj({ libelle: e.target.value })} /></td>
                        <td className="px-2 py-1"><Liste aria-label="Risque lié" value={l.risqueId ?? ""} onChange={(e) => maj({ risqueId: e.target.value || undefined })}><option value="">—</option>{risques.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.titre}</option>)}</Liste></td>
                        <td className="px-2 py-1"><Saisie aria-label="Année" inputMode="numeric" defaultValue={l.annee ?? ""} onBlur={(e) => maj({ annee: Number(e.target.value) || undefined })} /></td>
                        <td className="px-2 py-1"><Saisie aria-label="Montant" className="text-right num" inputMode="decimal" key={l.montant} defaultValue={Math.round(l.montant).toLocaleString("fr-CH")} onBlur={(e) => { const v = lireNombre(e.target.value); if (v !== l.montant) maj({ montant: v }); }} /></td>
                        <td className="pr-3"><button type="button" disabled={lecture} aria-label="Retirer l'hypothèse" className="rounded p-1 text-slate-300 hover:text-rose-600 disabled:opacity-40" onClick={() => majLignes(sc, sc.lignes.filter((x) => x.id !== l.id))}><Trash2 size={13} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
                    <td className="px-5 py-2.5" colSpan={3}>Atterrissage du scénario <span className="ml-2 whitespace-nowrap text-xs font-normal text-slate-500">écart au budget approuvé : <Montant v={s.budgetApprouve - total} signe /></span></td>
                    <td className="px-2 py-2.5 pr-4 text-right"><Montant v={total} /></td><td />
                  </tr>
                </tfoot>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <Bouton taille="sm" variante="fantome" icone={<Plus size={13} />} onClick={() => majLignes(sc, [...sc.lignes, { id: nouvelId("lsc"), libelle: "", montant: 0 }])}>Hypothèse</Bouton>
                <Case libelle="Retenu pour le reporting" checked={!!sc.valide} onChange={(e) => modifier("scenarios", sc.id, { valide: e.target.checked })} />
              </div>
            </Carte>
          );
        })}
      </div>
    </>
  );
}
