import { useState } from "react";
import { CheckCheck, Pencil, Plus, Telescope, Trash2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { effetAjustement, sommeRepartition } from "../../lib/budget";
import { aujourdhui, formatCHF, formatDate } from "../../lib/format";
import { nouvelId } from "../../lib/id";
import type { Ajustement, TypeAjustement } from "../../types";
import { Badge, Bouton, Carte, Champ, cx, Liste, Modale, Saisie, Tableau, Vide, Zone } from "../ui";
import { joursDepuis, Montant } from "./communs";
import { EditeurRepartition } from "./Repartition";
import type { Budget } from "./useBudget";

const TYPES: { id: TypeAjustement; aide: string }[] = [
  { id: "Estimation interne", aide: "Montant estimé sans offre (ex. portes et fenêtres)" },
  { id: "Plus-value attendue", aide: "Supplément probable d'un marché (terrain rocheux, révision des prix…)" },
  { id: "Risque", aide: "Coût possible, pondéré par sa probabilité" },
  { id: "Opportunité", aide: "Économie possible : réduit l'atterrissage" },
  { id: "Correction de commande", aide: "Complément attendu sur une commande existante" },
];
const COULEUR_TYPE: Record<TypeAjustement, "gris" | "orange" | "rouge" | "vert" | "bleu"> = {
  "Estimation interne": "gris", "Plus-value attendue": "orange", Risque: "rouge", Opportunité: "vert", "Correction de commande": "bleu",
};

export function OngletPrevisions({ b }: { b: Budget }) {
  const { ajouter, modifier, supprimer, utilisateurId, personnes, contrats } = useStore();
  const [edition, setEdition] = useState<Ajustement | null>(null);
  const [tous, setTous] = useState(false);
  const liste = b.d.ajustements.filter((a) => tous || a.statut === "Active").sort((x, y) => effetAjustement(y).probable - effetAjustement(x).probable);
  const actifs = b.d.ajustements.filter((a) => a.statut === "Active");
  const somme = (f: (a: Ajustement) => number) => actifs.reduce((s, a) => s + f(a), 0);
  const raePositions = b.positions.filter((p) => !p.virtuelle && (p.rae > 0.5 || p.mode !== "auto")).sort((x, y) => y.rae - x.rae);
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "—";
  const nouveau = (): Ajustement => ({ id: nouvelId("aj"), projetId: b.d.projet!.id, type: "Estimation interne", libelle: "", montant: 0, probabilite: 100, statut: "Active", repartition: [], auteurId: utilisateurId ?? undefined, date: aujourdhui(), dateRevue: aujourdhui() });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Carte className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ajustements probables</p><p className="mt-2 num text-xl font-semibold">{formatCHF(somme((a) => effetAjustement(a).probable))}</p><p className="text-xs text-slate-500">{actifs.length} ligne(s) active(s), pondérées</p></Carte>
        <Carte className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scénario défavorable</p><p className="mt-2 num text-xl font-semibold">{formatCHF(somme((a) => effetAjustement(a).defavorable))}</p><p className="text-xs text-slate-500">risques à 100 %, sans opportunités</p></Carte>
        <Carte className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reste à engager</p><p className="mt-2 num text-xl font-semibold">{formatCHF(b.totaux.rae)}</p><p className="text-xs text-slate-500">{raePositions.length} position(s)</p></Carte>
        <Carte className="p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">À revoir</p><p className={cx("mt-2 num text-xl font-semibold", actifs.some((a) => joursDepuis(a.dateRevue ?? a.date) > 60) && "text-amber-600")}>{actifs.filter((a) => joursDepuis(a.dateRevue ?? a.date) > 60).length}</p><p className="text-xs text-slate-500">non revues depuis 60 jours</p></Carte>
      </div>

      <Carte titre="Estimations prévisionnelles et ajustements" sousTitre="Ce qui n'est ni commandé ni offert mais doit figurer dans l'atterrissage"
        action={<div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" checked={tous} onChange={(e) => setTous(e.target.checked)} /> Afficher converties et abandonnées</label>
          <Bouton variante="primaire" taille="sm" icone={<Plus size={14} />} onClick={() => setEdition(nouveau())}>Ajustement</Bouton>
        </div>}>
        {liste.length ? (
          <Tableau>
            <thead><tr><th>Type</th><th>Libellé</th><th>Positions</th><th className="!text-right">Montant</th><th className="!text-right">Prob.</th><th className="!text-right">Effet</th><th>Auteur · revue</th><th /></tr></thead>
            <tbody>
              {liste.map((a) => {
                const e = effetAjustement(a);
                const ancien = a.statut === "Active" && joursDepuis(a.dateRevue ?? a.date) > 60;
                return (
                  <tr key={a.id} className={cx(a.statut !== "Active" && "opacity-60")}>
                    <td><Badge couleur={COULEUR_TYPE[a.type]}>{a.type}</Badge></td>
                    <td className="max-w-xs"><p className="font-medium">{a.libelle}</p>{a.justification && <p className="truncate text-xs text-slate-500" title={a.justification}>{a.justification}</p>}{a.statut !== "Active" && <p className="text-xs text-slate-500">{a.statut}</p>}</td>
                    <td className="max-w-xs text-xs text-slate-600 dark:text-slate-400">{a.repartition.length ? a.repartition.map((r) => <p key={r.budgetId} className="truncate" title={b.libelle(r.budgetId)}>{b.libelle(r.budgetId)}</p>) : <span className="text-rose-600">à répartir</span>}</td>
                    <Montant v={a.type === "Opportunité" ? -a.montant : a.montant} />
                    <td className="num text-right">{a.probabilite} %</td>
                    <Montant v={e.probable} gras signe />
                    <td className="whitespace-nowrap text-xs"><p>{nom(a.auteurId)}</p><p className={ancien ? "text-amber-600" : "text-slate-500"}>{formatDate(a.dateRevue ?? a.date)}</p></td>
                    <td className="whitespace-nowrap text-right">
                      {a.statut === "Active" && <Bouton taille="sm" variante="fantome" title="Revu aujourd'hui, inchangé" onClick={() => modifier("ajustements", a.id, { dateRevue: aujourdhui() })}><CheckCheck size={14} /></Bouton>}
                      <Bouton taille="sm" variante="fantome" title="Modifier" onClick={() => setEdition(a)}><Pencil size={14} /></Bouton>
                      <Bouton taille="sm" variante="fantome" title="Supprimer" onClick={() => confirm(`Supprimer « ${a.libelle} » ?`) && supprimer("ajustements", a.id)}><Trash2 size={14} /></Bouton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        ) : <Vide icone={<Telescope size={22} />} titre="Aucun ajustement actif" texte="Ajoutez une estimation interne, une plus-value attendue, un risque chiffré ou une opportunité pour ajuster l'atterrissage." />}
      </Carte>

      <Carte titre="Reste à engager par position" sousTitre="Positions dont une partie du budget reste à commander ; cliquez une position dans « Suivi par position » pour changer la règle">
        {raePositions.length ? (
          <Tableau>
            <thead><tr><th>Position</th><th>Règle</th><th className="!text-right">Révisé</th><th className="!text-right">Engagé + attendu</th><th className="!text-right">Reste à engager</th><th>Justification</th><th>Revue</th></tr></thead>
            <tbody>
              {raePositions.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-sm"><p className="truncate font-medium" title={b.libelle(p.id)}>{b.libelle(p.id)}</p></td>
                  <td className="whitespace-nowrap text-xs">{{ auto: "Automatique", budget: "Budget restant", solde: "Soldée", saisi: "Montant estimé" }[p.mode]}</td>
                  <Montant v={p.revise} attenue /><Montant v={p.engage + p.attendu} /><Montant v={p.rae} gras />
                  <td className="max-w-xs truncate text-xs text-slate-500">{p.ligne.raeCommentaire}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{formatDate(p.ligne.dateRevue)}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">Toutes les positions sont engagées ou soldées.</p>}
      </Carte>

      {edition && (
        <FormulaireAjustement b={b} initial={edition} contrats={contrats.filter((c) => c.projetId === b.d.projet!.id)} onFermer={() => setEdition(null)}
          onEnregistrer={(a) => (b.d.ajustements.some((x) => x.id === a.id) ? modifier("ajustements", a.id, a) : ajouter("ajustements", a))} />
      )}
    </div>
  );
}

function FormulaireAjustement({ b, initial, contrats, onFermer, onEnregistrer }: {
  b: Budget; initial: Ajustement; contrats: { id: string; numero: string; objet: string; repartition?: { budgetId: string; montant: number }[] }[];
  onFermer: () => void; onEnregistrer: (a: Ajustement) => void;
}) {
  const { risques } = useStore();
  const [a, setA] = useState(initial);
  const risquesProjet = risques.filter((r) => r.projetId === a.projetId && r.statut !== "Clos");
  const ok = a.libelle && a.montant > 0 && a.repartition.length > 0 && Math.abs(sommeRepartition(a.repartition)) > 0;
  return (
    <Modale ouverte large onFermer={onFermer} titre={b.d.ajustements.some((x) => x.id === a.id) ? "Modifier l'ajustement" : "Nouvel ajustement"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!ok} onClick={() => { onEnregistrer({ ...a, dateRevue: aujourdhui() }); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid gap-4 sm:grid-cols-6">
        <Champ libelle="Type" className="sm:col-span-2">
          <Liste value={a.type} onChange={(e) => {
            const type = e.target.value as TypeAjustement;
            setA({ ...a, type, probabilite: type === "Risque" ? 30 : type === "Opportunité" ? 50 : a.probabilite });
          }}>{TYPES.map((t) => <option key={t.id}>{t.id}</option>)}</Liste>
        </Champ>
        <Champ libelle="Libellé" className="sm:col-span-4"><Saisie value={a.libelle} onChange={(e) => setA({ ...a, libelle: e.target.value })} /></Champ>
        <p className="-mt-2 text-xs text-slate-500 sm:col-span-6">{TYPES.find((t) => t.id === a.type)?.aide}</p>
        <Champ libelle="Montant HT (CHF)" className="sm:col-span-2"><Saisie type="number" value={a.montant || ""} onChange={(e) => setA({ ...a, montant: Math.abs(Number(e.target.value)) })} /></Champ>
        <Champ libelle={`Probabilité : ${a.probabilite} %`} className="sm:col-span-2"><input type="range" min={0} max={100} step={5} value={a.probabilite} onChange={(e) => setA({ ...a, probabilite: Number(e.target.value) })} className="mt-2 w-full" /></Champ>
        <Champ libelle="Statut" className="sm:col-span-2">
          <Liste value={a.statut} onChange={(e) => setA({ ...a, statut: e.target.value as Ajustement["statut"] })}>
            <option value="Active">Active</option><option value="Convertie">Convertie (commandée)</option><option value="Abandonnée">Abandonnée</option>
          </Liste>
        </Champ>
        <Champ libelle="Échéance d'engagement prévue" className="sm:col-span-2"><Saisie type="date" value={a.echeance ?? ""} onChange={(e) => setA({ ...a, echeance: e.target.value || undefined })} /></Champ>
        {a.type === "Risque" && (
          <Champ libelle="Risque du registre" className="sm:col-span-4">
            <Liste value={a.risqueId ?? ""} onChange={(e) => {
              const r = risquesProjet.find((x) => x.id === e.target.value);
              setA({ ...a, risqueId: r?.id, libelle: a.libelle || r?.titre || "", montant: a.montant || r?.impactFinancier || 0, probabilite: r ? r.probabilite * 20 : a.probabilite });
            }}>
              <option value="">Aucun</option>
              {risquesProjet.map((r) => <option key={r.id} value={r.id}>{r.code} – {r.titre}</option>)}
            </Liste>
          </Champ>
        )}
        {a.type === "Correction de commande" && (
          <Champ libelle="Commande concernée" className="sm:col-span-4">
            <Liste value={a.contratId ?? ""} onChange={(e) => {
              const c = contrats.find((x) => x.id === e.target.value);
              setA({ ...a, contratId: c?.id, repartition: a.repartition.length ? a.repartition : c?.repartition ?? [] });
            }}>
              <option value="">Choisir…</option>
              {contrats.map((c) => <option key={c.id} value={c.id}>{c.numero} – {c.objet}</option>)}
            </Liste>
          </Champ>
        )}
      </div>
      <p className="mt-5 mb-2 text-sm font-semibold">Positions concernées</p>
      <EditeurRepartition valeur={a.repartition} onChange={(r) => setA({ ...a, repartition: r })} positions={b.toutes} lots={b.lots} total={a.montant || undefined} />
      <Champ libelle="Justification" className="mt-4"><Zone rows={3} value={a.justification ?? ""} onChange={(e) => setA({ ...a, justification: e.target.value || undefined })} placeholder="Source de l'estimation, hypothèses, PV de séance…" /></Champ>
    </Modale>
  );
}
