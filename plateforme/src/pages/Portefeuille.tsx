import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { projetsAccessibles } from "../lib/acces";
import { attendDe } from "../lib/validations";
import { estActif, score } from "../lib/risques";
import { AlertTriangle, CalendarClock, FileCheck2, FilePlus2, FolderKanban, ListChecks, MapPin, Plus, ShieldAlert, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../store/useStore";
import { indicateursProjet, santeProjet } from "../lib/indicateurs";
import { aujourdhui, formatCHF, formatCompact, formatDate, formatPct } from "../lib/format";
import { Badge, Bouton, Carte, Champ, EnTetePage, Indicateur, Liste, Modale, Progression, Saisie, Zone } from "../components/ui";
import type { PhaseSIA, Projet } from "../types";
import { nouvelId } from "../lib/id";
import type { DonneesDemo } from "../data/demo";

export { PHASES } from "../data/phasesSia";
import { PHASES } from "../data/phasesSia";

const COULEURS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#db2777", "#7c3aed", "#475569"];

export function Portefeuille() {
  const etat = useStore();
  const navigate = useNavigate();
  const [creation, setCreation] = useState(false);
  const jour = aujourdhui();
  const donnees = etat as unknown as DonneesDemo;

  const utilisateur = etat.personnes.find((x) => x.id === etat.utilisateurId);
  const mesProjets = projetsAccessibles(utilisateur, etat.projets);
  const idsProjets = new Set(mesProjets.map((p) => p.id));
  const lignes = mesProjets.map((p) => ({ p, i: indicateursProjet(donnees, p.id, jour) }));

  // « Mon travail » : ce qui attend l'utilisateur sur l'ensemble de ses projets
  const code = (projetId: string) => etat.projets.find((p) => p.id === projetId)?.code ?? "";
  const mesTaches = etat.actions.filter((a) => idsProjets.has(a.projetId) && a.assigneId === etat.utilisateurId && a.statut !== "Terminé")
    .sort((a, b) => (a.echeance ?? "9").localeCompare(b.echeance ?? "9"));
  const mesValidations = etat.validations.filter((v) => idsProjets.has(v.projetId) && attendDe(v, etat.utilisateurId));
  const mesRisques = etat.risques.filter((r) => idsProjets.has(r.projetId) && r.proprietaireId === etat.utilisateurId && estActif(r))
    .sort((a, b) => score(b) - score(a));
  const total = lignes.reduce(
    (t, { i }) => ({ budget: t.budget + i.totaux.budget, prevision: t.prevision + i.totaux.prevision, facture: t.facture + i.totaux.facture }),
    { budget: 0, prevision: 0, facture: 0 },
  );
  const alertes = lignes.reduce((n, { i }) => n + i.tachesEnRetard.length + i.avenantsEnAttente + i.facturesATraiter, 0);

  const ouvrir = (id: string) => { etat.setProjetActif(id); navigate("/projet"); };

  return (
    <>
      <EnTetePage
        titre={`Bonjour${utilisateur ? `, ${utilisateur.nom.split(" ")[0]}` : ""}`}
        description={`Vue d'ensemble de votre portefeuille au ${formatDate(jour)}`}
        actions={<Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setCreation(true)}>Nouveau projet</Bouton>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Projets actifs" valeur={mesProjets.length} icone={<FolderKanban size={18} />} />
        <Indicateur libelle="Budget total" valeur={formatCompact(total.budget)} detail="CHF HT" icone={<Wallet size={18} />} />
        <Indicateur libelle="Prévision finale" valeur={formatCompact(total.prevision)}
          detail={`${total.prevision > total.budget ? "+" : ""}${formatCHF(total.prevision - total.budget)} vs budget`}
          tendance={total.prevision > total.budget ? "mauvais" : "bon"} />
        <Indicateur libelle="Points d'attention" valeur={alertes} detail="retards, avenants, factures" tendance={alertes ? "alerte" : "bon"} icone={<AlertTriangle size={18} />} />
      </div>

      {(mesTaches.length > 0 || mesValidations.length > 0 || mesRisques.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Carte titre={<span className="flex items-center gap-2"><ListChecks size={16} className="text-brand-600" /> Mes tâches</span>} action={<Link to="/taches" className="text-sm text-brand-600 hover:underline">Tout voir</Link>}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {mesTaches.slice(0, 5).map((a) => (
                <li key={a.id}><button onClick={() => { etat.setProjetActif(a.projetId); navigate("/taches"); }} className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className="flex-1 truncate">{a.titre}</span>
                  <span className="text-xs text-slate-400">{code(a.projetId)}</span>
                  {a.echeance && <span className={`text-xs ${a.echeance < jour ? "font-medium text-rose-600" : "text-slate-500"}`}>{formatDate(a.echeance)}</span>}
                </button></li>
              ))}
              {mesTaches.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">Aucune tâche ouverte</li>}
            </ul>
          </Carte>
          <Carte titre={<span className="flex items-center gap-2"><FileCheck2 size={16} className="text-brand-600" /> À valider</span>} action={<Link to="/validations" className="text-sm text-brand-600 hover:underline">Tout voir</Link>}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {mesValidations.map((v) => (
                <li key={v.id}><button onClick={() => { etat.setProjetActif(v.projetId); navigate("/validations"); }} className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <Badge couleur="violet">{v.objet.type}</Badge><span className="flex-1 truncate">{v.titre}</span>
                  {v.echeance && <span className={`text-xs ${v.echeance < jour ? "font-medium text-rose-600" : "text-slate-500"}`}>{formatDate(v.echeance)}</span>}
                </button></li>
              ))}
              {mesValidations.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">Rien en attente de votre décision</li>}
            </ul>
          </Carte>
          <Carte titre={<span className="flex items-center gap-2"><ShieldAlert size={16} className="text-brand-600" /> Mes risques</span>} action={<Link to="/risques" className="text-sm text-brand-600 hover:underline">Tout voir</Link>}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {mesRisques.slice(0, 5).map((r) => (
                <li key={r.id}><button onClick={() => { etat.setProjetActif(r.projetId); navigate("/risques"); }} className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <span className={`h-2.5 w-2.5 rounded-full ${score(r) >= 15 ? "bg-rose-500" : score(r) >= 9 ? "bg-orange-500" : "bg-amber-400"}`} />
                  <span className="flex-1 truncate">{r.code} {r.titre}</span><span className="text-xs text-slate-400">{code(r.projetId)}</span>
                </button></li>
              ))}
              {mesRisques.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">Aucun risque sous votre responsabilité</li>}
            </ul>
          </Carte>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {lignes.map(({ p, i }) => {
          const ecartPct = i.totaux.budget ? (i.totaux.ecart / i.totaux.budget) * 100 : 0;
          const sante = santeProjet(ecartPct, i.tachesEnRetard.length);
          return (
            <button key={p.id} onClick={() => ouvrir(p.id)} className="group text-left">
              <Carte className="h-full p-5 transition group-hover:shadow-md group-hover:ring-brand-200">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: p.couleur }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{p.code}</span>
                      <Badge couleur={sante === "bon" ? "vert" : sante === "alerte" ? "orange" : "rouge"}>
                        {sante === "bon" ? "Sous contrôle" : sante === "alerte" ? "À surveiller" : "Critique"}
                      </Badge>
                    </div>
                    <h3 className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white">{p.nom}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} />{p.lieu} · {p.phase}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-slate-500">Budget</p><p className="num font-semibold">{formatCompact(i.totaux.budget)}</p></div>
                  <div><p className="text-xs text-slate-500">Prévision</p><p className="num font-semibold">{formatCompact(i.totaux.prevision)}</p></div>
                  <div><p className="text-xs text-slate-500">Écart</p>
                    <p className={`num font-semibold ${i.totaux.ecart < 0 ? "text-rose-600" : "text-emerald-600"}`}>{i.totaux.ecart >= 0 ? "+" : ""}{formatCompact(i.totaux.ecart)}</p></div>
                </div>
                <div className="mt-4 space-y-2.5">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Avancement planning</span><span className="num">{formatPct(i.avancement, 0)}</span></div>
                    <Progression valeur={i.avancement} couleur={p.couleur} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Facturé / prévision</span><span className="num">{formatPct(i.tauxFacturation, 0)}</span></div>
                    <Progression valeur={i.tauxFacturation} couleur="#94a3b8" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {i.tachesEnRetard.length > 0 && <Badge couleur="rouge"><CalendarClock size={12} className="mr-1" />{i.tachesEnRetard.length} tâche(s) en retard</Badge>}
                  {i.avenantsEnAttente > 0 && <Badge couleur="orange">{i.avenantsEnAttente} avenant(s) à décider</Badge>}
                  {i.facturesATraiter > 0 && <Badge couleur="bleu">{i.facturesATraiter} facture(s) à traiter</Badge>}
                  {i.aoOuverts > 0 && <Badge couleur="violet">{i.aoOuverts} AO en cours</Badge>}
                  <span className="ml-auto text-slate-400">Fin prévue {formatDate(p.dateFin)}</span>
                </div>
              </Carte>
            </button>
          );
        })}
        {mesProjets.length === 0 && (
          <Carte className="md:col-span-2">
            <div className="flex flex-col items-center py-14 text-center">
              <FilePlus2 className="text-slate-300" size={40} />
              <p className="mt-3 font-medium">Aucun projet</p>
              <p className="text-sm text-slate-500">Créez votre premier projet ou chargez les données de démonstration dans les paramètres.</p>
            </div>
          </Carte>
        )}
      </div>

      {lignes.length > 0 && (
        <Carte className="mt-6" titre="Budget et prévision par projet" sousTitre="CHF HT">
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <BarChart data={lignes.map(({ p, i }) => ({ nom: p.code, Budget: i.totaux.budget, Prévision: i.totaux.prevision, Facturé: i.totaux.facture }))} barGap={4}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="nom" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} fontSize={12} width={70} />
                <Tooltip formatter={(v) => formatCHF(Number(v))} cursor={{ fill: "rgba(99,102,241,.06)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Prévision" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Facturé" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Carte>
      )}

      {creation && <FormulaireProjet ouverte={creation} onFermer={() => setCreation(false)} onEnregistrer={(p) => { etat.ajouter("projets", p); ouvrir(p.id); }} />}
    </>
  );
}

export function FormulaireProjet({ ouverte, onFermer, onEnregistrer, initial }: { ouverte: boolean; onFermer: () => void; onEnregistrer: (p: Projet) => void; initial?: Projet }) {
  const { personnes } = useStore();
  const [p, setP] = useState<Projet>(() => initial ?? {
    id: nouvelId("prj"), code: "", nom: "", maitreOuvrage: "", lieu: "", phase: "31 Avant-projet",
    dateDebut: aujourdhui(), dateFin: aujourdhui(), tauxTVA: 8.1, couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)], description: "",
  });
  const maj = (patch: Partial<Projet>) => setP((x) => ({ ...x, ...patch }));
  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre={initial ? "Modifier le projet" : "Nouveau projet"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!p.code || !p.nom} onClick={() => { onEnregistrer(p); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid grid-cols-2 gap-4">
        <Champ libelle="Code"><Saisie value={p.code} onChange={(e) => maj({ code: e.target.value })} placeholder="RC601" /></Champ>
        <Champ libelle="Phase SIA"><Liste value={p.phase} onChange={(e) => maj({ phase: e.target.value as PhaseSIA })}>{PHASES.map((x) => <option key={x}>{x}</option>)}</Liste></Champ>
        <Champ libelle="Nom du projet" className="col-span-2"><Saisie value={p.nom} onChange={(e) => maj({ nom: e.target.value })} /></Champ>
        <Champ libelle="Maître d'ouvrage"><Saisie value={p.maitreOuvrage} onChange={(e) => maj({ maitreOuvrage: e.target.value })} /></Champ>
        <Champ libelle="Lieu"><Saisie value={p.lieu} onChange={(e) => maj({ lieu: e.target.value })} /></Champ>
        <Champ libelle="Début"><Saisie type="date" value={p.dateDebut} onChange={(e) => maj({ dateDebut: e.target.value })} /></Champ>
        <Champ libelle="Fin"><Saisie type="date" value={p.dateFin} onChange={(e) => maj({ dateFin: e.target.value })} /></Champ>
        <Champ libelle="Directeur de projet">
          <Liste value={p.directeurId ?? ""} onChange={(e) => maj({ directeurId: e.target.value || undefined })}>
            <option value="">—</option>
            {personnes.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Taux de TVA (%)"><Saisie type="number" step="0.1" value={p.tauxTVA} onChange={(e) => maj({ tauxTVA: Number(e.target.value) })} /></Champ>
        <Champ libelle="Dossier SharePoint" aide="Chemin relatif au dossier racine configuré" className="col-span-2">
          <Saisie value={p.dossierSharePoint ?? ""} onChange={(e) => maj({ dossierSharePoint: e.target.value })} placeholder={p.code || "RC601"} />
        </Champ>
        <Champ libelle="Description" className="col-span-2"><Zone rows={3} value={p.description} onChange={(e) => maj({ description: e.target.value })} /></Champ>
        <Champ libelle="Couleur" className="col-span-2">
          <div className="flex gap-2">{COULEURS.map((c) => (
            <button key={c} type="button" onClick={() => maj({ couleur: c })} className={`h-7 w-7 rounded-full ring-offset-2 ${p.couleur === c ? "ring-2 ring-slate-400" : ""}`} style={{ background: c }} />
          ))}</div>
        </Champ>
      </div>
    </Modale>
  );
}
