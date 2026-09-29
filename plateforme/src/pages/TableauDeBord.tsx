import { useState } from "react";
import { BoutonIA } from "../components/BoutonIA";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Diamond, FileWarning, Pencil, Receipt } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useProjetActif, useStore } from "../store/useStore";
import { avancementPlanning, courbeEnS, suiviParCFC, tachesEnRetard, totauxSuivi } from "../lib/finance";
import { aujourdhui, formatCHF, formatCompact, formatDate, formatPct } from "../lib/format";
import { Avatar, Badge, Bouton, Carte, EnTetePage, Indicateur, Progression } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import { FormulaireProjet } from "./Portefeuille";
import { cfcCorrespond, libelleCFC } from "../data/cfc";

export function TableauDeBord() {
  const d = useProjetActif();
  const { personnes, entreprises, modifier } = useStore();
  const [edition, setEdition] = useState(false);
  if (!d.projet) return <SansProjet />;
  const p = d.projet;
  const jour = aujourdhui();

  const suivi = suiviParCFC(d.budget, d.contrats, d.factures, d.appelsOffres);
  const t = totauxSuivi(suivi);
  const courbe = courbeEnS(p.dateDebut, p.dateFin, t.prevision, d.factures, jour);
  const retards = tachesEnRetard(d.taches, jour);
  const jalons = d.taches.filter((x) => x.jalon && x.fin >= jour).sort((a, b) => a.fin.localeCompare(b.fin)).slice(0, 4);
  const avenants = d.contrats.flatMap((c) => c.avenants.filter((a) => a.statut === "Demandé").map((a) => ({ c, a })));
  const facturesATraiter = d.factures.filter((f) => f.statut === "Reçue" || f.statut === "Contrôlée");
  const nomPers = (id?: string) => personnes.find((x) => x.id === id)?.nom;
  const ecartPct = t.budget ? (t.ecart / t.budget) * 100 : 0;

  const alertes = [
    ...retards.map((x) => ({ icone: <CalendarClock size={16} />, couleur: "text-rose-600", texte: `${x.nom} – ${x.avancement} % au ${formatDate(jour)}, fin prévue ${formatDate(x.fin)}`, lien: "/planning" })),
    ...avenants.map(({ c, a }) => ({ icone: <FileWarning size={16} />, couleur: "text-amber-600", texte: `Avenant ${a.numero} – ${c.numero} : ${a.objet} (${formatCHF(a.montant)})`, lien: `/contrats/${c.id}` })),
    ...facturesATraiter.map((f) => {
      const c = d.contrats.find((x) => x.id === f.contratId);
      const echue = f.echeance < jour;
      return { icone: <Receipt size={16} />, couleur: echue ? "text-rose-600" : "text-sky-600", texte: `Facture ${f.numero} ${entreprises.find((e) => e.id === c?.entrepriseId)?.nom ?? ""} – ${formatCHF(f.montantHT)} (${f.statut}${echue ? ", échue" : ""})`, lien: `/contrats/${c?.id}` };
    }),
  ];

  return (
    <>
      <EnTetePage
        titre={p.nom}
        description={<span className="flex flex-wrap items-center gap-2"><Badge couleur="violet">{p.phase}</Badge>{p.maitreOuvrage} · {p.lieu} · {formatDate(p.dateDebut)} → {formatDate(p.dateFin)}</span>}
        actions={<>
          <Bouton icone={<Pencil size={15} />} onClick={() => setEdition(true)}>Modifier</Bouton>
          <BoutonIA variante="primaire" question={"Fais-moi un point de situation synthétique du projet (finances, planning, risques, décisions à prendre) sous forme de rapport pour le maître d'ouvrage."}>Rapport IA</BoutonIA>
        </>}
      />
      {d.filtreActif && <p className="-mt-3 mb-4 text-sm text-brand-600">Vue filtrée sur vos lots : {d.lots.map((l) => l.code).join(", ")}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Budget" valeur={formatCompact(t.budget)} detail="CHF HT" />
        <Indicateur libelle="Engagé" valeur={formatCompact(t.engage)} detail={`${formatPct(t.budget ? (t.engage / t.budget) * 100 : 0, 0)} du budget`} />
        <Indicateur libelle="Facturé" valeur={formatCompact(t.facture)} detail={`Payé ${formatCompact(t.paye)}`} />
        <Indicateur libelle="Prévision finale" valeur={formatCompact(t.prevision)}
          detail={`Écart ${t.ecart >= 0 ? "+" : ""}${formatCHF(t.ecart)} (${ecartPct.toFixed(1)} %)`} tendance={t.ecart < 0 ? "mauvais" : "bon"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Carte className="lg:col-span-2" titre="Courbe de dépenses" sousTitre="Planifié (courbe en S sur la prévision) vs facturé cumulé">
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <AreaChart data={courbe}>
                <defs>
                  <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gReel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(m: string) => `${m.slice(5)}.${m.slice(2, 4)}`} />
                <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} fontSize={11} width={60} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="planifie" name="Planifié" stroke="#6366f1" strokeDasharray="5 4" fill="url(#gPlan)" strokeWidth={2} />
                <Area type="monotone" dataKey="realise" name="Facturé" stroke="#10b981" fill="url(#gReel)" strokeWidth={2.5} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Carte>

        <Carte titre="Points d'attention" sousTitre={`${alertes.length} élément(s)`} action={alertes.length > 0 && <AlertTriangle size={16} className="text-amber-500" />}>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {alertes.map((a, i) => (
              <li key={i}>
                <Link to={a.lien} className="flex gap-3 px-5 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className={`mt-0.5 ${a.couleur}`}>{a.icone}</span><span className="text-slate-700 dark:text-slate-300">{a.texte}</span>
                </Link>
              </li>
            ))}
            {alertes.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">Rien à signaler 🎉</li>}
          </ul>
        </Carte>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Carte className="lg:col-span-2" titre="Lots" sousTitre="Budget et prévision par lot" action={<Link to="/finances" className="text-sm font-medium text-brand-600 hover:underline">Détail CFC →</Link>}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {d.lots.map((l) => {
              const dansLot = (x: { cfc: string; lotId?: string }) => (x.lotId ? x.lotId === l.id : cfcCorrespond(x.cfc, l.cfc));
              const contratsLot = d.contrats.filter(dansLot);
              const tl = totauxSuivi(suiviParCFC(
                d.budget.filter((b) => cfcCorrespond(b.cfc, l.cfc)), contratsLot,
                d.factures.filter((f) => contratsLot.some((c) => c.id === f.contratId)), d.appelsOffres.filter(dansLot),
              ));
              const { budget, prevision, facture } = tl;
              const resp = nomPers(l.responsableId);
              const taches = d.taches.filter((x) => x.lotId === l.id);
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <div className="w-56 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white"><span className="text-slate-400">{l.code}</span> {l.nom}</p>
                    <p className="truncate text-xs text-slate-500">CFC {l.cfc.map((c) => `${c} ${libelleCFC(c)}`).join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">{resp && <Avatar nom={resp} taille={22} />}{resp ?? "Non attribué"}</div>
                  <div className="ml-auto grid w-full grid-cols-3 gap-4 text-right text-sm sm:w-auto sm:min-w-[330px]">
                    <div><p className="text-xs text-slate-500">Budget</p><p className="num">{formatCompact(budget)}</p></div>
                    <div><p className="text-xs text-slate-500">Prévision</p><p className={`num ${prevision > budget ? "text-rose-600" : ""}`}>{formatCompact(prevision)}</p></div>
                    <div><p className="text-xs text-slate-500">Avancement</p><p className="num">{formatPct(avancementPlanning(taches), 0)}</p></div>
                  </div>
                  <Progression valeur={prevision ? (facture / prevision) * 100 : 0} couleur={p.couleur} />
                </div>
              );
            })}
          </div>
        </Carte>

        <Carte titre="Prochains jalons" action={<Link to="/planning" className="text-sm font-medium text-brand-600 hover:underline">Planning →</Link>}>
          <ul className="space-y-1 p-3">
            {jalons.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <Diamond size={16} className="text-brand-600" fill="currentColor" />
                <div className="flex-1"><p className="text-sm font-medium">{j.nom}</p><p className="text-xs text-slate-500">{nomPers(j.responsableId) ?? ""}</p></div>
                <span className="num text-sm text-slate-600">{formatDate(j.fin)}</span>
              </li>
            ))}
            {jalons.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Aucun jalon à venir</li>}
          </ul>
          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Avancement global</span><span className="num">{formatPct(avancementPlanning(d.taches), 0)}</span></div>
            <Progression valeur={avancementPlanning(d.taches)} couleur={p.couleur} />
          </div>
        </Carte>
      </div>

      {edition && <FormulaireProjet ouverte initial={p} onFermer={() => setEdition(false)} onEnregistrer={(x) => modifier("projets", x.id, x)} />}
    </>
  );
}
