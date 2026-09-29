import { Fragment, useMemo, useState } from "react";
import { BoutonIA } from "../components/BoutonIA";
import { ChevronRight, Download, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { ImportChiffrage } from "../components/ImportChiffrage";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDroit, useProjetActif, useStore } from "../store/useStore";
import { suiviParCFC, totauxSuivi, type LigneSuivi } from "../lib/finance";
import { formatCHF, formatCompact, formatPct } from "../lib/format";
import { telechargerCSV } from "../lib/csv";
import { nouvelId } from "../lib/id";
import { CFC_OPTIONS, libelleCFC } from "../data/cfc";
import { Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Modale, Onglets, Progression, Saisie, Tableau, Zone } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { BudgetLigne } from "../types";

export function Finances() {
  const d = useProjetActif();
  const { ajouter, modifier, supprimer } = useStore();
  const [onglet, setOnglet] = useState<"suivi" | "budget">("suivi");
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set(["0", "1", "2", "3", "4", "5", "9"]));
  const [edition, setEdition] = useState<BudgetLigne | null>(null);
  const [importIA, setImportIA] = useState(false);
  const droitIA = useDroit("ia");

  const suivi = useMemo(() => suiviParCFC(d.budget, d.contrats, d.factures, d.appelsOffres), [d.budget, d.contrats, d.factures, d.appelsOffres]);
  if (!d.projet) return <SansProjet />;
  const projetId = d.projet.id;
  const t = totauxSuivi(suivi);
  const codes = [...suivi.keys()].sort();

  // Enfants directs : codes plus longs dont le parent le plus proche présent est `code`
  const parent = (code: string) => {
    for (let n = code.length - 1; n > 0; n--) if (suivi.has(code.slice(0, n))) return code.slice(0, n);
    return null;
  };
  const enfants = (code: string | null) => codes.filter((c) => parent(c) === code);
  const basculer = (code: string) => setOuverts((s) => { const n = new Set(s); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  const libelle = (code: string) => libelleCFC(code) || d.budget.find((b) => b.cfc === code)?.libelle || "";

  const lignesRendu = (code: string, profondeur: number): React.ReactNode => {
    const l = suivi.get(code)!;
    const sous = enfants(code);
    const ouvert = ouverts.has(code);
    const conso = l.prevision ? (l.facture / l.prevision) * 100 : 0;
    return (
      <Fragment key={code}>
        <tr className={cx(profondeur === 0 && "bg-slate-50/60 font-semibold dark:bg-slate-800/30")}>
          <td>
            <button onClick={() => sous.length && basculer(code)} className="flex min-w-72 items-center gap-1.5 text-left" style={{ paddingLeft: profondeur * 18 }}>
              {sous.length > 0 ? <ChevronRight size={14} className={cx("text-slate-400 transition", ouvert && "rotate-90")} /> : <span className="w-3.5" />}
              <span className="num w-10 text-slate-500">{code}</span>
              <span className="whitespace-nowrap text-slate-800 dark:text-slate-200">{libelle(code)}</span>
            </button>
          </td>
          <Montant v={l.budget} />
          <Montant v={l.engage} />
          <Montant v={l.enAttente} attenue />
          <Montant v={l.facture} />
          <Montant v={l.prevision} />
          <td className={cx("num text-right", l.ecart < -0.5 ? "text-rose-600" : l.ecart > 0.5 ? "text-emerald-600" : "text-slate-400")}>
            {Math.abs(l.ecart) < 0.5 ? "—" : `${l.ecart > 0 ? "+" : ""}${formatCHF(l.ecart)}`}
          </td>
          <td className="w-32"><div className="flex items-center gap-2"><Progression valeur={conso} /><span className="num w-9 text-right text-xs text-slate-500">{conso.toFixed(0)}%</span></div></td>
        </tr>
        {ouvert && sous.map((c) => lignesRendu(c, profondeur + 1))}
      </Fragment>
    );
  };

  const exporter = () => telechargerCSV(`${d.projet!.code}_suivi_CFC`,
    ["CFC", "Libellé", "Budget", "Engagé", "Avenants en attente", "Facturé", "Payé", "Prévision", "Écart"],
    codes.map((c) => { const l = suivi.get(c)!; return [c, libelle(c), l.budget, l.engage, l.enAttente, l.facture, l.paye, l.prevision, l.ecart]; }));

  const graphe = enfants(null).map((c) => ({ nom: `${c} ${libelle(c)}`, ...suivi.get(c)! }));

  return (
    <>
      <EnTetePage titre="Finances" description="Suivi budgétaire par code des frais de construction (CFC) – montants HT"
        actions={<>
          <Bouton libre icone={<Download size={15} />} onClick={exporter}>Export Excel</Bouton>
          <BoutonIA question={"Analyse le suivi financier par CFC : identifie les dépassements probables, les postes à risque, l'utilisation de la réserve et propose des mesures correctives."}>Analyse IA</BoutonIA>
          {droitIA.ecrire && <Bouton icone={<FileUp size={15} />} onClick={() => setImportIA(true)}>Importer un chiffrage (IA)</Bouton>}
          <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition({ id: nouvelId("bud"), projetId, cfc: "", libelle: "", montant: 0 })}>Ligne budgétaire</Bouton>
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Budget" valeur={formatCompact(t.budget)} />
        <Indicateur libelle="Engagé" valeur={formatCompact(t.engage)} detail={formatPct(t.budget ? (t.engage / t.budget) * 100 : 0, 0)} />
        <Indicateur libelle="Avenants en attente" valeur={formatCompact(t.enAttente)} tendance={t.enAttente ? "alerte" : undefined} detail={t.enAttente ? "à décider" : "aucun"} />
        <Indicateur libelle="Facturé" valeur={formatCompact(t.facture)} detail={`Payé ${formatCompact(t.paye)}`} />
        <Indicateur libelle="Écart final" valeur={`${t.ecart >= 0 ? "+" : ""}${formatCompact(t.ecart)}`} tendance={t.ecart < 0 ? "mauvais" : "bon"} detail={`Prévision ${formatCompact(t.prevision)}`} />
      </div>

      <div className="mt-6 mb-4"><Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "suivi", libelle: "Suivi CFC" }, { id: "budget", libelle: "Budget détaillé", compte: d.budget.length }]} /></div>

      {onglet === "suivi" ? (
        <>
          <Carte>
            <Tableau>
              <thead><tr><th>CFC</th><th className="!text-right">Budget</th><th className="!text-right">Engagé</th><th className="!text-right">En attente</th><th className="!text-right">Facturé</th><th className="!text-right">Prévision</th><th className="!text-right">Écart</th><th>Facturé / prév.</th></tr></thead>
              <tbody>{enfants(null).map((c) => lignesRendu(c, 0))}</tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold dark:border-slate-700 [&_td]:px-4 [&_td]:py-3">
                <tr><td>Total projet</td><Montant v={t.budget} /><Montant v={t.engage} /><Montant v={t.enAttente} /><Montant v={t.facture} /><Montant v={t.prevision} />
                  <td className={cx("num text-right", t.ecart < 0 ? "text-rose-600" : "text-emerald-600")}>{t.ecart > 0 ? "+" : ""}{formatCHF(t.ecart)}</td><td /></tr>
              </tfoot>
            </Tableau>
          </Carte>
          <p className="mt-2 text-xs text-slate-500">
            Prévision = contrats actualisés + avenants en attente ; à défaut meilleure offre reçue, estimation de l'AO, puis budget.
          </p>
          <Carte className="mt-6" titre="Répartition par groupe CFC">
            <div className="h-72 p-4">
              <ResponsiveContainer>
                <BarChart data={graphe} layout="vertical" barGap={2} margin={{ left: 20 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCompact} fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nom" width={190} fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCHF(Number(v))} cursor={{ fill: "rgba(99,102,241,.06)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey={(l: LigneSuivi) => l.budget} name="Budget" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={(l: LigneSuivi) => l.prevision} name="Prévision" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={(l: LigneSuivi) => l.facture} name="Facturé" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Carte>
        </>
      ) : (
        <Carte>
          <Tableau>
            <thead><tr><th>CFC</th><th>Libellé</th><th className="!text-right">Montant HT</th><th>Notes</th><th /></tr></thead>
            <tbody>
              {[...d.budget].sort((a, b) => a.cfc.localeCompare(b.cfc)).map((b) => (
                <tr key={b.id}>
                  <td className="num text-slate-500">{b.cfc}</td>
                  <td><p className="font-medium">{b.libelle}</p><p className="text-xs text-slate-500">{libelleCFC(b.cfc)}</p></td>
                  <Montant v={b.montant} />
                  <td className="max-w-xs truncate text-slate-500">{b.notes}</td>
                  <td className="text-right">
                    <Bouton taille="sm" variante="fantome" onClick={() => setEdition(b)} aria-label="Modifier"><Pencil size={14} /></Bouton>
                    <Bouton taille="sm" variante="fantome" onClick={() => confirm(`Supprimer « ${b.libelle} » ?`) && supprimer("budget", b.id)} aria-label="Supprimer"><Trash2 size={14} /></Bouton>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      )}

      {importIA && <ImportChiffrage projetId={projetId} onFermer={() => { setImportIA(false); setOnglet("budget"); }} />}

      {edition && (
        <FormulaireBudget initial={edition} onFermer={() => setEdition(null)}
          onEnregistrer={(b) => (d.budget.some((x) => x.id === b.id) ? modifier("budget", b.id, b) : ajouter("budget", b))} />
      )}
    </>
  );
}

function Montant({ v, attenue }: { v: number; attenue?: boolean }) {
  return <td className={cx("num text-right", (attenue || !v) && "text-slate-400")}>{v ? formatCHF(v) : "—"}</td>;
}

function FormulaireBudget({ initial, onFermer, onEnregistrer }: { initial: BudgetLigne; onFermer: () => void; onEnregistrer: (b: BudgetLigne) => void }) {
  const [b, setB] = useState(initial);
  return (
    <Modale ouverte onFermer={onFermer} titre="Ligne budgétaire"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!b.cfc || !b.libelle} onClick={() => { onEnregistrer(b); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid grid-cols-3 gap-4">
        <Champ libelle="Code CFC">
          <Saisie list="cfc-liste" value={b.cfc} onChange={(e) => setB({ ...b, cfc: e.target.value.trim(), libelle: b.libelle || libelleCFC(e.target.value.trim()) })} placeholder="211" />
          <datalist id="cfc-liste">{CFC_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}</datalist>
        </Champ>
        <Champ libelle="Libellé" className="col-span-2"><Saisie value={b.libelle} onChange={(e) => setB({ ...b, libelle: e.target.value })} /></Champ>
        <Champ libelle="Montant HT (CHF)" className="col-span-3"><Saisie type="number" value={b.montant || ""} onChange={(e) => setB({ ...b, montant: Number(e.target.value) })} /></Champ>
        <Champ libelle="Notes" className="col-span-3"><Zone rows={2} value={b.notes ?? ""} onChange={(e) => setB({ ...b, notes: e.target.value })} /></Champ>
      </div>
    </Modale>
  );
}
