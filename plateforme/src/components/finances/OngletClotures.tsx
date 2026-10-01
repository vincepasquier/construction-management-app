import { useState } from "react";
import { CalendarCheck, Trash2 } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../../store/useStore";
import { cascade, photographier } from "../../lib/budget";
import { aujourdhui, formatCHF, formatCompact, formatDate } from "../../lib/format";
import { nouvelId } from "../../lib/id";
import { Bouton, Carte, Champ, Liste, Modale, Saisie, Tableau, Vide, Zone } from "../ui";
import { Cascade, Ecart, Montant } from "./communs";
import { moisLisible, VariationsPrincipales } from "./OngletSynthese";
import type { Budget } from "./useBudget";

export function OngletClotures({ b }: { b: Budget }) {
  const { ajouter, supprimer, utilisateurId, personnes } = useStore();
  const clotures = b.d.clotures;
  const [nouvelle, setNouvelle] = useState(false);
  const [depuis, setDepuis] = useState<string>(clotures.at(-1)?.id ?? "");
  const ref = clotures.find((c) => c.id === depuis) ?? clotures.at(-1);
  const t = b.totaux;

  const serie = [
    ...clotures.map((c) => ({ nom: moisLisible(c.mois), revise: c.totaux.revise, atterrissage: c.totaux.atterrissage, defavorable: c.totaux.atterrissageDefavorable, engage: c.totaux.engage, facture: c.totaux.facture })),
    { nom: "Aujourd'hui", revise: t.revise, atterrissage: t.atterrissage, defavorable: t.atterrissageDefavorable, engage: t.engage, facture: t.facture },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Une clôture fige l'état financier du mois ; elle sert de point de comparaison et ne se modifie plus.</p>
        <Bouton variante="primaire" className="ml-auto" icone={<CalendarCheck size={15} />} onClick={() => setNouvelle(true)}>Clôturer le mois</Bouton>
      </div>

      {clotures.length ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Carte titre="Évolution" sousTitre="Budget révisé, atterrissage et réalisé à chaque clôture">
              <div className="h-72 p-4">
                <ResponsiveContainer>
                  <LineChart data={serie} margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nom" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={64} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v) => formatCHF(Number(v))} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                    <Line dataKey="revise" name="Budget révisé" stroke="#94a3b8" strokeDasharray="5 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line dataKey="atterrissage" name="Atterrissage probable" stroke="#6366f1" strokeWidth={2.5} isAnimationActive={false} />
                    <Line dataKey="defavorable" name="Défavorable" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line dataKey="engage" name="Engagé" stroke="#0ea5e9" strokeWidth={1.5} isAnimationActive={false} />
                    <Line dataKey="facture" name="Facturé" stroke="#10b981" strokeWidth={1.5} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Carte>
            <Carte titre="Ce qui a fait bouger l'atterrissage"
              action={<Liste libre value={ref?.id ?? ""} onChange={(e) => setDepuis(e.target.value)} className="!w-48 !py-1 text-xs">
                {clotures.map((c) => <option key={c.id} value={c.id}>depuis {moisLisible(c.mois)}</option>)}
              </Liste>}>
              {ref && (
                <div className="p-4">
                  <Cascade etapes={cascade(ref.totaux, t, { avant: moisLisible(ref.mois), apres: "Aujourd'hui" })} />
                  <VariationsPrincipales b={b} avant={ref.positions} />
                </div>
              )}
            </Carte>
          </div>

          <Carte titre="Clôtures">
            <Tableau>
              <thead><tr><th>Mois</th><th>Clôturé le</th><th className="!text-right">Révisé</th><th className="!text-right">Engagé</th><th className="!text-right">Atterrissage</th><th className="!text-right">Écart</th><th className="!text-right">Facturé</th><th>Commentaire</th><th /></tr></thead>
              <tbody>
                {[...clotures].reverse().map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium whitespace-nowrap">{moisLisible(c.mois)}</td>
                    <td className="whitespace-nowrap text-xs text-slate-500">{formatDate(c.date)}<br />{personnes.find((p) => p.id === c.auteurId)?.nom}</td>
                    <Montant v={c.totaux.revise} /><Montant v={c.totaux.engage} /><Montant v={c.totaux.atterrissage} gras /><Ecart v={c.totaux.revise - c.totaux.atterrissage} /><Montant v={c.totaux.facture} />
                    <td className="max-w-sm text-xs text-slate-600 dark:text-slate-400">{c.commentaire}</td>
                    <td><Bouton taille="sm" variante="fantome" title="Supprimer" onClick={() => confirm(`Supprimer la clôture de ${moisLisible(c.mois)} ?`) && supprimer("clotures", c.id)}><Trash2 size={14} /></Bouton></td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </Carte>
        </>
      ) : (
        <Carte><Vide icone={<CalendarCheck size={22} />} titre="Aucune clôture" texte="Clôturez chaque fin de mois pour pouvoir expliquer l'évolution de l'atterrissage au maître d'ouvrage." /></Carte>
      )}

      {nouvelle && (
        <NouvelleCloture moisExistants={clotures.map((c) => c.mois)} onFermer={() => setNouvelle(false)} onCloturer={(mois, commentaire) => {
          const existante = clotures.find((c) => c.mois === mois);
          if (existante) supprimer("clotures", existante.id);
          const id = nouvelId("clo");
          ajouter("clotures", { id, projetId: b.d.projet!.id, mois, date: aujourdhui(), auteurId: utilisateurId ?? undefined, commentaire, ...photographier(b.toutes) });
          setDepuis(id);
          setNouvelle(false);
        }} />
      )}
    </div>
  );
}

function NouvelleCloture({ moisExistants, onFermer, onCloturer }: { moisExistants: string[]; onFermer: () => void; onCloturer: (mois: string, commentaire: string) => void }) {
  const [mois, setMois] = useState(aujourdhui().slice(0, 7));
  const [commentaire, setCommentaire] = useState("");
  const remplace = moisExistants.includes(mois);
  return (
    <Modale ouverte onFermer={onFermer} titre="Clôturer le mois"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!mois} onClick={() => onCloturer(mois, commentaire)}>{remplace ? "Remplacer la clôture" : "Clôturer"}</Bouton></>}>
      <div className="space-y-4">
        <Champ libelle="Mois"><Saisie type="month" value={mois} onChange={(e) => setMois(e.target.value)} /></Champ>
        {remplace && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Ce mois est déjà clôturé : la clôture existante sera remplacée.</p>}
        <Champ libelle="Commentaire de la direction de projet" aide="Repris dans le rapport mensuel : faits marquants, décisions attendues, risques.">
          <Zone rows={4} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </Champ>
      </div>
    </Modale>
  );
}
