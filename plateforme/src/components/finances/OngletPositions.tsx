import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { effetAjustement, grouper, STATUTS_OFFRE_ACTIFS, type PositionCalculee } from "../../lib/budget";
import { montantContrat } from "../../lib/finance";
import { aujourdhui, formatCHF, formatDate } from "../../lib/format";
import { telechargerCSV } from "../../lib/csv";
import { nouvelId } from "../../lib/id";
import { CFC_OPTIONS, libelleCFC } from "../../data/cfc";
import type { BudgetLigne, ModeResteAEngager } from "../../types";
import { Badge, Bouton, Carte, Champ, cx, Liste, Modale, Saisie, Tableau, Zone } from "../ui";
import { Ecart, formatMontant, Montant } from "./communs";
import type { Budget } from "./useBudget";

const MODES: { id: ModeResteAEngager; libelle: string; aide: string }[] = [
  { id: "auto", libelle: "Automatique", aide: "Budget restant tant que rien n'est commandé ni prévu, puis position soldée (règle du classeur)" },
  { id: "budget", libelle: "Budget restant", aide: "Budget révisé − engagé − attendu, même après une commande" },
  { id: "solde", libelle: "Soldée", aide: "Plus rien à engager sur cette position" },
  { id: "saisi", libelle: "Montant estimé", aide: "Montant restant à engager selon le responsable" },
];

