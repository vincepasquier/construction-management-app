import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Check, FileCheck2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../../store/useStore";
import { equilibreMutation } from "../../lib/budget";
import { aujourdhui, formatCHF, formatDate } from "../../lib/format";
import { nouvelId } from "../../lib/id";
import type { Mutation } from "../../types";
import { Badge, Bouton, Carte, Champ, cx, Modale, Saisie, Tableau, Vide, Zone } from "../ui";
import { EditeurRepartition } from "./Repartition";
import type { Budget } from "./useBudget";

const COULEUR: Record<Mutation["statut"], "gris" | "orange" | "vert" | "rouge"> = { Brouillon: "gris", Soumise: "orange", Validée: "vert", Refusée: "rouge" };

export function OngletMutations({ b }: { b: Budget }) {
  const { ajouter, modifier, supprimer, utilisateurId, personnes } = useStore();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<Mutation | null>(null);
  const mutations = [...b.d.mutations].sort((x, y) => y.date.localeCompare(x.date) || y.numero.localeCompare(x.numero));
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom;
  const prochainNumero = () => {
    const n = Math.max(0, ...b.d.mutations.map((m) => Number(m.numero.replace(/\D/g, "")) || 0)) + 1;
    return String(n).padStart(2, "0");
  };
  const nouvelle = (): Mutation => ({ id: nouvelId("mut"), projetId: b.d.projet!.id, numero: prochainNumero(), motif: "", date: aujourdhui(), statut: "Brouillon", demandeurId: utilisateurId ?? undefined, lignes: [] });
  const valides = b.d.mutations.filter((m) => m.statut === "Validée");
  const volume = valides.reduce((s, m) => s + equilibreMutation(m).debits, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {valides.length} mutation(s) validée(s), {formatCHF(volume)} déplacés. Seules les mutations validées modifient le budget révisé ; le total du projet ne change pas.
        </p>
        <Bouton variante="primaire" className="ml-auto" icone={<Plus size={15} />} onClick={() => setEdition(nouvelle())}>Nouvelle mutation</Bouton>
      </div>

      <Carte>
        {mutations.length ? (
          <Tableau>
            <thead><tr><th>N°</th><th>Date</th><th>Motif</th><th>De → vers</th><th className="!text-right">Montant</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {mutations.map((m) => {
                const eq = equilibreMutation(m);
                const debits = m.lignes.filter((l) => l.montant < 0);
                const credits = m.lignes.filter((l) => l.montant > 0);
                return (
                  <tr key={m.id}>
                    <td className="num font-medium">{m.numero}</td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(m.date)}</td>
                    <td>
                      <p className="font-medium">{m.motif}</p>
                      <p className="text-xs text-slate-500">{[nom(m.demandeurId) && `Demandée par ${nom(m.demandeurId)}`, m.valideurId && `${m.statut === "Refusée" ? "refusée" : "validée"} par ${nom(m.valideurId)} le ${formatDate(m.dateValidation)}`, m.remarques].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="max-w-md text-xs">
                      {debits.map((l, i) => <p key={`d${i}`} className="truncate text-rose-700 dark:text-rose-400" title={b.libelle(l.budgetId)}>− {formatCHF(-l.montant)} {b.libelle(l.budgetId)}</p>)}
                      {credits.map((l, i) => <p key={`c${i}`} className="truncate text-emerald-700 dark:text-emerald-400" title={b.libelle(l.budgetId)}>+ {formatCHF(l.montant)} {b.libelle(l.budgetId)}</p>)}
                    </td>
                    <td className="num whitespace-nowrap text-right font-medium">{formatCHF(eq.debits)}{!eq.equilibree && <span className="block text-xs text-rose-600">déséquilibrée</span>}</td>
                    <td><Badge couleur={COULEUR[m.statut]}>{m.statut}</Badge></td>
                    <td className="whitespace-nowrap text-right">
                      {(m.statut === "Brouillon" || m.statut === "Soumise") && <>
                        <Bouton taille="sm" variante="fantome" title="Lancer un circuit de validation" onClick={() => navigate(`/validations?type=Mutation&id=${m.id}&titre=${encodeURIComponent(`Mutation ${m.numero} – ${m.motif}`)}`)}><FileCheck2 size={14} /></Bouton>
                        <Bouton taille="sm" variante="fantome" title="Valider directement" disabled={!eq.equilibree} onClick={() => modifier("mutations", m.id, { statut: "Validée", valideurId: utilisateurId ?? undefined, dateValidation: aujourdhui() })}><Check size={14} /></Bouton>
                        <Bouton taille="sm" variante="fantome" title="Refuser" onClick={() => modifier("mutations", m.id, { statut: "Refusée", valideurId: utilisateurId ?? undefined, dateValidation: aujourdhui() })}><X size={14} /></Bouton>
                        <Bouton taille="sm" variante="fantome" title="Modifier" onClick={() => setEdition(m)}><Pencil size={14} /></Bouton>
                      </>}
                      <Bouton taille="sm" variante="fantome" title="Supprimer" onClick={() => confirm(`Supprimer la mutation ${m.numero} ?${m.statut === "Validée" ? " Le budget révisé des positions concernées sera rétabli." : ""}`) && supprimer("mutations", m.id)}><Trash2 size={14} /></Bouton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        ) : (
          <Vide icone={<ArrowRightLeft size={22} />} titre="Aucune mutation" texte="Une mutation transfère du budget d'une ou plusieurs positions vers d'autres, par exemple de la réserve vers une position en dépassement." />
        )}
      </Carte>

      {edition && (
        <FormulaireMutation b={b} initial={edition} onFermer={() => setEdition(null)}
          onEnregistrer={(m) => (b.d.mutations.some((x) => x.id === m.id) ? modifier("mutations", m.id, m) : ajouter("mutations", m))} />
      )}
    </>
  );
}

function FormulaireMutation({ b, initial, onFermer, onEnregistrer }: { b: Budget; initial: Mutation; onFermer: () => void; onEnregistrer: (m: Mutation) => void }) {
  const { utilisateurId } = useStore();
  const [m, setM] = useState(initial);
  const [deb, setDeb] = useState(m.lignes.filter((l) => l.montant < 0));
  const [cre, setCre] = useState(m.lignes.filter((l) => l.montant > 0));
  const lignes = [...deb, ...cre].filter((l) => l.budgetId && l.montant);
  const eq = equilibreMutation({ lignes });
  const reserves = b.toutes.filter((p) => p.ligne.reserve && !p.virtuelle);
  const enregistrer = (statut: Mutation["statut"]) => {
    onEnregistrer({ ...m, lignes, statut, ...(statut === "Validée" ? { valideurId: utilisateurId ?? undefined, dateValidation: aujourdhui() } : {}) });
    onFermer();
  };

  return (
    <Modale ouverte large onFermer={onFermer} titre={`Mutation ${m.numero}`}
      pied={<>
        <span className={cx("mr-auto self-center text-sm num", eq.equilibree ? "text-emerald-600" : "text-amber-600")}>
          Débits {formatCHF(eq.debits)} · crédits {formatCHF(eq.credits)}{eq.equilibree ? " ✓ équilibrée" : ` · écart ${formatCHF(eq.solde)}`}
        </span>
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton disabled={!m.motif} onClick={() => enregistrer("Brouillon")}>Brouillon</Bouton>
        <Bouton disabled={!m.motif || !eq.equilibree} onClick={() => enregistrer("Soumise")}>Soumettre</Bouton>
        <Bouton variante="primaire" disabled={!m.motif || !eq.equilibree} onClick={() => enregistrer("Validée")}>Valider</Bouton>
      </>}>
      <div className="grid gap-4 sm:grid-cols-6">
        <Champ libelle="Numéro" className="sm:col-span-1"><Saisie value={m.numero} onChange={(e) => setM({ ...m, numero: e.target.value })} /></Champ>
        <Champ libelle="Date" className="sm:col-span-2"><Saisie type="date" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} /></Champ>
        <Champ libelle="Motif" className="sm:col-span-3"><Saisie value={m.motif} onChange={(e) => setM({ ...m, motif: e.target.value })} placeholder="Ex. Plus-value terrain rocheux couverte par la réserve" /></Champ>
      </div>

      {reserves.length > 0 && deb.length === 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Raccourci :</span>
          {reserves.map((r) => (
            <Bouton key={r.id} taille="sm" onClick={() => setDeb([{ budgetId: r.id, montant: 0 }])}>Puiser dans « {r.ligne.libelle}{r.ligne.etape ? ` Ét. ${r.ligne.etape}` : ""} » ({formatCHF(r.ecart)} disponibles)</Bouton>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-rose-700 dark:text-rose-400">Débit – positions qui cèdent du budget</p>
          <EditeurRepartition valeur={deb} onChange={setDeb} positions={b.toutes} lots={b.lots} signe={-1} />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Crédit – positions qui reçoivent du budget</p>
          <EditeurRepartition valeur={cre} onChange={setCre} positions={b.toutes} lots={b.lots} signe={1} total={eq.debits || undefined} />
        </div>
      </div>
      {deb.some((l) => { const p = b.toutes.find((x) => x.id === l.budgetId); return p && -l.montant > p.ecart + 0.5; }) && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Une position cède plus que sa marge (budget révisé − atterrissage) : elle passera en dépassement.
        </p>
      )}
      <Champ libelle="Remarques" className="mt-4"><Zone rows={2} value={m.remarques ?? ""} onChange={(e) => setM({ ...m, remarques: e.target.value || undefined })} /></Champ>
      <p className="mt-2 text-xs text-slate-500">« Soumettre » la place en attente ; vous pouvez ensuite lancer un circuit de validation (bouton <FileCheck2 size={12} className="inline" /> dans la liste). « Valider » l'applique immédiatement au budget révisé.</p>
    </Modale>
  );
}
