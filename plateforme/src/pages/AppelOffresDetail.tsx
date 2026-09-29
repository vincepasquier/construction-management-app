import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, Download, FileUp, Pencil, Plus, Sparkles, Trash2, Trophy, UserPlus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store/useStore";
import { useUI } from "../store/useUI";
import { evaluerSoumissions, montantBrutSoumission, montantNetSoumission, positionsManquantes } from "../lib/finance";
import { aujourdhui, formatCHF, formatCHFPrecis, formatDate, formatNombre } from "../lib/format";
import { telechargerCSV } from "../lib/csv";
import { nouvelId } from "../lib/id";
import { CHAPITRES_CAN, libelleCAN, UNITES } from "../data/can";
import { libelleCFC } from "../data/cfc";
import { Badge, BadgeStatut, Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Liste, Modale, Onglets, Saisie, Tableau, Vide } from "../components/ui";
import { FormulaireAO } from "./AppelsOffres";
import type { AppelOffres, Contrat, PositionCAN, Soumission } from "../types";

type Onglet = "descriptif" | "soumissions" | "evaluation";

export function AppelOffresDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appelsOffres, entreprises, modifier, supprimer, ajouter, contrats, projets } = useStore();
  const { ouvrirAssistant } = useUI();
  const [onglet, setOnglet] = useState<Onglet>("soumissions");
  const [edition, setEdition] = useState(false);
  const [adjudication, setAdjudication] = useState<string | null>(null);
  const ao = appelsOffres.find((a) => a.id === id);
  if (!ao) return <Carte><Vide titre="Appel d'offres introuvable" action={<Link to="/appels-offres"><Bouton>Retour</Bouton></Link>} /></Carte>;

  const maj = (p: Partial<AppelOffres>) => modifier("appelsOffres", ao.id, p);
  const nomEnt = (eid: string) => entreprises.find((e) => e.id === eid)?.nom ?? "?";
  const evals = evaluerSoumissions(ao);
  const meilleure = evals[0];
  const projet = projets.find((p) => p.id === ao.projetId);
  const contratExistant = contrats.find((c) => c.appelOffresId === ao.id);

  const adjuger = (soumissionId: string) => {
    const s = ao.soumissions.find((x) => x.id === soumissionId)!;
    const contrat: Contrat = {
      id: nouvelId("ctr"), projetId: ao.projetId, numero: `C-${projet?.code ?? ""}-${String(contrats.filter((c) => c.projetId === ao.projetId).length + 1).padStart(2, "0")}`,
      entrepriseId: s.entrepriseId, cfc: ao.cfc, lotId: ao.lotId, appelOffresId: ao.id, objet: ao.objet, type: "Contrat d'entreprise",
      montantInitial: Math.round(montantNetSoumission(ao, s) * 100) / 100, dateSignature: aujourdhui(), retenuePct: 10, statut: "En préparation", avenants: [],
    };
    ajouter("contrats", contrat);
    maj({ statut: "Adjugé", adjudicataireId: s.entrepriseId });
    navigate(`/contrats/${contrat.id}`);
  };

  return (
    <>
      <Link to="/appels-offres" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={14} /> Appels d'offres</Link>
      <EnTetePage
        titre={`${ao.numero} · ${ao.objet}`}
        description={<span className="flex flex-wrap items-center gap-2"><BadgeStatut statut={ao.statut} /> CFC {ao.cfc} {libelleCFC(ao.cfc)} · Procédure {ao.procedure.toLowerCase()} · retour le {formatDate(ao.dateRetour)}</span>}
        actions={<>
          <Bouton icone={<Pencil size={15} />} onClick={() => setEdition(true)}>Modifier</Bouton>
          <Bouton icone={<Sparkles size={15} />} onClick={() => ouvrirAssistant(`Analyse les soumissions de l'appel d'offres ${ao.numero} (${ao.objet}) : compare les prix, repère les positions anormalement hautes ou basses (offres spéculatives), vérifie la cohérence avec l'estimation et propose une adjudication motivée selon les critères.`)}>Analyse IA</Bouton>
          <Bouton variante="danger" icone={<Trash2 size={15} />} onClick={() => { if (confirm("Supprimer cet appel d'offres ?")) { supprimer("appelsOffres", ao.id); navigate("/appels-offres"); } }}>Supprimer</Bouton>
        </>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Estimation" valeur={formatCHF(ao.montantEstime)} />
        <Indicateur libelle="Offres reçues" valeur={`${ao.soumissions.length}`} detail={`${ao.entreprisesInvitees.length} entreprise(s) invitée(s)`} />
        <Indicateur libelle="Offre la plus basse" valeur={evals.length ? formatCHF(Math.min(...evals.map((e) => e.montant))) : "—"}
          detail={evals.length && ao.montantEstime ? `${(((Math.min(...evals.map((e) => e.montant)) - ao.montantEstime) / ao.montantEstime) * 100).toFixed(1)} % vs estimation` : undefined} />
        <Indicateur libelle="Mieux-disant" valeur={meilleure ? nomEnt(ao.soumissions.find((s) => s.id === meilleure.soumissionId)!.entrepriseId) : "—"}
          detail={meilleure ? `${meilleure.total.toFixed(0)} / 500 points` : undefined} tendance={meilleure ? "bon" : undefined} />
      </div>

      {contratExistant && (
        <Link to={`/contrats/${contratExistant.id}`} className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <Award size={16} /> Adjugé à {nomEnt(contratExistant.entrepriseId)} – contrat {contratExistant.numero} ({formatCHF(contratExistant.montantInitial)}) →
        </Link>
      )}

      <div className="mt-6 mb-4">
        <Onglets valeur={onglet} onChange={setOnglet} options={[
          { id: "descriptif", libelle: "Descriptif CAN", compte: ao.positions.length },
          { id: "soumissions", libelle: "Comparatif des offres", compte: ao.soumissions.length },
          { id: "evaluation", libelle: "Évaluation & adjudication" },
        ]} />
      </div>

      {onglet === "descriptif" && <Descriptif ao={ao} maj={maj} />}
      {onglet === "soumissions" && <Comparatif ao={ao} maj={maj} nomEnt={nomEnt} />}
      {onglet === "evaluation" && (
        <Evaluation ao={ao} maj={maj} nomEnt={nomEnt} peutAdjuger={!contratExistant} onAdjuger={setAdjudication} />
      )}

      {edition && <FormulaireAO projetId={ao.projetId} initial={ao} onFermer={() => setEdition(false)} onEnregistrer={(a) => maj(a)} />}
      {adjudication && (
        <Modale ouverte onFermer={() => setAdjudication(null)} titre="Confirmer l'adjudication"
          pied={<><Bouton onClick={() => setAdjudication(null)}>Annuler</Bouton><Bouton variante="primaire" onClick={() => adjuger(adjudication)}>Adjuger et créer le contrat</Bouton></>}>
          <p className="text-sm">
            Adjuger <strong>{ao.objet}</strong> à <strong>{nomEnt(ao.soumissions.find((s) => s.id === adjudication)!.entrepriseId)}</strong> pour{" "}
            <strong>{formatCHF(montantNetSoumission(ao, ao.soumissions.find((s) => s.id === adjudication)!))}</strong> HT ?
          </p>
          <p className="mt-2 text-sm text-slate-500">Un contrat d'entreprise (SIA 118) est créé en préparation, avec une retenue de garantie de 10 %. Pensez au délai de recours avant la signature en marché public.</p>
          <Bouton className="mt-4" variante="fantome" icone={<Sparkles size={15} />} onClick={() => ouvrirAssistant(`Rédige la lettre d'adjudication pour ${nomEnt(ao.soumissions.find((s) => s.id === adjudication)!.entrepriseId)} ainsi que les lettres de non-adjudication motivées pour les autres soumissionnaires de l'appel d'offres ${ao.numero} (${ao.objet}), avec mention des voies de recours.`)}>
            Rédiger les courriers avec l'IA
          </Bouton>
        </Modale>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Descriptif : positions CAN
// ---------------------------------------------------------------------------

function Descriptif({ ao, maj }: { ao: AppelOffres; maj: (p: Partial<AppelOffres>) => void }) {
  const [edition, setEdition] = useState<PositionCAN | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  const importer = async (f: File) => {
    const texte = await f.text();
    const lignes = texte.split(/\r?\n/).map((l) => l.split(/[;\t]/)).filter((c) => c.length >= 4 && /\d/.test(c[0]));
    const positions: PositionCAN[] = lignes.map(([numero, libelle, unite, quantite]) => ({
      id: nouvelId("pos"), numero: numero.trim(), chapitre: numero.trim().slice(0, 3), libelle: libelle.trim(), unite: unite.trim(),
      quantite: Number(quantite.replace(/['\s]/g, "").replace(",", ".")) || 0,
    }));
    maj({ positions: [...ao.positions, ...positions] });
    alert(`${positions.length} position(s) importée(s).`);
  };

  const chapitres = [...new Set(ao.positions.map((p) => p.chapitre))].sort();

  return (
    <Carte titre="Descriptif selon CAN" sousTitre="Positions du catalogue des articles normalisés, regroupées par chapitre"
      action={<div className="flex gap-2">
        <input ref={fichier} type="file" accept=".csv,.txt" hidden onChange={(e) => e.target.files?.[0] && importer(e.target.files[0])} />
        <Bouton taille="sm" icone={<FileUp size={14} />} onClick={() => fichier.current?.click()} title="CSV : numéro;libellé;unité;quantité">Importer CSV</Bouton>
        <Bouton taille="sm" variante="primaire" icone={<Plus size={14} />} onClick={() => setEdition({ id: nouvelId("pos"), chapitre: "", numero: "", libelle: "", unite: "m3", quantite: 0 })}>Position</Bouton>
      </div>}>
      {ao.positions.length === 0 ? (
        <Vide titre="Aucune position" texte="Ajoutez les positions du descriptif ou importez-les depuis votre logiciel de devis (CSV : numéro;libellé;unité;quantité)." />
      ) : (
        <Tableau>
          <thead><tr><th>N° CAN</th><th>Libellé</th><th>Unité</th><th className="!text-right">Quantité</th><th /></tr></thead>
          <tbody>
            {chapitres.map((ch) => [
              <tr key={ch} className="bg-slate-50/70 dark:bg-slate-800/30"><td colSpan={5} className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ch} · {libelleCAN(ch)}</td></tr>,
              ...ao.positions.filter((p) => p.chapitre === ch).map((p) => (
                <tr key={p.id}>
                  <td className="num text-slate-500">{p.numero}</td><td>{p.libelle}</td><td>{p.unite}</td><td className="num text-right">{formatNombre(p.quantite)}</td>
                  <td className="text-right whitespace-nowrap">
                    <Bouton taille="sm" variante="fantome" onClick={() => setEdition(p)}><Pencil size={14} /></Bouton>
                    <Bouton taille="sm" variante="fantome" onClick={() => maj({ positions: ao.positions.filter((x) => x.id !== p.id) })}><Trash2 size={14} /></Bouton>
                  </td>
                </tr>
              )),
            ])}
          </tbody>
        </Tableau>
      )}
      {edition && (
        <Modale ouverte onFermer={() => setEdition(null)} titre="Position CAN"
          pied={<><Bouton onClick={() => setEdition(null)}>Annuler</Bouton><Bouton variante="primaire" disabled={!edition.numero || !edition.libelle} onClick={() => {
            const p = { ...edition, chapitre: edition.chapitre || edition.numero.slice(0, 3) };
            maj({ positions: ao.positions.some((x) => x.id === p.id) ? ao.positions.map((x) => (x.id === p.id ? p : x)) : [...ao.positions, p] });
            setEdition(null);
          }}>Enregistrer</Bouton></>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Chapitre CAN">
              <Liste value={edition.chapitre} onChange={(e) => setEdition({ ...edition, chapitre: e.target.value, numero: edition.numero || `${e.target.value}.` })}>
                <option value="">—</option>{Object.entries(CHAPITRES_CAN).map(([c, l]) => <option key={c} value={c}>{c} {l}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="N° de position"><Saisie value={edition.numero} onChange={(e) => setEdition({ ...edition, numero: e.target.value })} placeholder="211.112.101" /></Champ>
            <Champ libelle="Libellé" className="col-span-2"><Saisie value={edition.libelle} onChange={(e) => setEdition({ ...edition, libelle: e.target.value })} /></Champ>
            <Champ libelle="Unité"><Liste value={edition.unite} onChange={(e) => setEdition({ ...edition, unite: e.target.value })}>{UNITES.map((u) => <option key={u}>{u}</option>)}</Liste></Champ>
            <Champ libelle="Quantité"><Saisie type="number" value={edition.quantite || ""} onChange={(e) => setEdition({ ...edition, quantite: Number(e.target.value) })} /></Champ>
          </div>
        </Modale>
      )}
    </Carte>
  );
}

// ---------------------------------------------------------------------------
// Comparatif des prix unitaires
// ---------------------------------------------------------------------------

function mediane(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function Comparatif({ ao, maj, nomEnt }: { ao: AppelOffres; maj: (p: Partial<AppelOffres>) => void; nomEnt: (id: string) => string }) {
  const { entreprises } = useStore();
  const [ajout, setAjout] = useState(false);
  const majSoumission = (sid: string, p: Partial<Soumission>) => maj({ soumissions: ao.soumissions.map((s) => (s.id === sid ? { ...s, ...p } : s)) });
  const nets = ao.soumissions.map((s) => montantNetSoumission(ao, s));
  const minNet = Math.min(...nets.filter((n) => n > 0));
  const disponibles = entreprises.filter((e) => !ao.soumissions.some((s) => s.entrepriseId === e.id));

  const exporter = () => telechargerCSV(`${ao.numero}_comparatif`,
    ["N°", "Libellé", "Unité", "Quantité", ...ao.soumissions.flatMap((s) => [`PU ${nomEnt(s.entrepriseId)}`, `Total ${nomEnt(s.entrepriseId)}`])],
    [
      ...ao.positions.map((p) => [p.numero, p.libelle, p.unite, p.quantite, ...ao.soumissions.flatMap((s) => [s.prixUnitaires[p.id] ?? 0, (s.prixUnitaires[p.id] ?? 0) * p.quantite])]),
      ["", "Total net", "", "", ...ao.soumissions.flatMap((s) => ["", montantNetSoumission(ao, s)])],
    ]);

  return (
    <Carte titre="Comparatif des prix unitaires" sousTitre="Prix le plus bas en vert · écart > 30 % par rapport à la médiane signalé en orange"
      action={<div className="flex gap-2">
        {ao.soumissions.length > 0 && <Bouton taille="sm" icone={<Download size={14} />} onClick={exporter}>Export</Bouton>}
        <Bouton taille="sm" variante="primaire" icone={<UserPlus size={14} />} onClick={() => setAjout(true)} disabled={!disponibles.length}>Saisir une offre</Bouton>
      </div>}>
      {ao.soumissions.length === 0 ? (
        <Vide titre="Aucune offre saisie" texte={ao.positions.length ? "Saisissez les offres reçues pour obtenir le comparatif automatique." : "Commencez par compléter le descriptif CAN."} />
      ) : (
        <Tableau>
          <thead>
            <tr>
              <th>Position</th><th>Qté</th>
              {ao.soumissions.map((s) => (
                <th key={s.id} className="!text-right">
                  <div className="flex items-center justify-end gap-1">
                    {nets[ao.soumissions.indexOf(s)] === minNet && <Trophy size={13} className="text-emerald-600" />}
                    <span className="normal-case">{nomEnt(s.entrepriseId)}</span>
                    <button onClick={() => confirm("Retirer cette offre ?") && maj({ soumissions: ao.soumissions.filter((x) => x.id !== s.id) })} className="ml-1 text-slate-300 hover:text-rose-600"><Trash2 size={12} /></button>
                  </div>
                  <div className="text-[10px] font-normal normal-case text-slate-400">PU · total</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ao.positions.map((p) => {
              const pus = ao.soumissions.map((s) => s.prixUnitaires[p.id] ?? 0);
              const valides = pus.filter((x) => x > 0);
              const min = Math.min(...valides);
              const med = valides.length ? mediane(valides) : 0;
              return (
                <tr key={p.id}>
                  <td className="min-w-64"><span className="num mr-2 text-xs text-slate-400">{p.numero}</span>{p.libelle}</td>
                  <td className="num whitespace-nowrap text-slate-500">{formatNombre(p.quantite)} {p.unite}</td>
                  {ao.soumissions.map((s, i) => {
                    const pu = pus[i];
                    const anormal = valides.length >= 2 && pu > 0 && Math.abs(pu - med) / med > 0.3;
                    return (
                      <td key={s.id} className={cx("text-right", pu > 0 && pu === min && valides.length > 1 && "bg-emerald-50/70 dark:bg-emerald-950/30", anormal && "bg-amber-50 dark:bg-amber-950/30")}>
                        <input type="number" step="0.01" value={pu || ""} placeholder="—"
                          onChange={(e) => majSoumission(s.id, { prixUnitaires: { ...s.prixUnitaires, [p.id]: Number(e.target.value) } })}
                          className="num w-24 rounded bg-transparent px-1 text-right outline-none focus:bg-white focus:ring-1 focus:ring-brand-500 dark:focus:bg-slate-900" />
                        <div className="num text-xs text-slate-400">{pu ? formatCHF(pu * p.quantite) : ""}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 [&_td]:px-4 [&_td]:py-2">
            <tr><td colSpan={2} className="text-slate-500">Total brut</td>{ao.soumissions.map((s) => <td key={s.id} className="num text-right">{formatCHFPrecis(montantBrutSoumission(ao, s))}</td>)}</tr>
            <tr><td colSpan={2} className="text-slate-500">Rabais %</td>{ao.soumissions.map((s) => <td key={s.id} className="text-right"><input type="number" step="0.1" value={s.rabaisPct} onChange={(e) => majSoumission(s.id, { rabaisPct: Number(e.target.value) })} className="num w-16 rounded bg-transparent px-1 text-right ring-1 ring-slate-200 dark:ring-slate-700" /></td>)}</tr>
            <tr><td colSpan={2} className="text-slate-500">Escompte %</td>{ao.soumissions.map((s) => <td key={s.id} className="text-right"><input type="number" step="0.1" value={s.escomptePct} onChange={(e) => majSoumission(s.id, { escomptePct: Number(e.target.value) })} className="num w-16 rounded bg-transparent px-1 text-right ring-1 ring-slate-200 dark:ring-slate-700" /></td>)}</tr>
            <tr className="font-semibold"><td colSpan={2}>Total net HT</td>{ao.soumissions.map((s, i) => (
              <td key={s.id} className={cx("num text-right", nets[i] === minNet && "text-emerald-600")}>
                {formatCHFPrecis(nets[i])}
                {positionsManquantes(ao, s) > 0 && <div><Badge couleur="orange">{positionsManquantes(ao, s)} pos. sans prix</Badge></div>}
                {nets[i] !== minNet && nets[i] > 0 && <div className="text-xs font-normal text-slate-400">+{(((nets[i] - minNet) / minNet) * 100).toFixed(1)} %</div>}
              </td>
            ))}</tr>
          </tfoot>
        </Tableau>
      )}
      {ajout && (
        <Modale ouverte onFermer={() => setAjout(false)} titre="Nouvelle offre">
          <p className="mb-3 text-sm text-slate-500">Choisissez l'entreprise soumissionnaire. Vous saisirez ensuite les prix unitaires directement dans le tableau.</p>
          <div className="grid gap-2">
            {disponibles.map((e) => (
              <button key={e.id} onClick={() => {
                maj({ soumissions: [...ao.soumissions, { id: nouvelId("sou"), entrepriseId: e.id, dateReception: aujourdhui(), prixUnitaires: {}, rabaisPct: 0, escomptePct: 0, notes: {} }] });
                setAjout(false);
              }} className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800">
                <span className="font-medium">{e.nom}</span>
                <span className="text-xs text-slate-500">{e.localite}{ao.entreprisesInvitees.includes(e.id) && " · invitée"}</span>
              </button>
            ))}
          </div>
        </Modale>
      )}
    </Carte>
  );
}

// ---------------------------------------------------------------------------
// Évaluation multicritère
// ---------------------------------------------------------------------------

function Evaluation({ ao, maj, nomEnt, peutAdjuger, onAdjuger }: {
  ao: AppelOffres; maj: (p: Partial<AppelOffres>) => void; nomEnt: (id: string) => string; peutAdjuger: boolean; onAdjuger: (sid: string) => void;
}) {
  const evals = evaluerSoumissions(ao);
  const sommePoids = ao.criteres.reduce((s, c) => s + c.poids, 0);
  const majNote = (sid: string, cid: string, v: number) =>
    maj({ soumissions: ao.soumissions.map((s) => (s.id === sid ? { ...s, notes: { ...s.notes, [cid]: Math.max(0, Math.min(5, v)) } } : s)) });

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Carte className="lg:col-span-2" titre="Critères d'adjudication" sousTitre={sommePoids === 100 ? "Pondération totale : 100 %" : `⚠ Pondération totale : ${sommePoids} % (doit faire 100 %)`}
        action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => maj({ criteres: [...ao.criteres, { id: nouvelId("cr"), nom: "Nouveau critère", poids: 0 }] })}>Critère</Bouton>}>
        <div className="space-y-2 p-4">
          {ao.criteres.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <Saisie value={c.nom} disabled={c.estPrix} onChange={(e) => maj({ criteres: ao.criteres.map((x) => (x.id === c.id ? { ...x, nom: e.target.value } : x)) })} />
              <Saisie type="number" className="!w-20 text-right" value={c.poids} onChange={(e) => maj({ criteres: ao.criteres.map((x) => (x.id === c.id ? { ...x, poids: Number(e.target.value) } : x)) })} />
              <span className="text-sm text-slate-500">%</span>
              {!c.estPrix && <button onClick={() => maj({ criteres: ao.criteres.filter((x) => x.id !== c.id) })} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>}
            </div>
          ))}
          <p className="pt-2 text-xs text-slate-500">Notes de 0 à 5. Le prix est noté automatiquement : 5 × prix le plus bas / prix de l'offre.</p>
        </div>
      </Carte>

      <Carte className="lg:col-span-3" titre="Classement">
        {evals.length === 0 ? <Vide titre="Aucune offre chiffrée" /> : (
          <>
            <div className="h-48 px-4 pt-4">
              <ResponsiveContainer>
                <BarChart data={evals.map((e) => ({ nom: nomEnt(ao.soumissions.find((s) => s.id === e.soumissionId)!.entrepriseId), points: Math.round(e.total) }))} layout="vertical">
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 500]} fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="nom" width={170} fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => `${v} / 500 pts`} cursor={{ fill: "rgba(99,102,241,.06)" }} />
                  <Bar dataKey="points" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Tableau>
              <thead><tr><th>Rang</th><th>Entreprise</th>{ao.criteres.map((c) => <th key={c.id} className="!text-center">{c.nom}<div className="text-[10px] font-normal">{c.poids} %</div></th>)}<th className="!text-right">Total</th><th /></tr></thead>
              <tbody>
                {evals.map((e) => {
                  const s = ao.soumissions.find((x) => x.id === e.soumissionId)!;
                  return (
                    <tr key={e.soumissionId}>
                      <td>{e.rang === 1 ? <Trophy size={16} className="text-amber-500" /> : e.rang}</td>
                      <td className="font-medium">{nomEnt(s.entrepriseId)}<div className="num text-xs font-normal text-slate-500">{formatCHF(e.montant)}</div></td>
                      {ao.criteres.map((c) => (
                        <td key={c.id} className="text-center">
                          {c.estPrix ? <span className="num">{e.notePrix.toFixed(2)}</span> : (
                            <input type="number" min={0} max={5} step={0.5} value={s.notes[c.id] ?? ""} onChange={(ev) => majNote(s.id, c.id, Number(ev.target.value))}
                              className="num w-14 rounded px-1 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" />
                          )}
                        </td>
                      ))}
                      <td className="num text-right font-semibold">{e.total.toFixed(0)}</td>
                      <td className="text-right">{peutAdjuger && <Bouton taille="sm" variante={e.rang === 1 ? "primaire" : "secondaire"} onClick={() => onAdjuger(s.id)}>Adjuger</Bouton>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          </>
        )}
      </Carte>
    </div>
  );
}
