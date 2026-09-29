import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Check, CheckCircle2, Circle, Clock, ExternalLink, FileCheck2, History, Pencil, Plus, RotateCcw, Trash2, X, XCircle } from "lucide-react";
import { useProjetActif, useStore, useUtilisateur } from "../store/useStore";
import { annuler, attendDe, decider, etapeCourante, nouvelleVersion } from "../lib/validations";
import { aujourdhui, ajouterJours, formatCHF, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import { Avatar, Badge, BadgeStatut, Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Liste, Modale, Onglets, Saisie, Vide, Zone } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { CircuitValidation, DecisionValidation, Role, TypeObjetValidation } from "../types";

const MODELES: { nom: string; type: TypeObjetValidation; roles: Role[] }[] = [
  { nom: "Document technique (plans, notes de calcul)", type: "Document", roles: ["Ingénieur", "Directeur de projet"] },
  { nom: "Facture / situation", type: "Facture", roles: ["Conducteur de travaux", "Responsable de lot", "Directeur de projet"] },
  { nom: "Avenant", type: "Avenant", roles: ["Responsable de lot", "Directeur de projet", "Maître d'ouvrage"] },
  { nom: "PV de séance / courrier", type: "Document", roles: ["Directeur de projet"] },
];

type Vue = "moi" | "demandes" | "tous";

export function Validations() {
  const d = useProjetActif();
  const { personnes, modifier, ajouter, contrats, factures, utilisateurId } = useStore();
  const [params, setParams] = useSearchParams();
  const [vue, setVue] = useState<Vue>("moi");
  const [nouveau, setNouveau] = useState<CircuitValidation | null>(null);

  // Ouverture depuis un autre module (« Faire valider » sur un document, une facture, un avenant)
  useEffect(() => {
    const type = params.get("type") as TypeObjetValidation | null;
    if (!type || !d.projet || !utilisateurId) return;
    const id = params.get("id") ?? undefined;
    const contratId = params.get("contratId") ?? undefined;
    setNouveau(brouillon(d.projet.id, utilisateurId, type, id, contratId, params.get("titre") ?? "", params.get("url") ?? undefined));
    setParams({}, { replace: true });
  }, [params]);

  if (!d.projet) return <SansProjet />;
  const projetId = d.projet.id;
  const jour = aujourdhui();

  const aMoi = d.validations.filter((v) => attendDe(v, utilisateurId));
  const mesDemandes = d.validations.filter((v) => v.demandeurId === utilisateurId);
  const liste = (vue === "moi" ? aMoi : vue === "demandes" ? mesDemandes : d.validations)
    .slice().sort((a, b) => Number(b.statut === "En cours") - Number(a.statut === "En cours") || (a.echeance ?? "9").localeCompare(b.echeance ?? "9"));

  /** Répercute l'issue d'un circuit sur l'objet validé (facture, avenant) */
  const effets = (c: CircuitValidation) => {
    if (c.statut !== "Approuvé" && c.statut !== "Refusé") return;
    if (c.objet.type === "Facture" && c.objet.id) modifier("factures", c.objet.id, { statut: c.statut === "Approuvé" ? "Approuvée" : "Contestée" });
    if (c.objet.type === "Avenant" && c.objet.id && c.objet.contratId) {
      const ctr = contrats.find((x) => x.id === c.objet.contratId);
      if (ctr) modifier("contrats", ctr.id, { avenants: ctr.avenants.map((a) => (a.id === c.objet.id ? { ...a, statut: c.statut === "Approuvé" ? "Approuvé" : "Refusé" } : a)) });
    }
  };
  const enregistrer = (c: CircuitValidation) => { modifier("validations", c.id, c); effets(c); };

  return (
    <>
      <EnTetePage titre="Validations" description="Circuits de validation des documents, factures et avenants"
        actions={<Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => utilisateurId && setNouveau(brouillon(projetId, utilisateurId, "Document"))}>Nouveau circuit</Bouton>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="À valider par moi" valeur={aMoi.length} tendance={aMoi.length ? "alerte" : "bon"} detail={aMoi.length ? "en attente de votre décision" : "rien en attente"} />
        <Indicateur libelle="Circuits en cours" valeur={d.validations.filter((v) => v.statut === "En cours").length} />
        <Indicateur libelle="En retard" valeur={d.validations.filter((v) => v.statut === "En cours" && v.echeance && v.echeance < jour).length}
          tendance={d.validations.some((v) => v.statut === "En cours" && v.echeance && v.echeance < jour) ? "mauvais" : undefined} detail="échéance dépassée" />
        <Indicateur libelle="À corriger" valeur={d.validations.filter((v) => v.statut === "À corriger").length} detail="retour au demandeur" />
      </div>

      <div className="mt-6 mb-4">
        <Onglets valeur={vue} onChange={setVue} options={[
          { id: "moi", libelle: "À valider par moi", compte: aMoi.length },
          { id: "demandes", libelle: "Mes demandes", compte: mesDemandes.length },
          { id: "tous", libelle: "Tous les circuits", compte: d.validations.length },
        ]} />
      </div>

      {liste.length === 0 ? (
        <Carte><Vide icone={<FileCheck2 size={22} />} titre={vue === "moi" ? "Rien à valider pour le moment" : "Aucun circuit"} texte="Lancez un circuit depuis ce module, ou via « Faire valider » dans Documents et Contrats." /></Carte>
      ) : (
        <div className="space-y-4">
          {liste.map((c) => <CarteCircuit key={c.id} c={c} onChange={enregistrer} />)}
        </div>
      )}

      {nouveau && (
        <NouveauCircuit initial={nouveau} onFermer={() => setNouveau(null)} onCreer={(c) => { ajouter("validations", c); setVue("demandes"); }}
          factures={factures.filter((f) => f.projetId === projetId)} personnes={personnes} />
      )}
    </>
  );
}

function brouillon(projetId: string, demandeurId: string, type: TypeObjetValidation, id?: string, contratId?: string, titre = "", url?: string): CircuitValidation {
  return {
    id: nouvelId("val"), projetId, titre, objet: { type, id, contratId }, url, version: 1, demandeurId, etapes: [], statut: "En cours",
    dateCreation: aujourdhui(), echeance: ajouterJours(aujourdhui(), 10), historique: [],
  };
}

function CarteCircuit({ c, onChange }: { c: CircuitValidation; onChange: (c: CircuitValidation) => void }) {
  const { personnes, documents, factures, contrats, utilisateurId } = useStore();
  const [commentaire, setCommentaire] = useState("");
  const [historique, setHistorique] = useState(false);
  const [lienVersion, setLienVersion] = useState("");
  const nom = (id: string) => personnes.find((p) => p.id === id)?.nom ?? "?";
  const courante = etapeCourante(c);
  const aMoi = attendDe(c, utilisateurId);
  const demandeur = c.demandeurId === utilisateurId;
  const jour = aujourdhui();

  // Lien vers l'objet validé
  const doc = c.objet.type === "Document" ? documents.find((x) => x.id === c.objet.id) : undefined;
  const fac = c.objet.type === "Facture" ? factures.find((x) => x.id === c.objet.id) : undefined;
  const ctr = contrats.find((x) => x.id === c.objet.contratId);
  const url = c.url ?? doc?.url;

  const decision = (dcs: DecisionValidation) => {
    if (dcs !== "Approuvé" && !commentaire.trim()) { alert("Merci d'indiquer un commentaire pour motiver votre décision."); return; }
    onChange(decider(c, utilisateurId!, dcs, jour, commentaire.trim() || undefined));
    setCommentaire("");
  };

  return (
    <Carte className={cx(aMoi && "ring-2 ring-brand-300 dark:ring-indigo-700")}>
      <div className="flex flex-wrap items-start gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge couleur="violet">{c.objet.type}</Badge>
            <h3 className="font-semibold text-slate-900 dark:text-white">{c.titre}</h3>
            <span className="text-xs text-slate-400">v{c.version}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>Demandé par {nom(c.demandeurId)} le {formatDate(c.dateCreation)}</span>
            {c.echeance && <span className={cx(c.statut === "En cours" && c.echeance < jour && "font-medium text-rose-600")}><Clock size={11} className="mr-0.5 inline" />échéance {formatDate(c.echeance)}</span>}
            {fac && <span>{formatCHF(fac.montantHT)} HT</span>}
            {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline"><ExternalLink size={11} />Ouvrir le document</a>}
            {ctr && <Link to={`/contrats/${ctr.id}`} className="text-brand-600 hover:underline">Contrat {ctr.numero}</Link>}
          </p>
        </div>
        <BadgeStatut statut={c.statut} />
      </div>

      {/* Étapes du circuit */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        {c.etapes.map((e, i) => {
          const icone = e.statut === "Approuvé" ? <CheckCircle2 size={16} className="text-emerald-600" />
            : e.statut === "Refusé" ? <XCircle size={16} className="text-rose-600" />
              : e.statut === "Modifications demandées" ? <RotateCcw size={16} className="text-amber-600" />
                : courante?.id === e.id ? <Clock size={16} className="text-brand-600" /> : <Circle size={16} className="text-slate-300" />;
          return (
            <div key={e.id} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-slate-200 dark:bg-slate-700" />}
              <div className={cx("flex items-center gap-2 rounded-lg px-2.5 py-1.5 ring-1", courante?.id === e.id ? "bg-brand-50 ring-brand-200 dark:bg-indigo-950 dark:ring-indigo-800" : "ring-slate-200 dark:ring-slate-700")}
                title={e.commentaire ? `« ${e.commentaire} »` : undefined}>
                {icone}
                <Avatar nom={nom(e.personneId)} taille={22} />
                <div className="leading-tight">
                  <p className="text-xs font-medium">{nom(e.personneId)}</p>
                  <p className="text-[11px] text-slate-500">{e.date ? `${e.statut} · ${formatDate(e.date)}` : courante?.id === e.id ? "À son tour" : "En attente"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Décision du validateur courant */}
      {aMoi && (
        <div className="border-t border-slate-100 bg-brand-50/40 px-5 py-4 dark:border-slate-800 dark:bg-indigo-950/20">
          <p className="mb-2 text-sm font-medium">Votre décision</p>
          <Zone rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Commentaire (obligatoire pour un refus ou une demande de modifications)" />
          <div className="mt-2 flex flex-wrap gap-2">
            <Bouton variante="primaire" icone={<Check size={15} />} onClick={() => decision("Approuvé")}>Approuver</Bouton>
            <Bouton icone={<RotateCcw size={15} />} onClick={() => decision("Modifications demandées")}>Demander des modifications</Bouton>
            <Bouton variante="danger" icone={<X size={15} />} onClick={() => decision("Refusé")}>Refuser</Bouton>
          </div>
        </div>
      )}

      {/* Retour au demandeur */}
      {demandeur && (c.statut === "À corriger" || c.statut === "Refusé") && (
        <div className="border-t border-slate-100 bg-amber-50/50 px-5 py-4 dark:border-slate-800 dark:bg-amber-950/20">
          <p className="mb-2 text-sm">
            <span className="font-medium">{c.statut === "Refusé" ? "Refusé" : "Modifications demandées"}</span>
            {c.historique.at(-1)?.commentaire && <> : « {c.historique.at(-1)!.commentaire} »</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Saisie value={lienVersion} onChange={(e) => setLienVersion(e.target.value)} placeholder="Lien vers la version corrigée (facultatif)" className="!w-80" />
            <Bouton variante="primaire" icone={<RotateCcw size={15} />} onClick={() => { onChange(nouvelleVersion(c, utilisateurId!, aujourdhui(), undefined, lienVersion || undefined)); setLienVersion(""); }}>
              Soumettre la version {c.version + 1}
            </Bouton>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-2 dark:border-slate-800">
        <Bouton libre taille="sm" variante="fantome" icone={<History size={14} />} onClick={() => setHistorique(!historique)}>Historique ({c.historique.length})</Bouton>
        {demandeur && c.statut === "En cours" && (
          <Bouton taille="sm" variante="fantome" className="ml-auto text-rose-600" icone={<Trash2 size={14} />} onClick={() => confirm("Annuler ce circuit de validation ?") && onChange(annuler(c, utilisateurId!, aujourdhui()))}>Annuler le circuit</Bouton>
        )}
      </div>
      {historique && (
        <ol className="space-y-2 border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800">
          {c.historique.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-20 shrink-0 text-xs text-slate-400">{formatDate(h.date)}</span>
              <span><span className="font-medium">{nom(h.personneId)}</span> · {h.action} <span className="text-xs text-slate-400">(v{h.version})</span>{h.commentaire && <span className="text-slate-500"> — « {h.commentaire} »</span>}</span>
            </li>
          ))}
        </ol>
      )}
    </Carte>
  );
}

function NouveauCircuit({ initial, onFermer, onCreer, factures, personnes }: {
  initial: CircuitValidation; onFermer: () => void; onCreer: (c: CircuitValidation) => void;
  factures: ReturnType<typeof useStore.getState>["factures"]; personnes: ReturnType<typeof useStore.getState>["personnes"];
}) {
  const d = useProjetActif();
  const { contrats, entreprises, lots } = useStore();
  const moi = useUtilisateur();
  const [c, setC] = useState(initial);
  const [ajout, setAjout] = useState("");

  const contratsProjet = contrats.filter((x) => x.projetId === c.projetId);
  const avenants = contratsProjet.flatMap((ctr) => ctr.avenants.filter((a) => a.statut === "Demandé").map((a) => ({ ctr, a })));

  const avecObjet = (x: CircuitValidation, valeur: string): CircuitValidation => {
    if (x.objet.type === "Document") {
      const doc = d.documents.find((y) => y.id === valeur);
      return { ...x, objet: { type: "Document", id: doc?.id }, titre: doc ? `${doc.nom} – indice ${doc.version}` : x.titre, url: doc?.url ?? x.url };
    }
    if (x.objet.type === "Facture") {
      const f = factures.find((y) => y.id === valeur);
      const ctr = contratsProjet.find((y) => y.id === f?.contratId);
      return { ...x, objet: { type: "Facture", id: f?.id, contratId: ctr?.id }, titre: f ? `${f.type} ${f.numero} – ${entreprises.find((e) => e.id === ctr?.entrepriseId)?.nom ?? ""}` : x.titre };
    }
    if (x.objet.type === "Avenant") {
      const y = avenants.find((z) => z.a.id === valeur);
      return { ...x, objet: { type: "Avenant", id: y?.a.id, contratId: y?.ctr.id }, titre: y ? `Avenant ${y.a.numero} ${y.ctr.numero} – ${y.a.objet}` : x.titre };
    }
    return x;
  };

  // Applique un modèle de circuit : chaque rôle est résolu vers la personne correspondante
  const avecModele = (x: CircuitValidation, i: number): CircuitValidation => {
    const m = MODELES[i];
    const ctr = contratsProjet.find((y) => y.id === x.objet.contratId);
    const respLot = lots.find((l) => l.id === ctr?.lotId)?.responsableId;
    const ids = m.roles.map((role) =>
      role === "Responsable de lot" && respLot ? respLot
        : role === "Directeur de projet" && d.projet?.directeurId ? d.projet.directeurId
          : personnes.find((p) => p.role === role)?.id,
    ).filter((y): y is string => !!y && y !== x.demandeurId);
    return { ...x, etapes: [...new Set(ids)].map((pid) => ({ id: nouvelId("et"), personneId: pid, statut: "En attente" as const })) };
  };
  const choisirObjet = (valeur: string) => setC(avecObjet(c, valeur));
  const appliquerModele = (i: number) => setC(avecModele(c, i));

  const deplacer = (i: number, sens: -1 | 1) => {
    const e = [...c.etapes];
    [e[i], e[i + sens]] = [e[i + sens], e[i]];
    setC({ ...c, etapes: e });
  };

  // Pré-remplissage à l'ouverture depuis un autre module
  useEffect(() => {
    let x = c;
    if (x.objet.id) x = avecObjet(x, x.objet.id);
    const m = MODELES.findIndex((y) => y.type === x.objet.type);
    if (m >= 0) x = avecModele(x, m);
    setC(x);
  }, []);

  return (
    <Modale ouverte large onFermer={onFermer} titre="Nouveau circuit de validation"
      pied={<>
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!c.titre || c.etapes.length === 0} onClick={() => {
          onCreer({ ...c, historique: [{ date: aujourdhui(), personneId: moi?.id ?? c.demandeurId, action: "Circuit créé", version: 1 }] });
          onFermer();
        }}>Lancer le circuit</Bouton>
      </>}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <p className="text-sm font-semibold">1. Que faut-il valider ?</p>
          <Champ libelle="Type">
            <Liste value={c.objet.type} onChange={(e) => setC({ ...c, objet: { type: e.target.value as TypeObjetValidation }, titre: "", url: undefined })}>
              {(["Document", "Facture", "Avenant", "Autre"] as const).map((t) => <option key={t}>{t}</option>)}
            </Liste>
          </Champ>
          {c.objet.type !== "Autre" && (
            <Champ libelle={c.objet.type === "Document" ? "Document du registre" : c.objet.type === "Facture" ? "Facture" : "Avenant en attente"}>
              <Liste value={c.objet.id ?? ""} onChange={(e) => choisirObjet(e.target.value)}>
                <option value="">Choisir…</option>
                {c.objet.type === "Document" && d.documents.map((x) => <option key={x.id} value={x.id}>{x.nom} (v{x.version})</option>)}
                {c.objet.type === "Facture" && factures.map((f) => {
                  const ctr = contratsProjet.find((x) => x.id === f.contratId);
                  return <option key={f.id} value={f.id}>{ctr?.numero} {f.numero} – {formatCHF(f.montantHT)} ({f.statut})</option>;
                })}
                {c.objet.type === "Avenant" && avenants.map(({ ctr, a }) => <option key={a.id} value={a.id}>{ctr.numero} {a.numero} – {a.objet}</option>)}
              </Liste>
            </Champ>
          )}
          <Champ libelle="Intitulé du circuit"><Saisie value={c.titre} onChange={(e) => setC({ ...c, titre: e.target.value })} /></Champ>
          <Champ libelle="Lien vers le document (SharePoint…)"><Saisie value={c.url ?? ""} onChange={(e) => setC({ ...c, url: e.target.value || undefined })} placeholder="https://…" /></Champ>
          <Champ libelle="Échéance"><Saisie type="date" value={c.echeance ?? ""} onChange={(e) => setC({ ...c, echeance: e.target.value || undefined })} /></Champ>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold">2. Qui valide, dans quel ordre ?</p>
          <Champ libelle="Partir d'un modèle">
            <Liste value="" onChange={(e) => e.target.value !== "" && appliquerModele(Number(e.target.value))}>
              <option value="">Choisir un modèle de circuit…</option>
              {MODELES.map((m, i) => <option key={m.nom} value={i}>{m.nom} : {m.roles.join(" → ")}</option>)}
            </Liste>
          </Champ>
          <ol className="space-y-2">
            {c.etapes.map((e, i) => {
              const p = personnes.find((x) => x.id === e.personneId);
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                  {p && <Avatar nom={p.nom} taille={24} />}
                  <div className="flex-1 leading-tight"><p className="text-sm font-medium">{p?.nom}</p><p className="text-xs text-slate-500">{p?.role}</p></div>
                  <button disabled={i === 0} onClick={() => deplacer(i, -1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button disabled={i === c.etapes.length - 1} onClick={() => deplacer(i, 1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button onClick={() => setC({ ...c, etapes: c.etapes.filter((x) => x.id !== e.id) })} className="p-1 text-slate-400 hover:text-rose-600"><X size={14} /></button>
                </li>
              );
            })}
            {c.etapes.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-700">Ajoutez au moins un validateur</li>}
          </ol>
          <div className="flex gap-2">
            <Liste value={ajout} onChange={(e) => setAjout(e.target.value)}>
              <option value="">Ajouter un validateur…</option>
              {personnes.filter((p) => !c.etapes.some((e) => e.personneId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.nom} – {p.role}</option>)}
            </Liste>
            <Bouton icone={<Pencil size={14} />} disabled={!ajout} onClick={() => { setC({ ...c, etapes: [...c.etapes, { id: nouvelId("et"), personneId: ajout, statut: "En attente" }] }); setAjout(""); }}>Ajouter</Bouton>
          </div>
          <p className="text-xs text-slate-500">Chaque validateur se prononce à son tour. Une demande de modifications renvoie le circuit au demandeur, qui soumet une nouvelle version.</p>
        </div>
      </div>
    </Modale>
  );
}
