// Configuration fonctionnelle : seuils, matrice des risques, critères de complétude, circuits de
// validation. On travaille sur un brouillon, on en mesure l'effet, puis on publie une version.
import { History, Plus, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { Alerte, Badge, Bouton, Carte, Champ, Liste, Saisie, Tableau, useLectureSeule, Zone } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { REGLES_COMPLETUDE } from "@/domaine/socle/completude";
import type { Configuration as Config, CritereCompletude, ModeleCircuit } from "@/domaine/socle/types";
import { controlerConfiguration, mesurerImpact, publier, retablir } from "@/donnees/configuration";
import { egal } from "@/donnees/diff";
import { useDepot, useDonnees } from "@/donnees/hooks";

const TYPES_OBJET = ["Document", "Facture", "Avenant", "Mutation", "Mandat", "Rapport", "Décision", "Autre"];
const nombre = (v: string) => Number(v.replace(",", ".")) || 0;

export function Configuration() {
  const depot = useDepot();
  const { configurations, personnes } = useDonnees();
  const lecture = useLectureSeule();
  const publiee = configurations.find((c) => c.id === "courante");
  const [brouillon, setBrouillon] = useState<Config | null>(null);
  const [commentaire, setCommentaire] = useState("");
  if (!publiee) return <Alerte type="info">Aucune configuration n'est installée.</Alerte>;

  const c = brouillon ?? publiee;
  const modifie = brouillon !== null && !egal({ ...brouillon, version: 0, date: "", commentaire: "", auteurId: "" }, { ...publiee, version: 0, date: "", commentaire: "", auteurId: "" });
  const maj = (patch: Partial<Config>) => setBrouillon({ ...c, ...patch });
  const erreurs = controlerConfiguration(c);
  const impact = modifie && erreurs.length === 0 ? mesurerImpact(depot, c, aujourdhui()) : null;
  const anciennes = configurations.filter((x) => x.id !== "courante").sort((a, b) => b.version - a.version);
  const majCritere = (id: string, patch: Partial<CritereCompletude>) => maj({ criteresCompletude: c.criteresCompletude.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const majCircuit = (id: string, patch: Partial<ModeleCircuit>) => maj({ circuits: c.circuits.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const liste = (cle: "competences" | "classifications", libelle: string) => (
    <Champ libelle={libelle} aide="Une valeur par ligne"><Zone rows={5} disabled={lecture} value={c[cle].join("\n")} onChange={(e) => maj({ [cle]: e.target.value.split("\n").map((x) => x.trimStart()) })} onBlur={() => maj({ [cle]: c[cle].map((x) => x.trim()).filter(Boolean) })} /></Champ>
  );
  const num = (libelle: string, valeur: number, onChange: (v: number) => void, aide?: string) => (
    <Champ libelle={libelle} aide={aide}><Saisie inputMode="decimal" className="text-right num" disabled={lecture} value={Number.isFinite(valeur) ? valeur : ""} onChange={(e) => onChange(nombre(e.target.value))} /></Champ>
  );

  const faire = (action: () => Config, message: (x: Config) => string) => {
    try { const x = action(); setBrouillon(null); setCommentaire(""); notifier(message(x), "succes"); } catch (e) { notifier(e instanceof Error ? e.message : "Opération impossible.", "erreur"); }
  };
  const variation = (libelle: string, avant: number, apres: number, unite = "") => (
    <div><dt className="text-xs text-slate-500">{libelle}</dt><dd className="mt-0.5 font-medium num">{avant}{unite} → <span className={apres === avant ? "" : "text-brand-600"}>{apres}{unite}</span></dd></div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Carte titre="Seuils" sousTitre="Finances, santé des projets, risques, conservation">
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {num("Variation d'atterrissage à commenter (%)", c.seuilVariationPct, (v) => maj({ seuilVariationPct: v }), "Au-delà, arrêter la période exige un commentaire")}
            {num("Santé : à surveiller dès (% de dépassement)", c.seuilsSante.surveiller, (v) => maj({ seuilsSante: { ...c.seuilsSante, surveiller: v } }))}
            {num("Santé : critique dès (% de dépassement)", c.seuilsSante.critique, (v) => maj({ seuilsSante: { ...c.seuilsSante, critique: v } }))}
            {num("Risque : criticité moyenne dès", c.matriceRisques.modere, (v) => maj({ matriceRisques: { ...c.matriceRisques, modere: v } }), "Score = probabilité × impact, de 1 à 25")}
            {num("Risque : criticité élevée dès", c.matriceRisques.eleve, (v) => maj({ matriceRisques: { ...c.matriceRisques, eleve: v } }))}
            {num("Risque : criticité critique dès", c.matriceRisques.critique, (v) => maj({ matriceRisques: { ...c.matriceRisques, critique: v } }))}
            {num("Revue des risques au moins tous les (jours)", c.joursRevueRisque, (v) => maj({ joursRevueRisque: v }))}
            {num("Conservation des archives (années)", c.conservationAnnees, (v) => maj({ conservationAnnees: v }))}
          </div>
        </Carte>

        <Carte titre="Critères de complétude" sousTitre="L'indice d'un projet est la part pondérée des critères actifs qu'il remplit">
          <Tableau>
            <thead><tr><th className="w-16">Actif</th><th>Critère</th><th className="w-48">Axe</th><th className="w-24 text-right">Poids</th></tr></thead>
            <tbody>{c.criteresCompletude.map((x) => (
              <tr key={x.id}>
                <td><input type="checkbox" aria-label={`Critère actif : ${x.libelle}`} disabled={lecture} className="size-4 rounded border-slate-300 text-brand-600" checked={x.actif} onChange={(e) => majCritere(x.id, { actif: e.target.checked })} /></td>
                <td><Saisie aria-label="Libellé du critère" disabled={lecture} value={x.libelle} onChange={(e) => majCritere(x.id, { libelle: e.target.value })} />{!REGLES_COMPLETUDE[x.regle] && <span className="text-xs text-rose-600">Règle « {x.regle} » inconnue : critère ignoré</span>}</td>
                <td><Liste aria-label="Axe" disabled={lecture} value={x.axe} onChange={(e) => majCritere(x.id, { axe: e.target.value as CritereCompletude["axe"] })}><option>Documentaire</option><option>Qualité des données</option></Liste></td>
                <td><Saisie aria-label="Poids" inputMode="numeric" className="text-right num" disabled={lecture} value={x.poids} onChange={(e) => majCritere(x.id, { poids: nombre(e.target.value) })} /></td>
              </tr>
            ))}</tbody>
          </Tableau>
        </Carte>

        <Carte titre="Circuits de validation et seuils de compétence" sousTitre="Le circuit proposé est le plus exigeant dont le seuil est atteint par le montant à valider"
          action={!lecture && <Bouton taille="sm" icone={<Plus size={13} />} onClick={() => maj({ circuits: [...c.circuits, { id: nouvelId("ci"), nom: "Nouveau circuit", typeObjet: "Document", mode: "sequentiel", roles: ["Directeur de projet"] }] })}>Circuit</Bouton>}>
          <Tableau>
            <thead><tr><th>Nom</th><th className="w-36">Objet</th><th className="w-36">Déroulement</th><th>Rôles, dans l'ordre</th><th className="w-36 text-right">Dès CHF</th><th className="w-10" /></tr></thead>
            <tbody>{c.circuits.map((x) => (
              <tr key={x.id}>
                <td><Saisie aria-label="Nom du circuit" disabled={lecture} value={x.nom} onChange={(e) => majCircuit(x.id, { nom: e.target.value })} /></td>
                <td><Liste aria-label="Type d'objet" disabled={lecture} value={x.typeObjet} onChange={(e) => majCircuit(x.id, { typeObjet: e.target.value })}>{TYPES_OBJET.map((t) => <option key={t}>{t}</option>)}</Liste></td>
                <td><Liste aria-label="Déroulement" disabled={lecture} value={x.mode} onChange={(e) => majCircuit(x.id, { mode: e.target.value as ModeleCircuit["mode"] })}><option value="sequentiel">Séquentiel</option><option value="parallele">Parallèle</option></Liste></td>
                <td><Saisie aria-label="Rôles" disabled={lecture} value={x.roles.join(", ")} title="Rôles ou profils, séparés par des virgules" onChange={(e) => majCircuit(x.id, { roles: e.target.value.split(",").map((r) => r.trimStart()) })} onBlur={() => majCircuit(x.id, { roles: x.roles.map((r) => r.trim()).filter(Boolean) })} /></td>
                <td><Saisie aria-label="Seuil" inputMode="numeric" className="text-right num" disabled={lecture} value={x.seuilMin ?? ""} placeholder="aucun" onChange={(e) => majCircuit(x.id, { seuilMin: nombre(e.target.value) || undefined })} /></td>
                <td>{!lecture && <button type="button" aria-label={`Supprimer le circuit ${x.nom}`} className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => maj({ circuits: c.circuits.filter((y) => y.id !== x.id) })}><Trash2 size={14} /></button>}</td>
              </tr>
            ))}</tbody>
          </Tableau>
        </Carte>

        <Carte titre="Listes de valeurs"><div className="grid gap-4 p-5 sm:grid-cols-2">{liste("competences", "Compétences (charge et capacité)")}{liste("classifications", "Classifications des projets")}</div></Carte>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
        <Carte titre={`Version ${publiee.version} en vigueur`} sousTitre={`Publiée le ${formatDate(publiee.date)}${personnes.find((p) => p.id === publiee.auteurId) ? ` par ${personnes.find((p) => p.id === publiee.auteurId)!.nom}` : ""}`}>
          <div className="space-y-3 p-4">
            {publiee.commentaire && <p className="text-sm text-slate-600 dark:text-slate-300">« {publiee.commentaire} »</p>}
            {!modifie ? <p className="text-sm text-slate-500">Modifiez un réglage : l'effet du brouillon sur les projets s'affiche ici avant toute publication.</p> : (
              <>
                <Badge couleur="orange">Brouillon non publié</Badge>
                {erreurs.length > 0 && <Alerte type="erreur"><ul className="list-disc pl-4">{erreurs.map((e) => <li key={e}>{e}</li>)}</ul></Alerte>}
                {impact && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Effet sur {impact.projets} projets</p>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {variation("Complétude moyenne", impact.completudeMoyenne.avant, impact.completudeMoyenne.apres, " %")}
                      {variation("Risques critiques", impact.risquesCritiques.avant, impact.risquesCritiques.apres)}
                      {variation("Risques à revoir", impact.risquesARevoir.avant, impact.risquesARevoir.apres)}
                      <div><dt className="text-xs text-slate-500">Santé modifiée</dt><dd className="mt-0.5 font-medium num">{impact.sante.length} projet(s)</dd></div>
                    </dl>
                    {impact.sante.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">{impact.sante.slice(0, 6).map((s) => <li key={s.code}>{s.code} : {s.avant} → {s.apres}</li>)}</ul>}
                  </div>
                )}
                <Champ libelle="Ce que cette publication change" obligatoire><Zone rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} /></Champ>
                <div className="flex gap-2">
                  <Bouton variante="primaire" className="flex-1" icone={<UploadCloud size={15} />} disabled={erreurs.length > 0 || !commentaire.trim()} onClick={() => faire(() => publier(depot, c, commentaire), (x) => `Configuration publiée : version ${x.version}.`)}>Publier</Bouton>
                  <Bouton onClick={() => { setBrouillon(null); setCommentaire(""); }}>Abandonner</Bouton>
                </div>
              </>
            )}
          </div>
        </Carte>
        <Carte titre={<span className="flex items-center gap-2"><History size={15} /> Versions précédentes</span>}>
          {anciennes.length === 0 ? <p className="px-4 py-4 text-sm text-slate-500">Aucune version précédente.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{anciennes.map((v) => (
              <li key={v.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm"><span className="font-medium">Version {v.version}</span><span className="block truncate text-xs text-slate-500">{formatDate(v.date)}{v.commentaire ? ` · ${v.commentaire}` : ""}</span></span>
                {!lecture && <Bouton taille="sm" variante="fantome" icone={<RotateCcw size={13} />} onClick={async () => { if (await confirmer({ titre: `Revenir à la version ${v.version}`, message: "Son contenu est republié comme nouvelle version : rien n'est effacé de l'historique.", action: "Rétablir" })) faire(() => retablir(depot, v.version), (x) => `Version ${v.version} rétablie (version ${x.version}).`); }}>Rétablir</Bouton>}
              </li>
            ))}</ul>
          )}
        </Carte>
      </aside>
    </div>
  );
}
