import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightCircle, Pencil, Plus, Split, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { sommeRepartition, STATUTS_OFFRE_ACTIFS } from "../../lib/budget";
import { factureDuContrat, montantContrat } from "../../lib/finance";
import { aujourdhui, formatCHF, formatDate } from "../../lib/format";
import { nouvelId } from "../../lib/id";
import type { Contrat, OffreAttendue, Repartition } from "../../types";
import { Badge, BadgeStatut, Bouton, Carte, Champ, cx, Liste, Modale, Progression, Saisie, Tableau, Vide, Zone } from "../ui";
import { Montant } from "./communs";
import { EditeurRepartition } from "./Repartition";
import type { Budget } from "./useBudget";

export function OngletEngagements({ b }: { b: Budget }) {
  const { ajouter, modifier, supprimer, entreprises, contrats: tousContrats, factures } = useStore();
  const contrats = tousContrats.filter((c) => c.projetId === b.d.projet!.id);
  const [repartir, setRepartir] = useState<Contrat | null>(null);
  const [offre, setOffre] = useState<OffreAttendue | null>(null);
  const [convertir, setConvertir] = useState<OffreAttendue | null>(null);
  const [filtre, setFiltre] = useState<"actives" | "toutes">("actives");
  const nomEnt = (id?: string) => entreprises.find((e) => e.id === id)?.nom ?? "";
  const nonRepartis = contrats.filter((c) => c.statut !== "Annulé" && !(c.repartition?.length));
  const offres = b.d.offres.filter((o) => filtre === "toutes" || STATUTS_OFFRE_ACTIFS.has(o.statut)).sort((x, y) => y.montant - x.montant);

  return (
    <div className="space-y-6">
      <Carte titre="Offres et devis attendus" sousTitre="Alimentent l'« attendu » tant qu'ils sont en cours, reçus ou retenus"
        action={<div className="flex items-center gap-2">
          <Liste libre value={filtre} onChange={(e) => setFiltre(e.target.value as "actives" | "toutes")} className="!w-40 !py-1 text-xs"><option value="actives">Actives</option><option value="toutes">Toutes</option></Liste>
          <Bouton variante="primaire" taille="sm" icone={<Plus size={14} />} onClick={() => setOffre({ id: nouvelId("off"), projetId: b.d.projet!.id, numero: "", fournisseur: "", description: "", type: "Offre ferme", statut: "Reçue", montant: 0, repartition: [], date: aujourdhui() })}>Offre</Bouton>
        </div>}>
        {offres.length ? (
          <Tableau>
            <thead><tr><th>N°</th><th>Fournisseur · objet</th><th>Positions</th><th>Statut</th><th className="!text-right">Montant</th><th /></tr></thead>
            <tbody>
              {offres.map((o) => {
                const ecart = o.montant - sommeRepartition(o.repartition);
                return (
                  <tr key={o.id} className={cx(!STATUTS_OFFRE_ACTIFS.has(o.statut) && "opacity-60")}>
                    <td className="num text-slate-500">{o.numero}</td>
                    <td><p className="font-medium">{o.fournisseur}</p><p className="text-xs text-slate-500">{o.description}{o.date ? ` · ${formatDate(o.date)}` : ""}{o.type !== "Offre ferme" ? ` · ${o.type}` : ""}</p></td>
                    <td className="max-w-xs text-xs text-slate-600 dark:text-slate-400">
                      {o.repartition.length ? o.repartition.map((r) => <p key={r.budgetId} className="truncate" title={b.libelle(r.budgetId)}>{b.libelle(r.budgetId)}</p>) : <span className="text-rose-600">à répartir</span>}
                      {o.repartition.length > 0 && Math.abs(ecart) > 1 && <p className="text-amber-600">réparti {formatCHF(sommeRepartition(o.repartition))}</p>}
                    </td>
                    <td><BadgeStatut statut={o.statut} />{o.contratId && <p className="mt-0.5 text-xs text-slate-500">→ {contrats.find((c) => c.id === o.contratId)?.numero}</p>}</td>
                    <Montant v={o.montant} gras />
                    <td className="whitespace-nowrap text-right">
                      {STATUTS_OFFRE_ACTIFS.has(o.statut) && <Bouton taille="sm" variante="fantome" title="Convertir en commande" onClick={() => setConvertir(o)}><ArrowRightCircle size={14} /></Bouton>}
                      <Bouton taille="sm" variante="fantome" title="Modifier" onClick={() => setOffre(o)}><Pencil size={14} /></Bouton>
                      <Bouton taille="sm" variante="fantome" title="Supprimer" onClick={() => confirm("Supprimer cette offre ?") && supprimer("offres", o.id)}><Trash2 size={14} /></Bouton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        ) : <Vide titre="Aucune offre en attente" texte="Saisissez les offres reçues et non commandées pour qu'elles comptent dans l'atterrissage." />}
      </Carte>

      <Carte titre="Commandes" sousTitre={nonRepartis.length ? `${nonRepartis.length} commande(s) sans répartition : imputées par code CFC ou hors budget` : "Engagé = montant initial + avenants approuvés"}>
        <Tableau>
          <thead><tr><th>N°</th><th>Fournisseur · objet</th><th>Positions</th><th className="!text-right">Montant actualisé</th><th>Facturé</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {[...contrats].sort((x, y) => montantContrat(y) - montantContrat(x)).map((c) => {
              const f = factureDuContrat(c, factures);
              const rep = c.repartition ?? [];
              const ecart = c.montantInitial - sommeRepartition(rep);
              return (
                <tr key={c.id} className={cx(c.statut === "Annulé" && "opacity-50")}>
                  <td className="num"><Link to={`/contrats/${c.id}`} className="text-brand-600 hover:underline">{c.numero}</Link></td>
                  <td><p className="font-medium">{nomEnt(c.entrepriseId)}</p><p className="text-xs text-slate-500">{c.objet}</p></td>
                  <td className="max-w-xs text-xs text-slate-600 dark:text-slate-400">
                    {rep.length ? rep.slice(0, 3).map((r) => <p key={r.budgetId} className="truncate" title={b.libelle(r.budgetId)}>{b.libelle(r.budgetId)}</p>) : <span className="text-amber-600">{c.cfc ? `par CFC ${c.cfc}` : "non répartie"}</span>}
                    {rep.length > 3 && <p className="text-slate-400">+ {rep.length - 3} autre(s)</p>}
                    {rep.length > 0 && Math.abs(ecart) > 1 && <p className="text-amber-600">{formatCHF(ecart)} non répartis</p>}
                  </td>
                  <Montant v={montantContrat(c)} gras />
                  <td className="w-36"><div className="flex items-center gap-2"><Progression valeur={f.avancementPct} /><span className="num w-10 text-right text-xs text-slate-500">{f.avancementPct.toFixed(0)} %</span></div></td>
                  <td><BadgeStatut statut={c.statut} /></td>
                  <td className="text-right"><Bouton taille="sm" variante="fantome" title="Répartir sur les positions" onClick={() => setRepartir(c)}><Split size={14} /></Bouton></td>
                </tr>
              );
            })}
          </tbody>
        </Tableau>
        {!contrats.length && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune commande. Créez les contrats dans « Contrats & factures » ou convertissez une offre.</p>}
      </Carte>

      {repartir && (
        <ModaleRepartition b={b} titre={`Répartition de la commande ${repartir.numero}`} total={repartir.montantInitial} initial={repartir.repartition ?? []}
          aide="Montant initial de la commande ; les avenants et les factures suivent les mêmes proportions."
          onFermer={() => setRepartir(null)} onEnregistrer={(r) => modifier("contrats", repartir.id, { repartition: r })} />
      )}
      {offre && (
        <FormulaireOffre b={b} initial={offre} onFermer={() => setOffre(null)}
          onEnregistrer={(o) => (b.d.offres.some((x) => x.id === o.id) ? modifier("offres", o.id, o) : ajouter("offres", o))} />
      )}
      {convertir && (
        <ConversionCommande offre={convertir} onFermer={() => setConvertir(null)} onConvertir={(numero, date, type) => {
          const ent = convertir.entrepriseId ?? entreprises.find((e) => e.nom.toLowerCase() === convertir.fournisseur.toLowerCase())?.id;
          const id = nouvelId("ctr");
          ajouter("contrats", {
            id, projetId: convertir.projetId, numero, entrepriseId: ent ?? "", cfc: "", objet: convertir.description || convertir.fournisseur, type,
            montantInitial: convertir.montant, dateSignature: date, retenuePct: type === "Contrat d'entreprise" ? 10 : 0, statut: "Signé", avenants: [],
            repartition: convertir.repartition, lotId: b.toutes.find((p) => p.id === convertir.repartition[0]?.budgetId)?.lotId,
            remarques: `Issue de l'offre ${convertir.numero}`,
          });
          modifier("offres", convertir.id, { statut: "Commandée", contratId: id });
          setConvertir(null);
        }} />
      )}
    </div>
  );
}

export function ModaleRepartition({ b, titre, total, initial, aide, onFermer, onEnregistrer }: {
  b: Budget; titre: string; total: number; initial: Repartition[]; aide?: string; onFermer: () => void; onEnregistrer: (r: Repartition[]) => void;
}) {
  const [r, setR] = useState<Repartition[]>(initial.length ? initial : [{ budgetId: "", montant: 0 }]);
  const choisies = r.filter((x) => x.budgetId);
  // Une seule position sans montant : elle reçoit le montant entier
  const propres = choisies.length === 1 && !choisies[0].montant ? [{ ...choisies[0], montant: total }] : choisies.filter((x) => x.montant);
  return (
    <Modale ouverte large onFermer={onFermer} titre={titre}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" onClick={() => { onEnregistrer(propres); onFermer(); }}>Enregistrer</Bouton></>}>
      {aide && <p className="mb-3 text-sm text-slate-500">{aide}</p>}
      <EditeurRepartition valeur={r} onChange={setR} positions={b.toutes} lots={b.lots} total={total} />
    </Modale>
  );
}

function FormulaireOffre({ b, initial, onFermer, onEnregistrer }: { b: Budget; initial: OffreAttendue; onFermer: () => void; onEnregistrer: (o: OffreAttendue) => void }) {
  const { entreprises } = useStore();
  const [o, setO] = useState(initial);
  return (
    <Modale ouverte large onFermer={onFermer} titre={o.numero ? `Offre ${o.numero}` : "Nouvelle offre"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!o.fournisseur || !o.montant} onClick={() => { onEnregistrer({ ...o, repartition: o.repartition.filter((r) => r.budgetId && r.montant) }); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid gap-4 sm:grid-cols-6">
        <Champ libelle="Référence" className="sm:col-span-2"><Saisie value={o.numero} onChange={(e) => setO({ ...o, numero: e.target.value })} /></Champ>
        <Champ libelle="Fournisseur" className="sm:col-span-4">
          <Saisie list="entreprises-offre" value={o.fournisseur} onChange={(e) => setO({ ...o, fournisseur: e.target.value, entrepriseId: entreprises.find((x) => x.nom === e.target.value)?.id })} />
          <datalist id="entreprises-offre">{entreprises.map((x) => <option key={x.id} value={x.nom} />)}</datalist>
        </Champ>
        <Champ libelle="Objet" className="sm:col-span-6"><Saisie value={o.description} onChange={(e) => setO({ ...o, description: e.target.value })} /></Champ>
        <Champ libelle="Type" className="sm:col-span-2">
          <Liste value={o.type} onChange={(e) => setO({ ...o, type: e.target.value as OffreAttendue["type"] })}><option>Offre ferme</option><option>Offre indicative</option><option>Estimation entreprise</option></Liste>
        </Champ>
        <Champ libelle="Statut" className="sm:col-span-2">
          <Liste value={o.statut} onChange={(e) => setO({ ...o, statut: e.target.value as OffreAttendue["statut"] })}>{["En cours", "Reçue", "Retenue", "Commandée", "Refusée", "Expirée"].map((s) => <option key={s}>{s}</option>)}</Liste>
        </Champ>
        <Champ libelle="Date" className="sm:col-span-2"><Saisie type="date" value={o.date ?? ""} onChange={(e) => setO({ ...o, date: e.target.value || undefined })} /></Champ>
        <Champ libelle="Montant HT (CHF)" className="sm:col-span-2"><Saisie type="number" value={o.montant || ""} onChange={(e) => setO({ ...o, montant: Number(e.target.value) })} /></Champ>
      </div>
      <p className="mt-5 mb-2 text-sm font-semibold">Positions concernées</p>
      <EditeurRepartition valeur={o.repartition} onChange={(r) => setO({ ...o, repartition: r })} positions={b.toutes} lots={b.lots} total={o.montant || undefined} />
      <Champ libelle="Remarques" className="mt-4"><Zone rows={2} value={o.remarques ?? ""} onChange={(e) => setO({ ...o, remarques: e.target.value || undefined })} /></Champ>
    </Modale>
  );
}

function ConversionCommande({ offre, onFermer, onConvertir }: { offre: OffreAttendue; onFermer: () => void; onConvertir: (numero: string, date: string, type: Contrat["type"]) => void }) {
  const [numero, setNumero] = useState("");
  const [date, setDate] = useState(aujourdhui());
  const [type, setType] = useState<Contrat["type"]>("Contrat d'entreprise");
  return (
    <Modale ouverte onFermer={onFermer} titre="Convertir l'offre en commande"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!numero} onClick={() => onConvertir(numero, date, type)}>Créer la commande</Bouton></>}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {offre.fournisseur} – {offre.description} : <strong>{formatCHF(offre.montant)}</strong>, réparti sur {offre.repartition.length} position(s).
        L'offre passe à « Commandée » et sort de l'attendu ; le montant devient engagé.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ libelle="N° de commande (ERP)" className="sm:col-span-2"><Saisie value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="CFCL0000…" autoFocus /></Champ>
        <Champ libelle="Date"><Saisie type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Champ>
        <Champ libelle="Type"><Liste value={type} onChange={(e) => setType(e.target.value as Contrat["type"])}><option>Contrat d'entreprise</option><option>Mandat</option><option>Fourniture</option></Liste></Champ>
      </div>
      {!offre.repartition.length && <p className="mt-3"><Badge couleur="orange">Offre non répartie : la commande devra être répartie</Badge></p>}
    </Modale>
  );
}
