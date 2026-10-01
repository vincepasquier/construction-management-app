import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Split, Trash2, Upload } from "lucide-react";
import { useStore } from "../../store/useStore";
import { montantContrat } from "../../lib/finance";
import { formatCHF, formatDate } from "../../lib/format";
import { importerFactures } from "../../lib/importFactures";
import { lireTableau } from "../../lib/lectureCsv";
import { cleEntreprise } from "../../lib/importSuiviFinancier";
import type { FactureHorsCommande } from "../../types";
import { Badge, Bouton, Carte, cx, Liste, Progression, Tableau } from "../ui";
import { Montant } from "./communs";
import { ModaleRepartition } from "./OngletEngagements";
import type { Budget } from "./useBudget";

const VALIDES = new Set(["Contrôlée", "Approuvée", "Payée"]);

export function OngletFactures({ b }: { b: Budget }) {
  const { modifier, supprimer, entreprises, contrats: tous, factures: toutes, fusionnerDonnees } = useStore();
  const pid = b.d.projet!.id;
  const contrats = tous.filter((c) => c.projetId === pid);
  const factures = toutes.filter((f) => f.projetId === pid);
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [affecter, setAffecter] = useState<FactureHorsCommande | null>(null);
  const [filtre, setFiltre] = useState<"a-affecter" | "toutes">("a-affecter");
  const nomEnt = (id?: string) => entreprises.find((e) => e.id === id)?.nom ?? "";

  const parCommande = contrats.map((c) => {
    const fs = factures.filter((f) => f.contratId === c.id && VALIDES.has(f.statut));
    const facture = fs.reduce((s, f) => s + f.montantHT, 0);
    const montant = montantContrat(c);
    return { c, facture, paye: fs.filter((f) => f.statut === "Payée").reduce((s, f) => s + f.montantHT, 0), montant, taux: montant ? facture / montant : 0, nb: fs.length };
  }).filter((x) => x.nb > 0 || x.c.statut !== "Annulé").sort((x, y) => y.taux - x.taux);
  const hc = b.d.facturesHorsCommande.filter((f) => filtre === "toutes" || !f.repartition.length).sort((x, y) => y.date.localeCompare(x.date));

  /** Position proposée : celle où le même fournisseur a déjà été imputé */
  const suggestion = (f: FactureHorsCommande) => {
    const k = cleEntreprise(f.fournisseur);
    if (!k) return undefined;
    const meme = b.d.facturesHorsCommande.find((x) => x.id !== f.id && x.repartition.length && cleEntreprise(x.fournisseur) === k);
    if (meme) return meme.repartition[0].budgetId;
    const ctr = contrats.find((c) => cleEntreprise(nomEnt(c.entrepriseId)) === k && c.repartition?.length);
    return ctr?.repartition?.[0].budgetId;
  };

  const importer = async (f: File) => {
    try {
      const r = importerFactures(await lireTableau(f), { projetId: pid, contrats, factures, facturesHorsCommande: b.d.facturesHorsCommande });
      fusionnerDonnees({ factures: r.factures, facturesHorsCommande: r.facturesHorsCommande });
      for (const m of r.majPaiement) {
        if (m.type === "hors") modifier("facturesHorsCommande", m.id, { paye: m.paye });
        else if (m.paye) modifier("factures", m.id, { statut: "Payée" });
      }
      setMessage({ ok: true, texte: `Import terminé : ${r.resume}.` });
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="space-y-6">
      <Carte className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-white">Import de l'export Power BI (ou ERP)</p>
            <p>Fichier Excel ou CSV avec les colonnes <em>N° comd, N° fact, Montant validé HT, Date, Statut facture, Fournisseur</em>. Les factures déjà importées sont reconnues par leur numéro (seul leur paiement est mis à jour).</p>
          </div>
          <input ref={fichier} type="file" accept=".xlsx,.xlsm,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importer(f); e.target.value = ""; }} />
          <Bouton variante="primaire" icone={<Upload size={15} />} onClick={() => fichier.current?.click()}>Importer les factures</Bouton>
        </div>
        {message && (
          <p className={cx("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm", message.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200")}>
            {message.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{message.texte}
          </p>
        )}
      </Carte>

      <Carte titre="Factures hors commande" sousTitre="À affecter à une ou plusieurs positions ; elles comptent dans l'engagé"
        action={<Liste libre value={filtre} onChange={(e) => setFiltre(e.target.value as "a-affecter" | "toutes")} className="!w-40 !py-1 text-xs"><option value="a-affecter">À affecter</option><option value="toutes">Toutes</option></Liste>}>
        {hc.length ? (
          <Tableau>
            <thead><tr><th>Date</th><th>N°</th><th>Fournisseur</th><th>Positions</th><th className="!text-right">Montant</th><th>Payée</th><th /></tr></thead>
            <tbody>
              {hc.map((f) => {
                const sug = !f.repartition.length ? suggestion(f) : undefined;
                return (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(f.date)}</td>
                    <td className="num text-xs">{f.numero}{f.numeroFournisseur && <p className="text-slate-400">{f.numeroFournisseur}</p>}</td>
                    <td>{f.fournisseur}{f.remarques && <p className="text-xs text-slate-500">{f.remarques}</p>}</td>
                    <td className="max-w-xs text-xs">
                      {f.repartition.length ? f.repartition.map((r) => <p key={r.budgetId} className="truncate text-slate-600 dark:text-slate-400" title={b.libelle(r.budgetId)}>{b.libelle(r.budgetId)}</p>) : (
                        sug ? (
                          <button className="text-left text-brand-600 hover:underline" onClick={() => modifier("facturesHorsCommande", f.id, { repartition: [{ budgetId: sug, montant: f.montantHT }] })}>
                            Affecter à « {b.libelle(sug)} » ?
                          </button>
                        ) : <span className="text-rose-600">à affecter</span>
                      )}
                    </td>
                    <Montant v={f.montantHT} />
                    <td>{f.paye ? <Badge couleur="vert">payée</Badge> : <Badge>non</Badge>}</td>
                    <td className="whitespace-nowrap text-right">
                      <Bouton taille="sm" variante="fantome" title="Affecter aux positions" onClick={() => setAffecter(f)}><Split size={14} /></Bouton>
                      <Bouton taille="sm" variante="fantome" title="Supprimer" onClick={() => confirm("Supprimer cette facture ?") && supprimer("facturesHorsCommande", f.id)}><Trash2 size={14} /></Bouton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">{filtre === "a-affecter" ? "Toutes les factures hors commande sont affectées." : "Aucune facture hors commande."}</p>}
      </Carte>

      <Carte titre="Avancement de la facturation par commande" sousTitre="Factures contrôlées, approuvées ou payées">
        <Tableau>
          <thead><tr><th>Commande</th><th>Fournisseur</th><th className="!text-right">Montant</th><th className="!text-right">Facturé</th><th className="!text-right">Payé</th><th className="!text-right">Solde</th><th>Accomplissement</th></tr></thead>
          <tbody>
            {parCommande.map(({ c, facture, paye, montant, taux }) => (
              <tr key={c.id}>
                <td className="num"><Link to={`/contrats/${c.id}`} className="text-brand-600 hover:underline">{c.numero}</Link><p className="text-xs text-slate-500">{c.objet}</p></td>
                <td>{nomEnt(c.entrepriseId)}</td>
                <Montant v={montant} /><Montant v={facture} /><Montant v={paye} attenue /><Montant v={montant - facture} />
                <td className="w-56 min-w-56">
                  <div className="flex items-center gap-2">
                    <Progression valeur={taux * 100} />
                    <span className={cx("num w-12 shrink-0 whitespace-nowrap text-right text-xs", facture > montant + 0.5 ? "font-semibold text-rose-600" : taux >= 0.999 ? "text-emerald-600" : "text-slate-500")}>{(taux * 100).toFixed(0)} %</span>
                  </div>
                  {facture > montant + 0.5 && <p className="whitespace-nowrap text-xs text-rose-600">dépassement de {formatCHF(facture - montant)}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      </Carte>

      {affecter && (
        <ModaleRepartition b={b} titre={`Facture ${affecter.numero} – ${affecter.fournisseur}`} total={affecter.montantHT} initial={affecter.repartition}
          aide={`${formatCHF(affecter.montantHT)} du ${formatDate(affecter.date)}. Une seule position : le montant entier lui est imputé.`}
          onFermer={() => setAffecter(null)}
          onEnregistrer={(r) => modifier("facturesHorsCommande", affecter.id, { repartition: r })} />
      )}
    </div>
  );
}
