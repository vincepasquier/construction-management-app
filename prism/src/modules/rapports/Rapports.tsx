import { Commentaires } from "@/modules/collaboration/Commentaires";
// Rapports de phase et de clôture du projet, avec son indice de complétude.
import { ClipboardList, Download, ExternalLink, Plus, Send } from "lucide-react";
import { useState } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { Alerte, Badge, Bouton, Carte, Champ, EnTetePage, Liste, Panneau, Saisie, Tableau, useLectureSeule, Vide, Zone, type CouleurBadge } from "@/app/ui";
import { aujourdhui, formatCHF, formatDate, formatPct } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { accesDe } from "@/domaine/socle/droits";
import { changerStatut, indicateursFiges, rapportVide, rubriques, rubriquesVides } from "@/domaine/socle/rapports";
import type { Appreciation, Rapport, StatutRapport } from "@/domaine/socle/types";
import { completudeProjet, useCompletude } from "@/donnees/gouvernance";
import { useActions, useDepot, useDoc, useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { indicateursProjet } from "@/donnees/lectures";
import type { Bloc } from "@/outils/docx";
import { telechargerDocx } from "@/outils/telechargement";
import { BoutonIA } from "../assistant/BoutonIA";
import { CarteCompletude } from "./Completude";

const COULEUR: Record<StatutRapport, CouleurBadge> = { Brouillon: "gris", "En revue": "orange", "Validé": "vert", "Refusé": "rouge" };
const NIVEAUX: Appreciation["niveau"][] = ["Exemplaire", "Conforme", "À améliorer", "Insuffisant"];
const COULEUR_NIVEAU: Record<Appreciation["niveau"], CouleurBadge> = { Exemplaire: "vert", Conforme: "bleu", "À améliorer": "orange", Insuffisant: "rouge" };

export function Rapports() {
  const depot = useDepot();
  const { projet, rapports, appreciations } = useProjet();
  const { personnes } = useDonnees();
  const { ajouter, modifier, supprimer } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const type = useDoc("typesProjet", projet?.typeProjetId);
  const jour = aujourdhui();
  const completude = useCompletude(projet, jour);
  const [ouvert, setOuvert] = useState<Rapport | null>(null);
  const [appreciation, setAppreciation] = useState<Appreciation | null>(null);
  if (!projet || !completude) return null;

  const profil = utilisateur ? accesDe(utilisateur).profil : undefined;
  const valideur = profil === "PMO" || profil === "Direction" || profil === "Administrateur";
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "—";
  const liste = [...rapports].sort((a, b) => b.date.localeCompare(a.date));
  const phases = type?.phases ?? [];

  const creer = (typeRapport: Rapport["type"], phase?: string) => {
    const i = indicateursProjet(depot, projet, jour);
    const s = i.synthese;
    const version = Math.max(0, ...rapports.filter((r) => r.type === typeRapport && r.phase === (typeRapport === "Phase" ? phase : undefined)).map((r) => r.version)) + 1;
    const r = rapportVide({
      id: nouvelId("rap"), projetId: projet.id, type: typeRapport, phase, version, auteurId: utilisateur?.id, date: jour,
      // Les rubriques chiffrées partent des valeurs du jour : il reste à les commenter
      preremplissage: {
        finances: `Budget approuvé ${formatCHF(s.budgetApprouve)}, engagé ${formatCHF(s.engage)}, réalisé ${formatCHF(s.realise)}. Atterrissage ${formatCHF(s.atterrissage)}, soit un écart de ${formatCHF(s.ecart)} (${formatPct(s.ecartPct)}).`,
        planning: `Avancement ${formatPct(i.avancement, 0)}.${i.retards.length ? ` ${i.retards.length} tâche(s) en retard : ${i.retards.slice(0, 3).map((t) => t.nom).join(", ")}.` : " Aucune tâche en retard."}${i.prochainJalon ? ` Prochain jalon : ${i.prochainJalon.nom} le ${formatDate(i.prochainJalon.fin)}.` : ""}`,
        risques: `${i.risquesOuverts} risque(s) ouvert(s), dont ${i.risquesCritiques} critique(s).`,
      },
    });
    ajouter("rapports", r);
    setOuvert(r);
  };

  const transition = (r: Rapport, vers: StatutRapport) => {
    try {
      const i = indicateursProjet(depot, projet, jour);
      const figes = vers === "En revue" ? indicateursFiges(i.synthese, { avancement: i.avancement, retards: i.retards.length, risquesOuverts: i.risquesOuverts, risquesCritiques: i.risquesCritiques, completude: completudeProjet(depot, projet, jour).indice, date: jour }) : undefined;
      const suivant = changerStatut(r, vers, figes);
      modifier("rapports", r.id, suivant, { libelle: `${r.titre} : ${vers.toLowerCase()}` });
      setOuvert(suivant);
      notifier(`${r.titre} : ${vers.toLowerCase()}.`, "succes");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Opération impossible.", "erreur");
    }
  };

  const exporter = (r: Rapport) => {
    const blocs: Bloc[] = [
      { type: "titre", texte: r.titre },
      { type: "champs", lignes: [["Projet", `${projet.code} – ${projet.nom}`], ["Version", `${r.version} (${r.statut})`], ["Date", formatDate(r.date)], ["Auteur", nom(r.auteurId)], ...(r.decision ? [["Décision", r.decision] as [string, string]] : [])] },
      ...(r.indicateurs ? [{ type: "sousTitre", texte: "Indicateurs du projet" } as Bloc, { type: "tableau", entetes: ["Indicateur", "Valeur"], largeurs: [2, 1], lignes: Object.entries(r.indicateurs).map(([k, v]) => [k, typeof v === "number" ? v.toLocaleString("fr-CH") : String(v)]) } as Bloc] : []),
      ...(r.documentUrl ? [{ type: "paragraphe", texte: `Rapport déposé : ${r.documentNom ?? r.documentUrl} (${r.documentUrl})` } as Bloc] : []),
      ...r.sections.flatMap((s) => [{ type: "sousTitre", texte: s.titre } as Bloc, { type: "paragraphe", texte: s.texte } as Bloc]),
    ];
    void telechargerDocx(`${r.titre} ${projet.code} v${r.version}`, blocs, `${r.titre} · ${projet.code}`);
  };

  const editable = (r: Rapport) => !lecture && r.statut === "Brouillon";
  const majOuvert = (patch: Partial<Rapport>) => ouvert && setOuvert({ ...ouvert, ...patch });
  const enregistrer = () => { if (ouvert) { modifier("rapports", ouvert.id, ouvert); notifier("Rapport enregistré.", "succes"); } };
  const menuCreation = !lecture && (
    <div className="flex flex-wrap gap-2">
      <div className="w-64"><Liste aria-label="Nouveau rapport de phase" value="" onChange={(e) => e.target.value && creer("Phase", e.target.value)}>
        <option value="">+ Rapport de phase…</option>{phases.filter((p) => p !== "Clôture").map((p) => <option key={p} value={p}>{p}</option>)}
      </Liste></div>
      <Bouton icone={<Plus size={15} />} onClick={() => creer("Clôture")}>Rapport de clôture</Bouton>
    </div>
  );

  return (
    <>
      <EnTetePage titre="Rapports" description="Rapports de phase et de clôture, appréciation et indice de complétude du projet" actions={menuCreation} />
      <div className="space-y-6">
        <CarteCompletude c={completude} />

        <Carte titre="Rapports du projet">
          {liste.length === 0 ? <Vide icone={<ClipboardList size={22} />} titre="Aucun rapport" texte="Un rapport est attendu à la fin de chaque phase, puis à la clôture du projet. Les rubriques chiffrées sont préremplies avec les valeurs du jour." /> : (
            <Tableau>
              <thead><tr><th>Rapport</th><th>Version</th><th>Date</th><th>Auteur</th><th>Statut</th><th /></tr></thead>
              <tbody>{liste.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => setOuvert(r)}>
                  <td className="font-medium">{r.titre}{r.documentUrl && <span className="ml-2 text-xs font-normal text-slate-500">document déposé</span>}</td>
                  <td className="num">v{r.version}</td><td>{formatDate(r.date)}</td><td>{nom(r.auteurId)}</td>
                  <td><Badge couleur={COULEUR[r.statut]}>{r.statut}</Badge></td>
                  <td className="text-right" onClick={(e) => e.stopPropagation()}><Bouton libre taille="sm" variante="fantome" icone={<Download size={13} />} onClick={() => exporter(r)}>Word</Bouton></td>
                </tr>
              ))}</tbody>
            </Tableau>
          )}
        </Carte>

        <Carte titre="Appréciation du projet" sousTitre="Jugement motivé d'un responsable habilité — jamais calculé"
          action={valideur && !lecture && <Bouton taille="sm" icone={<Plus size={13} />} onClick={() => setAppreciation({ id: nouvelId("app"), projetId: projet.id, auteurId: utilisateur?.id, date: jour, niveau: "Conforme", texte: "" })}>Appréciation</Bouton>}>
          {appreciations.length === 0 ? <p className="px-5 py-6 text-center text-sm text-slate-500">Aucune appréciation n'a été portée sur ce projet.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...appreciations].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Badge couleur={COULEUR_NIVEAU[a.niveau]}>{a.niveau}</Badge>{formatDate(a.date)} · {nom(a.auteurId)}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{a.texte}</p>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      {ouvert && (
        <Panneau ouverte large onFermer={() => setOuvert(null)} titre={<span className="flex items-center gap-2">{ouvert.titre} <span className="text-sm font-normal text-slate-500">v{ouvert.version}</span> <Badge couleur={COULEUR[ouvert.statut]}>{ouvert.statut}</Badge></span>}
          pied={<>
            {editable(ouvert) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={async () => { if (await confirmer({ message: "Supprimer ce brouillon de rapport ?", action: "Supprimer", danger: true })) { supprimer("rapports", ouvert.id); setOuvert(null); } }}>Supprimer</Bouton>}
            <Bouton libre icone={<Download size={15} />} onClick={() => exporter(ouvert)}>Word</Bouton>
            {editable(ouvert) && <Bouton onClick={enregistrer}>Enregistrer</Bouton>}
            {editable(ouvert) && <Bouton variante="primaire" icone={<Send size={15} />} onClick={() => { modifier("rapports", ouvert.id, ouvert); transition(ouvert, "En revue"); }}>Soumettre à la revue</Bouton>}
            {ouvert.statut === "En revue" && valideur && !lecture && <><Bouton onClick={() => transition(ouvert, "Brouillon")}>Renvoyer en brouillon</Bouton><Bouton variante="danger" onClick={() => transition(ouvert, "Refusé")}>Refuser</Bouton><Bouton variante="primaire" onClick={() => transition(ouvert, "Validé")}>Valider</Bouton></>}
            {ouvert.statut === "Refusé" && !lecture && <Bouton onClick={() => transition(ouvert, "Brouillon")}>Reprendre en brouillon</Bouton>}
          </>}>
          <div className="space-y-5">
            {ouvert.statut === "En revue" && !valideur && <Alerte type="info">Ce rapport attend la revue du PMO ou de la direction.</Alerte>}
            {editable(ouvert) && rubriquesVides(ouvert).length > 0 && <Alerte>À compléter avant la soumission : {rubriquesVides(ouvert).join(", ")}. Vous pouvez aussi déposer un rapport existant ci-dessous.</Alerte>}
            {ouvert.indicateurs && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-4 dark:bg-slate-800/50">
                {Object.entries(ouvert.indicateurs).map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium num">{typeof v === "number" ? v.toLocaleString("fr-CH") : k === "Valeurs au" ? formatDate(v) : v}</dd></div>)}
              </dl>
            )}
            <div className="grid gap-3 rounded-xl ring-1 ring-slate-200 p-4 sm:grid-cols-2 dark:ring-slate-800">
              <p className="text-xs text-slate-500 sm:col-span-2">Rapport rédigé ailleurs ? Indiquez son adresse (SharePoint) : il tient lieu de rubriques.</p>
              <Champ libelle="Nom du document"><Saisie disabled={!editable(ouvert)} value={ouvert.documentNom ?? ""} onChange={(e) => majOuvert({ documentNom: e.target.value })} /></Champ>
              <Champ libelle="Adresse du document"><div className="flex gap-2"><Saisie disabled={!editable(ouvert)} value={ouvert.documentUrl ?? ""} placeholder="https://…" onChange={(e) => majOuvert({ documentUrl: e.target.value })} />{ouvert.documentUrl && <a href={ouvert.documentUrl} target="_blank" rel="noreferrer" className="flex items-center px-1 text-brand-600" aria-label="Ouvrir le document"><ExternalLink size={16} /></a>}</div></Champ>
            </div>
            {ouvert.sections.map((s) => (
              <Champ key={s.cle} libelle={s.titre} aide={editable(ouvert) ? rubriques(ouvert.type).find((x) => x.cle === s.cle)?.aide : undefined}>
                <Zone rows={4} disabled={!editable(ouvert)} value={s.texte} onChange={(e) => majOuvert({ sections: ouvert.sections.map((x) => (x.cle === s.cle ? { ...x, texte: e.target.value } : x)) })} />
              </Champ>
            ))}
            {editable(ouvert) && <BoutonIA question={`Rédige une proposition pour chaque rubrique du « ${ouvert.titre} » du projet, à partir des données du projet : ${ouvert.sections.map((s) => s.titre).join(" ; ")}. Reste factuel et signale ce que tu ne peux pas déduire des données.`}>Proposer un texte avec l'IA</BoutonIA>}
            <Commentaires compact cible={{ collection: "rapports", id: ouvert.id }} projetId={projet.id} titre="Échanges sur le rapport" />
            {ouvert.statut !== "Brouillon" && <Champ libelle="Décision ou remarque du valideur"><Zone rows={2} disabled={!valideur || lecture} value={ouvert.decision ?? ""} onChange={(e) => majOuvert({ decision: e.target.value })} onBlur={() => modifier("rapports", ouvert.id, { decision: ouvert.decision })} /></Champ>}
          </div>
        </Panneau>
      )}

      {appreciation && (
        <Panneau ouverte onFermer={() => setAppreciation(null)} titre="Appréciation du projet"
          pied={<><Bouton libre onClick={() => setAppreciation(null)}>Annuler</Bouton><Bouton variante="primaire" disabled={!appreciation.texte.trim()} onClick={() => { ajouter("appreciations", appreciation); setAppreciation(null); }}>Enregistrer</Bouton></>}>
          <div className="space-y-4">
            <Champ libelle="Appréciation"><Liste value={appreciation.niveau} onChange={(e) => setAppreciation({ ...appreciation, niveau: e.target.value as Appreciation["niveau"] })}>{NIVEAUX.map((n) => <option key={n}>{n}</option>)}</Liste></Champ>
            <Champ libelle="Motivation" obligatoire aide="Ce qui fonde l'appréciation : conduite du projet, tenue des objectifs, qualité du dossier."><Zone rows={5} value={appreciation.texte} onChange={(e) => setAppreciation({ ...appreciation, texte: e.target.value })} /></Champ>
          </div>
        </Panneau>
      )}
    </>
  );
}
