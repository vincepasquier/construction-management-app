import { useEffect, useState } from "react";
import { BoutonIA } from "../components/BoutonIA";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, FileCheck2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { avenantsEnAttente, factureDuContrat, montantContrat } from "../lib/finance";
import { ajouterJours, aujourdhui, formatCHF, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import { libelleCFC } from "../data/cfc";
import { useLectureSeule, BadgeStatut, Bouton, Carte, Champ, EnTetePage, Indicateur, Liste, Modale, Progression, Saisie, Tableau, Vide } from "../components/ui";
import { FormulaireContrat } from "./Contrats";
import { ParcoursMarche } from "../components/ParcoursMarche";
import { RepartitionContrat } from "../components/finances/RepartitionContrat";
import { etapeCourante } from "../lib/validations";
import type { Avenant, Facture, StatutFacture, TypeFacture } from "../types";

const STATUTS_FACTURE: StatutFacture[] = ["Reçue", "Contrôlée", "Approuvée", "Payée", "Contestée"];
const TYPES_FACTURE: TypeFacture[] = ["Acompte", "Situation", "Régie", "Décompte final"];

export function ContratDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contrats, factures, entreprises, projets, appelsOffres, modifier, supprimer, ajouter } = useStore();
  const [edition, setEdition] = useState(false);
  const [avenant, setAvenant] = useState<Avenant | null>(null);
  const [facture, setFacture] = useState<Facture | null>(null);
  const [params, setParams] = useSearchParams();
  const lecture = useLectureSeule();
  const { validations, personnes } = useStore();
  const c = contrats.find((x) => x.id === id);

  const nouvelleFacture = (): Facture | null => c ? {
    id: nouvelId("fac"), projetId: c.projetId, contratId: c.id, numero: `S${factures.filter((f) => f.contratId === c.id).length + 1}`, type: "Situation",
    date: aujourdhui(), echeance: ajouterJours(aujourdhui(), 30), montantHT: 0, statut: "Reçue",
  } : null;

  // Arrivée depuis le parcours du marché : ouvrir directement la saisie d'une facture
  useEffect(() => {
    if (params.get("action") === "facture" && c) { setFacture(nouvelleFacture()); setParams({}, { replace: true }); }
  }, [params]);
  if (!c) return <Carte><Vide titre="Contrat introuvable" action={<Link to="/contrats"><Bouton libre>Retour</Bouton></Link>} /></Carte>;

  const ent = entreprises.find((e) => e.id === c.entrepriseId);
  const projet = projets.find((p) => p.id === c.projetId);
  const ao = appelsOffres.find((a) => a.id === c.appelOffresId);
  const fs = factures.filter((f) => f.contratId === c.id).sort((a, b) => a.date.localeCompare(b.date));
  const bilan = factureDuContrat(c, factures);
  const actualise = montantContrat(c);
  const attente = avenantsEnAttente(c);
  const tva = projet?.tauxTVA ?? 8.1;

  const majAvenant = (a: Avenant) =>
    modifier("contrats", c.id, { avenants: c.avenants.some((x) => x.id === a.id) ? c.avenants.map((x) => (x.id === a.id ? a : x)) : [...c.avenants, a] });

  let cumul = 0;

  /** Circuit de validation lié à une facture ou un avenant, et son état */
  const circuitDe = (objetId: string) => validations.filter((v) => v.objet.id === objetId && v.statut !== "Annulé").at(-1);
  const etatCircuit = (objetId: string) => {
    const v = circuitDe(objetId);
    if (!v) return null;
    const ec = etapeCourante(v);
    return (
      <Link to="/validations" className="mt-1 inline-flex items-center gap-1 text-[11px] text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
        <FileCheck2 size={11} />{v.statut === "En cours" ? `chez ${personnes.find((p) => p.id === ec?.personneId)?.nom ?? "?"}` : v.statut}
      </Link>
    );
  };
  const faireValider = (type: "Facture" | "Avenant", objetId: string) => navigate(`/validations?type=${type}&id=${objetId}&contratId=${c.id}`);

  return (
    <>
      <Link to="/contrats" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={14} /> Contrats</Link>
      <EnTetePage
        titre={`${c.numero} · ${ent?.nom ?? "?"}`}
        description={<span className="flex flex-wrap items-center gap-2"><BadgeStatut statut={c.statut} /> {c.objet} · {c.type} · CFC {c.cfc} {libelleCFC(c.cfc)} · signé le {formatDate(c.dateSignature)}
          {ao && <Link to={`/appels-offres/${ao.id}`} className="text-brand-600 hover:underline">· issu de {ao.numero}</Link>}</span>}
        actions={<>
          <Bouton icone={<Pencil size={15} />} onClick={() => setEdition(true)}>Modifier</Bouton>
          <BoutonIA question={`Fais le point sur le contrat ${c.numero} (${ent?.nom}) : situation financière, avenants, factures en cours, retenue de garantie, et signale tout point à contrôler (dépassement, facture échue, avenant sans décision).`}>Analyse IA</BoutonIA>
          <Bouton variante="danger" icone={<Trash2 size={15} />} onClick={() => { if (confirm("Supprimer ce contrat et ses factures ?")) { fs.forEach((f) => supprimer("factures", f.id)); supprimer("contrats", c.id); navigate("/contrats"); } }}>Supprimer</Bouton>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Montant initial" valeur={formatCHF(c.montantInitial)} />
        <Indicateur libelle="Actualisé" valeur={formatCHF(actualise)} detail={attente ? `+ ${formatCHF(attente)} en attente` : "avenants approuvés inclus"} tendance={attente ? "alerte" : undefined} />
        <Indicateur libelle="Facturé (validé)" valeur={formatCHF(bilan.facture)} detail={`${bilan.avancementPct.toFixed(0)} % du contrat`} tendance={bilan.avancementPct > 100 ? "mauvais" : undefined} />
        <Indicateur libelle="Retenue de garantie" valeur={formatCHF(bilan.retenue)} detail={`${c.retenuePct} % sur acomptes`} />
        <Indicateur libelle="Solde à facturer" valeur={formatCHF(bilan.solde)} tendance={bilan.solde < 0 ? "mauvais" : undefined} />
      </div>
      <Progression className="mt-4 !h-2" valeur={bilan.avancementPct} couleur={projet?.couleur} />
      <div className="mt-6" />
      <ParcoursMarche ao={ao} contrat={c} factures={factures}
        onEtape={(e) => { if (ao && ["descriptif", "consultation", "offres", "adjudication"].includes(e)) navigate(`/appels-offres/${ao.id}?onglet=${e === "descriptif" ? "descriptif" : e === "adjudication" ? "evaluation" : "soumissions"}`); }}
        actions={{
          contrat: { libelle: "Marquer comme signé", aide: "Une fois le contrat signé par les deux parties, marquez-le comme signé pour démarrer le suivi de facturation.", faire: () => modifier("contrats", c.id, { statut: "Signé", dateSignature: aujourdhui() }) },
          facturation: { libelle: "Saisir une facture", aide: "Enregistrez les situations au fil des travaux, puis faites-les valider ; le décompte final clôture le marché.", faire: () => setFacture(nouvelleFacture()) },
        }} />

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Carte className="xl:col-span-2" titre="Avenants" sousTitre={`${c.avenants.length} avenant(s)`}
          action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => setAvenant({ id: nouvelId("av"), numero: `AV-${String(c.avenants.length + 1).padStart(2, "0")}`, date: aujourdhui(), objet: "", montant: 0, statut: "Demandé" })}>Avenant</Bouton>}>
          {c.avenants.length === 0 ? <Vide titre="Aucun avenant" /> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {c.avenants.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.numero} · {a.objet}</p>
                    <p className="text-xs text-slate-500">{formatDate(a.date)}</p>
                    {etatCircuit(a.id)}
                  </div>
                  <span className={`num text-sm font-medium ${a.montant < 0 ? "text-emerald-600" : ""}`}>{a.montant > 0 ? "+" : ""}{formatCHF(a.montant)}</span>
                  {a.statut === "Demandé" ? (
                    <div className="flex gap-1">
                      <button disabled={lecture} title="Approuver" onClick={() => majAvenant({ ...a, statut: "Approuvé" })} className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"><Check size={16} /></button>
                      <button disabled={lecture} title="Refuser" onClick={() => majAvenant({ ...a, statut: "Refusé" })} className="rounded-md p-1 text-rose-600 hover:bg-rose-50"><X size={16} /></button>
                    </div>
                  ) : <BadgeStatut statut={a.statut} />}
                  {a.statut === "Demandé" && !circuitDe(a.id) && <button title="Faire valider" onClick={() => faireValider("Avenant", a.id)} className="text-slate-300 hover:text-brand-600"><FileCheck2 size={14} /></button>}
                  <button onClick={() => setAvenant(a)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte className="xl:col-span-3" titre="Factures et situations" sousTitre={`TVA ${tva} % · retenue calculée sur les acomptes validés`}
          action={<Bouton taille="sm" variante="primaire" icone={<Plus size={14} />} onClick={() => setFacture(nouvelleFacture())}>Facture</Bouton>}>
          {fs.length === 0 ? <Vide titre="Aucune facture" /> : (
            <Tableau>
              <thead><tr><th>N°</th><th>Date</th><th className="!text-right">HT</th><th className="!text-right">TTC</th><th className="!text-right">Cumul</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {fs.map((f) => {
                  if (f.statut !== "Contestée") cumul += f.montantHT;
                  return (
                    <tr key={f.id}>
                      <td><p className="font-medium">{f.numero}</p><p className="text-xs text-slate-500">{f.type}</p>{etatCircuit(f.id)}</td>
                      <td><p>{formatDate(f.date)}</p><p className={`text-xs ${f.echeance < aujourdhui() && f.statut !== "Payée" ? "text-rose-600" : "text-slate-500"}`}>éch. {formatDate(f.echeance)}</p></td>
                      <td className="num text-right">{formatCHF(f.montantHT)}</td>
                      <td className="num text-right text-slate-500">{formatCHF(f.montantHT * (1 + tva / 100))}</td>
                      <td className={`num text-right ${cumul > actualise ? "text-rose-600" : "text-slate-500"}`}>{formatCHF(cumul)}</td>
                      <td>
                        <Liste value={f.statut} onChange={(e) => modifier("factures", f.id, { statut: e.target.value as StatutFacture })} className="!w-32 !py-1 text-xs">
                          {STATUTS_FACTURE.map((s) => <option key={s}>{s}</option>)}
                        </Liste>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {(f.statut === "Reçue" || f.statut === "Contrôlée") && !circuitDe(f.id) && <button title="Faire valider" onClick={() => faireValider("Facture", f.id)} className="mr-1 text-slate-300 hover:text-brand-600"><FileCheck2 size={14} /></button>}
                        <button onClick={() => setFacture(f)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          )}
        </Carte>
      </div>

      <RepartitionContrat c={c} />

      {edition && <FormulaireContrat projetId={c.projetId} initial={c} onFermer={() => setEdition(false)} onEnregistrer={(x) => modifier("contrats", c.id, x)} />}

      {avenant && (
        <Modale ouverte onFermer={() => setAvenant(null)} titre="Avenant"
          pied={<>
            {c.avenants.some((x) => x.id === avenant.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { modifier("contrats", c.id, { avenants: c.avenants.filter((x) => x.id !== avenant.id) }); setAvenant(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setAvenant(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!avenant.objet} onClick={() => { majAvenant(avenant); setAvenant(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Numéro"><Saisie value={avenant.numero} onChange={(e) => setAvenant({ ...avenant, numero: e.target.value })} /></Champ>
            <Champ libelle="Date"><Saisie type="date" value={avenant.date} onChange={(e) => setAvenant({ ...avenant, date: e.target.value })} /></Champ>
            <Champ libelle="Objet" className="col-span-2"><Saisie value={avenant.objet} onChange={(e) => setAvenant({ ...avenant, objet: e.target.value })} /></Champ>
            <Champ libelle="Montant HT (négatif = moins-value)"><Saisie type="number" value={avenant.montant || ""} onChange={(e) => setAvenant({ ...avenant, montant: Number(e.target.value) })} /></Champ>
            <Champ libelle="Statut"><Liste value={avenant.statut} onChange={(e) => setAvenant({ ...avenant, statut: e.target.value as Avenant["statut"] })}><option>Demandé</option><option>Approuvé</option><option>Refusé</option></Liste></Champ>
          </div>
        </Modale>
      )}

      {facture && (
        <Modale ouverte onFermer={() => setFacture(null)} titre="Facture"
          pied={<>
            {fs.some((x) => x.id === facture.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("factures", facture.id); setFacture(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setFacture(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!facture.numero || !facture.montantHT} onClick={() => {
              if (fs.some((x) => x.id === facture.id)) modifier("factures", facture.id, facture); else ajouter("factures", facture);
              setFacture(null);
            }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Numéro"><Saisie value={facture.numero} onChange={(e) => setFacture({ ...facture, numero: e.target.value })} /></Champ>
            <Champ libelle="Type"><Liste value={facture.type} onChange={(e) => setFacture({ ...facture, type: e.target.value as TypeFacture })}>{TYPES_FACTURE.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Date"><Saisie type="date" value={facture.date} onChange={(e) => setFacture({ ...facture, date: e.target.value })} /></Champ>
            <Champ libelle="Échéance"><Saisie type="date" value={facture.echeance} onChange={(e) => setFacture({ ...facture, echeance: e.target.value })} /></Champ>
            <Champ libelle="Montant HT (CHF)" aide={facture.montantHT ? `TTC : ${formatCHF(facture.montantHT * (1 + tva / 100))} · retenue : ${formatCHF(facture.type === "Décompte final" ? 0 : (facture.montantHT * c.retenuePct) / 100)}` : undefined}>
              <Saisie type="number" value={facture.montantHT || ""} onChange={(e) => setFacture({ ...facture, montantHT: Number(e.target.value) })} />
            </Champ>
            <Champ libelle="Statut"><Liste value={facture.statut} onChange={(e) => setFacture({ ...facture, statut: e.target.value as StatutFacture })}>{STATUTS_FACTURE.map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
          </div>
          {bilan.facture + facture.montantHT > actualise + attente && !fs.some((x) => x.id === facture.id) && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              ⚠ Cette facture porte le cumul facturé au-delà du montant du contrat (avenants en attente compris).
            </p>
          )}
        </Modale>
      )}
    </>
  );
}