export function OngletPositions({ b }: { b: Budget }) {
  const { ajouter, modifier } = useStore();
  const [lot, setLot] = useState("");
  const [etape, setEtape] = useState("");
  const [texte, setTexte] = useState("");
  const [depassements, setDepassements] = useState(false);
  const [fermes, setFermes] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [edition, setEdition] = useState<BudgetLigne | null>(null);

  const etapes = [...new Set(b.positions.map((p) => p.ligne.etape).filter(Boolean))] as string[];
  const visibles = b.positions.filter((p) =>
    (!lot || (p.lotId ?? "") === lot) && (!etape || p.ligne.etape === etape) && (!depassements || p.ecart < -0.5)
    && (!texte || `${p.ligne.groupe} ${p.ligne.libelle} ${p.ligne.cfc}`.toLowerCase().includes(texte.toLowerCase())));
  const parLot = grouper(visibles, (p) => p.lotId ?? "");
  const basculer = (k: string) => setFermes((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const nomLot = (id: string) => { const l = b.lots.find((x) => x.id === id); return l ? `${l.code} – ${l.nom}` : "Hors lot"; };
  const groupeDe = (p: PositionCalculee) => p.ligne.groupe || (p.ligne.cfc ? `${p.ligne.cfc.slice(0, 1)} ${libelleCFC(p.ligne.cfc.slice(0, 1))}`.trim() : "Divers");

  const exporter = () => telechargerCSV(`${b.d.projet!.code}_suivi_positions`,
    ["Lot", "Position", "Sous-position", "Étape", "CFC", "Budget initial", "Mutations", "Budget révisé", "Engagé (commandes)", "Hors commande", "Attendu", "Reste à engager", "Ajustements", "Atterrissage", "Atterrissage défavorable", "Écart", "Facturé", "Payé"],
    visibles.map((p) => [b.lots.find((l) => l.id === p.lotId)?.code ?? "", groupeDe(p), p.ligne.libelle, p.ligne.etape ?? "", p.ligne.cfc,
      p.initial, p.mutations, p.revise, p.engageCommandes, p.horsCommande, p.attendu, p.rae, p.ajustements, p.atterrissage, p.atterrissageDefavorable, p.ecart, p.facture, p.paye]));

  const ligneTotaux = (cle: string, libelle: React.ReactNode, t: ReturnType<typeof grouper>[number]["totaux"], niveau: number) => (
    <tr className={cx("cursor-pointer", niveau === 0 ? "bg-slate-50 font-semibold dark:bg-slate-800/40" : "font-medium")} onClick={() => basculer(cle)}>
      <td colSpan={2}>
        <span className="flex items-center gap-1.5" style={{ paddingLeft: niveau * 16 }}>
          <ChevronRight size={14} className={cx("shrink-0 text-slate-400 transition", !fermes.has(cle) && "rotate-90")} />{libelle}
        </span>
      </td>
      <Montant v={t.revise} /><Montant v={t.engage} /><Montant v={t.attendu} /><Montant v={t.rae} /><Montant v={t.ajustements} signe />
      <Montant v={t.atterrissage} gras /><Ecart v={t.ecart} /><Montant v={t.facture} />
    </tr>
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <Saisie libre value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Rechercher une position" className="!w-60 pl-8" />
        </div>
        <Liste libre value={lot} onChange={(e) => setLot(e.target.value)} className="!w-56">
          <option value="">Tous les lots</option>
          {b.lots.map((l) => <option key={l.id} value={l.id}>{l.code} – {l.nom}</option>)}
        </Liste>
        {etapes.length > 1 && (
          <Liste libre value={etape} onChange={(e) => setEtape(e.target.value)} className="!w-40">
            <option value="">Toutes étapes</option>
            {etapes.map((x) => <option key={x} value={x}>Étape {x}</option>)}
          </Liste>
        )}
        <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={depassements} onChange={(e) => setDepassements(e.target.checked)} /> Dépassements seulement
        </label>
        <div className="ml-auto flex gap-2">
          <Bouton libre icone={<Download size={15} />} onClick={exporter}>Export Excel</Bouton>
          <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition({ id: nouvelId("bud"), projetId: b.d.projet!.id, cfc: "", libelle: "", montant: 0, lotId: lot || undefined })}>Position</Bouton>
        </div>
      </div>

      <Carte>
        <Tableau className="[&_td]:!px-2.5 [&_th]:!px-2.5">
          <thead>
            <tr>
              <th>Position <span className="normal-case tracking-normal text-slate-400">(CHF HT)</span></th><th>Ét.</th><th className="!text-right">Révisé</th><th className="!text-right">Engagé</th><th className="!text-right">Attendu</th>
              <th className="!text-right" title="Reste à engager">Reste à eng.</th><th className="!text-right">Ajust.</th><th className="!text-right">Atterrissage</th><th className="!text-right">Écart</th><th className="!text-right">Facturé</th>
            </tr>
          </thead>
          <tbody>
            {parLot.map((gl) => {
              const cleLot = `l:${gl.cle}`;
              const groupes = grouper(gl.positions, groupeDe);
              return (
                <Fragment key={cleLot}>
                  {ligneTotaux(cleLot, nomLot(gl.cle), gl.totaux, 0)}
                  {!fermes.has(cleLot) && groupes.map((gg) => {
                    const cleG = `${cleLot}:${gg.cle}`;
                    const seul = gg.positions.length === 1 && gg.positions[0].ligne.libelle === gg.cle;
                    return (
                      <Fragment key={cleG}>
                        {!seul && ligneTotaux(cleG, gg.cle, gg.totaux, 1)}
                        {(seul || !fermes.has(cleG)) && gg.positions.map((p) => (
                          <tr key={p.id} className="cursor-pointer" onClick={() => setDetail(p.id)}>
                            <td>
                              <span className="flex items-center gap-2" style={{ paddingLeft: seul ? 38 : 54 }}>
                                <span className={cx(p.virtuelle && "italic text-rose-600")}>{p.ligne.libelle}</span>
                                {p.ligne.reserve && <Badge couleur="bleu">Réserve</Badge>}
                                {p.ligne.cfc && <span className="num text-xs text-slate-400">{p.ligne.cfc}</span>}
                                {p.mode !== "auto" && <Badge>{MODES.find((m) => m.id === p.mode)?.libelle}</Badge>}
                              </span>
                            </td>
                            <td className="text-slate-500">{p.ligne.etape}</td>
                            <td className="num whitespace-nowrap text-right" title={p.mutations ? `Initial ${formatCHF(p.initial)}, mutations ${formatCHF(p.mutations)}` : undefined}>
                              {Math.abs(p.revise) < 0.5 ? <span className="text-slate-400">—</span> : formatMontant(p.revise)}{Math.abs(p.mutations) > 0.5 && <span className="ml-1 text-[10px] text-brand-600">M</span>}
                            </td>
                            <Montant v={p.engage} /><Montant v={p.attendu} /><Montant v={p.rae} /><Montant v={p.ajustements} signe />
                            <Montant v={p.atterrissage} gras /><Ecart v={p.ecart} /><Montant v={p.facture} />
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </Tableau>
        {!visibles.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Aucune position. Créez-en une ou importez votre classeur de suivi.</p>}
      </Carte>
      <p className="mt-2 text-xs text-slate-500">
        Atterrissage = engagé (commandes, avenants approuvés, factures hors commande) + attendu (offres, avenants demandés, appels d'offres en cours) + reste à engager + ajustements pondérés. M = budget modifié par une mutation.
      </p>

      {detail && <DetailPosition b={b} id={detail} onFermer={() => setDetail(null)} onModifier={(l) => { setDetail(null); setEdition(l); }} />}
      {edition && (
        <FormulairePosition b={b} initial={edition} onFermer={() => setEdition(null)}
          onEnregistrer={(l) => (b.toutes.some((x) => x.id === l.id && !x.virtuelle) ? modifier("budget", l.id, l) : ajouter("budget", l))} />
      )}
    </>
  );
}

function DetailPosition({ b, id, onFermer, onModifier }: { b: Budget; id: string; onFermer: () => void; onModifier: (l: BudgetLigne) => void }) {
  const { modifier, supprimer, entreprises } = useStore();
  const p = b.toutes.find((x) => x.id === id);
  const lignes = useMemo(() => {
    if (!p) return [];
    const r: { type: string; libelle: string; montant: number; detail?: string }[] = [];
    const part = (rep: { budgetId: string; montant: number }[] | undefined, total: number) => {
      const s = (rep ?? []).reduce((t, x) => t + x.montant, 0);
      const m = (rep ?? []).filter((x) => x.budgetId === id).reduce((t, x) => t + x.montant, 0);
      return s ? (total * m) / s : 0;
    };
    for (const m of b.d.mutations) for (const l of m.lignes) if (l.budgetId === id) r.push({ type: "Mutation", libelle: `${m.numero} – ${m.motif}`, montant: l.montant, detail: m.statut });
    for (const c of b.d.contrats) {
      const v = part(c.repartition, montantContrat(c));
      if (Math.abs(v) > 0.5) r.push({ type: "Commande", libelle: `${c.numero} – ${entreprises.find((e) => e.id === c.entrepriseId)?.nom ?? ""} ${c.objet}`, montant: v, detail: c.statut });
    }
    for (const o of b.d.offres) {
      const v = part(o.repartition, o.montant);
      if (Math.abs(v) > 0.5) r.push({ type: "Offre", libelle: `${o.numero} – ${o.fournisseur} ${o.description}`, montant: v, detail: STATUTS_OFFRE_ACTIFS.has(o.statut) ? o.statut : `${o.statut} (non comptée)` });
    }
    for (const a of b.d.ajustements) {
      const v = part(a.repartition, effetAjustement(a).probable);
      if (Math.abs(v) > 0.5 || (a.statut === "Active" && a.repartition.some((x) => x.budgetId === id))) r.push({ type: a.type, libelle: a.libelle, montant: v, detail: `${a.probabilite} % · ${a.statut}` });
    }
    for (const f of b.d.facturesHorsCommande) {
      const v = part(f.repartition, f.montantHT);
      if (Math.abs(v) > 0.5) r.push({ type: "Facture hors commande", libelle: `${f.numero} – ${f.fournisseur}`, montant: v, detail: formatDate(f.date) });
    }
    return r;
  }, [b.d, id, p, entreprises]);
  if (!p) return null;
  const l = p.ligne;
  const majRae = (patch: Partial<BudgetLigne>) => modifier("budget", l.id, patch);

  return (
    <Modale ouverte large onFermer={onFermer} titre={b.libelle(id)}
      pied={!p.virtuelle && <>
        <Bouton variante="fantome" icone={<Trash2 size={14} />} onClick={() => {
          if (lignes.length && !confirm(`Cette position porte ${lignes.length} imputation(s) qui passeront « hors budget ». Supprimer quand même ?`)) return;
          if (!lignes.length && !confirm("Supprimer cette position ?")) return;
          supprimer("budget", l.id); onFermer();
        }}>Supprimer</Bouton>
        <Bouton icone={<Pencil size={14} />} onClick={() => onModifier(l)}>Modifier la position</Bouton>
        <Bouton variante="primaire" onClick={onFermer}>Fermer</Bouton>
      </>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Budget initial", p.initial], ["Mutations", p.mutations], ["Budget révisé", p.revise], ["Engagé", p.engage], ["Attendu", p.attendu], ["Reste à engager", p.rae], ["Ajustements", p.ajustements], ["Atterrissage", p.atterrissage]].map(([t, v]) => (
          <div key={t as string} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"><p className="text-xs text-slate-500">{t}</p><p className="num font-semibold">{formatCHF(v as number)}</p></div>
        ))}
      </div>
      <p className={cx("mt-3 text-sm font-medium", p.ecart < -0.5 ? "text-rose-600" : "text-emerald-600")}>
        Écart {p.ecart > 0 ? "+" : ""}{formatCHF(p.ecart)} · défavorable {formatCHF(p.revise - p.atterrissageDefavorable)} · facturé {formatCHF(p.facture)}, payé {formatCHF(p.paye)}
      </p>

      {!p.virtuelle && (
        <div className="mt-5 rounded-lg ring-1 ring-slate-200 p-4 dark:ring-slate-700">
          <p className="mb-2 text-sm font-semibold">Reste à engager</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <label key={m.id} className={cx("flex cursor-pointer gap-2 rounded-lg p-2 text-sm ring-1", (l.raeMode ?? "auto") === m.id ? "ring-brand-500 bg-brand-50/40 dark:bg-indigo-950/30" : "ring-slate-200 dark:ring-slate-700")}>
                <input type="radio" checked={(l.raeMode ?? "auto") === m.id} onChange={() => majRae({ raeMode: m.id, dateRevue: aujourdhui() })} />
                <span><span className="font-medium">{m.libelle}</span><span className="block text-xs text-slate-500">{m.aide}</span></span>
              </label>
            ))}
          </div>
          {l.raeMode === "saisi" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Champ libelle="Montant restant à engager (CHF)"><Saisie type="number" value={l.raeMontant ?? ""} onChange={(e) => majRae({ raeMontant: Number(e.target.value), dateRevue: aujourdhui() })} /></Champ>
              <Champ libelle="Justification" className="sm:col-span-2"><Saisie value={l.raeCommentaire ?? ""} onChange={(e) => majRae({ raeCommentaire: e.target.value })} placeholder="Ex. reste les portes sectionnelles et la signalétique" /></Champ>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Dernière revue : {l.dateRevue ? formatDate(l.dateRevue) : "jamais"} · <button className="text-brand-600 hover:underline" onClick={() => majRae({ dateRevue: aujourdhui() })}>marquer comme revue aujourd'hui</button>
          </p>
        </div>
      )}

      <p className="mt-5 mb-2 text-sm font-semibold">Ce qui compose cette position</p>
      {lignes.length ? (
        <Tableau>
          <tbody>
            {lignes.map((x, i) => (
              <tr key={i}><td className="whitespace-nowrap text-xs text-slate-500">{x.type}</td><td>{x.libelle}{x.detail && <span className="ml-2 text-xs text-slate-400">{x.detail}</span>}</td><Montant v={x.montant} signe={x.type === "Mutation"} /></tr>
            ))}
          </tbody>
        </Tableau>
      ) : <p className="text-sm text-slate-500">Aucune commande, offre, prévision ni mutation sur cette position.</p>}
      {l.notes && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{l.notes}</p>}
    </Modale>
  );
}

function FormulairePosition({ b, initial, onFermer, onEnregistrer }: { b: Budget; initial: BudgetLigne; onFermer: () => void; onEnregistrer: (l: BudgetLigne) => void }) {
  const [l, setL] = useState(initial);
  const groupes = [...new Set(b.toutes.map((p) => p.ligne.groupe).filter(Boolean))] as string[];
  return (
    <Modale ouverte onFermer={onFermer} titre={b.toutes.some((p) => p.id === l.id) ? "Modifier la position" : "Nouvelle position"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!l.libelle} onClick={() => { onEnregistrer(l); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid grid-cols-6 gap-4">
        <Champ libelle="Lot" className="col-span-3">
          <Liste value={l.lotId ?? ""} onChange={(e) => setL({ ...l, lotId: e.target.value || undefined })}>
            <option value="">(selon le code CFC)</option>
            {b.lots.map((x) => <option key={x.id} value={x.id}>{x.code} – {x.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Position (regroupement)" className="col-span-3">
          <Saisie list="groupes-positions" value={l.groupe ?? ""} onChange={(e) => setL({ ...l, groupe: e.target.value || undefined })} placeholder="Ex. Production de chaleur" />
          <datalist id="groupes-positions">{groupes.map((g) => <option key={g} value={g} />)}</datalist>
        </Champ>
        <Champ libelle="Sous-position (libellé)" className="col-span-4"><Saisie value={l.libelle} onChange={(e) => setL({ ...l, libelle: e.target.value })} /></Champ>
        <Champ libelle="Étape" className="col-span-2"><Saisie value={l.etape ?? ""} onChange={(e) => setL({ ...l, etape: e.target.value || undefined })} placeholder="1" /></Champ>
        <Champ libelle="Code CFC" className="col-span-2">
          <Saisie list="cfc-liste" value={l.cfc} onChange={(e) => setL({ ...l, cfc: e.target.value.trim() })} placeholder="211" />
          <datalist id="cfc-liste">{CFC_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}</datalist>
        </Champ>
        <Champ libelle="Budget initial HT (CHF)" className="col-span-4" aide="Une fois le budget approuvé, faites évoluer la position par des mutations.">
          <Saisie type="number" value={l.montant || ""} onChange={(e) => setL({ ...l, montant: Number(e.target.value) })} />
        </Champ>
        <label className="col-span-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!l.reserve} onChange={(e) => setL({ ...l, reserve: e.target.checked || undefined })} /> Position de réserve (divers et imprévus)</label>
        <Champ libelle="Notes" className="col-span-6"><Zone rows={2} value={l.notes ?? ""} onChange={(e) => setL({ ...l, notes: e.target.value })} /></Champ>
      </div>
    </Modale>
  );
}
