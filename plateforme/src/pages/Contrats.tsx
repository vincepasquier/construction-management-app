import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Plus } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { avenantsEnAttente, factureDuContrat, montantContrat } from "../lib/finance";
import { aujourdhui, formatCHF, formatCompact, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import { CFC_OPTIONS, libelleCFC } from "../data/cfc";
import { Badge, BadgeStatut, Bouton, Carte, Champ, EnTetePage, Indicateur, Liste, Modale, Onglets, Progression, Saisie, Tableau, Vide } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { Contrat, StatutContrat, TypeContrat } from "../types";

export const STATUTS_CONTRAT: StatutContrat[] = ["En préparation", "Signé", "En cours", "Réceptionné", "Clôturé"];
export const TYPES_CONTRAT: TypeContrat[] = ["Contrat d'entreprise", "Mandat", "Fourniture"];

export function Contrats() {
  const d = useProjetActif();
  const { entreprises, ajouter } = useStore();
  const navigate = useNavigate();
  const [vue, setVue] = useState<"contrats" | "factures">("contrats");
  const [creation, setCreation] = useState(false);
  if (!d.projet) return <SansProjet />;
  const nomEnt = (id: string) => entreprises.find((e) => e.id === id)?.nom ?? "?";
  const jour = aujourdhui();

  const totalInitial = d.contrats.reduce((s, c) => s + c.montantInitial, 0);
  const totalActualise = d.contrats.reduce((s, c) => s + montantContrat(c), 0);
  const totalAttente = d.contrats.reduce((s, c) => s + avenantsEnAttente(c), 0);
  const totalRetenue = d.contrats.reduce((s, c) => s + factureDuContrat(c, d.factures).retenue, 0);

  return (
    <>
      <EnTetePage titre="Contrats & factures" description="Contrats d'entreprise (SIA 118), mandats, avenants, situations et retenues de garantie"
        actions={<Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setCreation(true)}>Nouveau contrat</Bouton>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Montant initial" valeur={formatCompact(totalInitial)} detail={`${d.contrats.length} contrat(s)`} />
        <Indicateur libelle="Montant actualisé" valeur={formatCompact(totalActualise)} detail={`+${formatCHF(totalActualise - totalInitial)} d'avenants`} />
        <Indicateur libelle="Avenants en attente" valeur={formatCompact(totalAttente)} tendance={totalAttente ? "alerte" : undefined} />
        <Indicateur libelle="Retenues de garantie" valeur={formatCompact(totalRetenue)} detail="sur situations validées" />
      </div>

      <div className="mt-6 mb-4">
        <Onglets valeur={vue} onChange={setVue} options={[{ id: "contrats", libelle: "Contrats", compte: d.contrats.length }, { id: "factures", libelle: "Toutes les factures", compte: d.factures.length }]} />
      </div>

      {vue === "contrats" ? (
        <Carte>
          {d.contrats.length === 0 ? <Vide icone={<FileSignature size={22} />} titre="Aucun contrat" texte="Créez un contrat ou adjugez un appel d'offres." /> : (
            <Tableau>
              <thead><tr><th>N°</th><th>Entreprise / objet</th><th>CFC</th><th className="!text-right">Actualisé</th><th className="!text-right">Facturé</th><th className="w-40">Avancement</th><th>Statut</th></tr></thead>
              <tbody>
                {d.contrats.map((c) => {
                  const f = factureDuContrat(c, d.factures);
                  const attente = avenantsEnAttente(c);
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/contrats/${c.id}`)}>
                      <td className="font-medium text-brand-700 dark:text-indigo-300">{c.numero}</td>
                      <td><p className="font-medium">{nomEnt(c.entrepriseId)}</p><p className="text-xs text-slate-500">{c.objet} · {c.type}</p></td>
                      <td className="text-slate-500"><span className="num">{c.cfc}</span> {libelleCFC(c.cfc)}</td>
                      <td className="num text-right">{formatCHF(montantContrat(c))}{attente > 0 && <div><Badge couleur="orange">+{formatCompact(attente)} en attente</Badge></div>}</td>
                      <td className="num text-right">{formatCHF(f.facture)}</td>
                      <td><div className="flex items-center gap-2"><Progression valeur={f.avancementPct} /><span className="num w-9 text-right text-xs text-slate-500">{f.avancementPct.toFixed(0)}%</span></div></td>
                      <td><BadgeStatut statut={c.statut} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          )}
        </Carte>
      ) : (
        <Carte>
          <Tableau>
            <thead><tr><th>Date</th><th>Contrat</th><th>N°</th><th>Type</th><th>Échéance</th><th className="!text-right">Montant HT</th><th>Statut</th></tr></thead>
            <tbody>
              {[...d.factures].sort((a, b) => b.date.localeCompare(a.date)).map((f) => {
                const c = d.contrats.find((x) => x.id === f.contratId);
                const echue = f.echeance < jour && f.statut !== "Payée";
                return (
                  <tr key={f.id} className="cursor-pointer" onClick={() => c && navigate(`/contrats/${c.id}`)}>
                    <td className="num">{formatDate(f.date)}</td>
                    <td><p className="font-medium">{c ? nomEnt(c.entrepriseId) : "?"}</p><p className="text-xs text-slate-500">{c?.numero}</p></td>
                    <td>{f.numero}</td><td>{f.type}</td>
                    <td className={echue ? "font-medium text-rose-600" : ""}>{formatDate(f.echeance)}</td>
                    <td className="num text-right">{formatCHF(f.montantHT)}</td>
                    <td><BadgeStatut statut={f.statut} /></td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        </Carte>
      )}

      {creation && <FormulaireContrat projetId={d.projet.id} numeroSuggere={`C-${d.projet.code}-${String(d.contrats.length + 1).padStart(2, "0")}`}
        onFermer={() => setCreation(false)} onEnregistrer={(c) => { ajouter("contrats", c); navigate(`/contrats/${c.id}`); }} />}
    </>
  );
}

export function FormulaireContrat({ projetId, numeroSuggere, initial, onFermer, onEnregistrer }: {
  projetId: string; numeroSuggere?: string; initial?: Contrat; onFermer: () => void; onEnregistrer: (c: Contrat) => void;
}) {
  const { entreprises, lots } = useStore();
  const [c, setC] = useState<Contrat>(() => initial ?? {
    id: nouvelId("ctr"), projetId, numero: numeroSuggere ?? "", entrepriseId: "", cfc: "", objet: "", type: "Contrat d'entreprise",
    montantInitial: 0, dateSignature: aujourdhui(), retenuePct: 10, statut: "En préparation", avenants: [],
  });
  const maj = (p: Partial<Contrat>) => setC((x) => ({ ...x, ...p }));
  return (
    <Modale ouverte onFermer={onFermer} titre={initial ? "Modifier le contrat" : "Nouveau contrat"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!c.numero || !c.entrepriseId || !c.cfc} onClick={() => { onEnregistrer(c); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid grid-cols-2 gap-4">
        <Champ libelle="Numéro"><Saisie value={c.numero} onChange={(e) => maj({ numero: e.target.value })} /></Champ>
        <Champ libelle="Type"><Liste value={c.type} onChange={(e) => maj({ type: e.target.value as TypeContrat, retenuePct: e.target.value === "Mandat" ? 0 : c.retenuePct })}>{TYPES_CONTRAT.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
        <Champ libelle="Entreprise / mandataire" className="col-span-2">
          <Liste value={c.entrepriseId} onChange={(e) => maj({ entrepriseId: e.target.value })}>
            <option value="">Choisir…</option>{entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom} – {e.localite}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Objet" className="col-span-2"><Saisie value={c.objet} onChange={(e) => maj({ objet: e.target.value })} /></Champ>
        <Champ libelle="Code CFC">
          <Saisie list="cfc-ctr" value={c.cfc} onChange={(e) => maj({ cfc: e.target.value.trim() })} />
          <datalist id="cfc-ctr">{CFC_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}</datalist>
        </Champ>
        <Champ libelle="Lot">
          <Liste value={c.lotId ?? ""} onChange={(e) => maj({ lotId: e.target.value || undefined })}>
            <option value="">—</option>{lots.filter((l) => l.projetId === projetId).map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Montant initial HT (CHF)"><Saisie type="number" value={c.montantInitial || ""} onChange={(e) => maj({ montantInitial: Number(e.target.value) })} /></Champ>
        <Champ libelle="Retenue de garantie (%)" aide="Usuel selon SIA 118 : 10 % sur les acomptes"><Saisie type="number" value={c.retenuePct} onChange={(e) => maj({ retenuePct: Number(e.target.value) })} /></Champ>
        <Champ libelle="Date de signature"><Saisie type="date" value={c.dateSignature} onChange={(e) => maj({ dateSignature: e.target.value })} /></Champ>
        <Champ libelle="Statut"><Liste value={c.statut} onChange={(e) => maj({ statut: e.target.value as StatutContrat })}>{STATUTS_CONTRAT.map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
      </div>
    </Modale>
  );
}
