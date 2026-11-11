// Constats de chantier : ce qui a été vu, où, quand, en présence de qui, photographies à l'appui.
// Un constat peut déboucher sur une réserve, une tâche ou un risque, qui gardent le lien.
import { Camera, ClipboardCheck, Download, ListChecks, Plus, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { LienProjet } from "@/app/chemins";
import { notifier } from "@/app/etatUI";
import { useSuppression } from "@/app/suppression";
import { Badge, Bouton, Carte, Champ, Liste, Panneau, Saisie, useLectureSeule, Vide, Zone, type CouleurBadge } from "@/app/ui";
import { numeroSuivant, suitesConstat, TYPES_CONSTAT } from "@/domaine/lib/chantier";
import { ajouterJours, aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { Constat } from "@/domaine/types-chantier";
import { useDonnees, useDroit, useProjet, useUtilisateur } from "@/donnees/hooks";
import { exporterConstat } from "./exportChantier";
import { enIds, Photos, Vignette } from "./Photos";

const COULEUR_TYPE: Record<Constat["type"], CouleurBadge> = { "Qualité": "orange", "Sécurité": "rouge", Environnement: "vert", Avancement: "bleu", "État des lieux": "violet", Autre: "gris" };

export function Constats({ creer, onCree }: { creer?: boolean; onCree?: () => void }) {
  const d = useProjet();
  const { entreprises, ajouter, modifier } = useDonnees();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [edition, setEdition] = useState<Constat | null>(null);
  const [type, setType] = useState("");
  const [recherche, setRecherche] = useState("");
  const [demande, setDemande] = useState(creer);
  if (!d.projet) return null;
  const projet = d.projet;
  const existe = (c: Constat) => d.constats.some((x) => x.id === c.id);
  const nouveau = (): Constat => ({ id: nouvelId("cst"), projetId: projet.id, numero: numeroSuivant(d.constats, "CT"), date: aujourdhui(), type: "Qualité", titre: "", description: "", photos: [], auteurId: utilisateur?.id });
  // Saisie rapide demandée depuis l'en-tête de la page (téléphone)
  if (demande && !edition && !lecture) { setDemande(false); setEdition(nouveau()); onCree?.(); }

  const termes = recherche.toLowerCase().split(/\s+/).filter(Boolean);
  const liste = [...d.constats]
    .filter((c) => (!type || c.type === type) && termes.every((t) => `${c.numero} ${c.titre} ${c.description} ${c.localisation ?? ""}`.toLowerCase().includes(t)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero));
  const bouton = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition(nouveau())}>Constat</Bouton>;

  return (
    <>
      <Carte titre="Constats" sousTitre={`${d.constats.length} constat(s) · ${d.constats.reduce((t, c) => t + c.photos.length, 0)} photographie(s)`}
        action={<div className="flex flex-wrap items-center justify-end gap-2">
          {d.constats.length > 0 && <>
            <div className="relative hidden w-48 sm:block"><Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" /><Saisie libre className="pl-8" placeholder="Filtrer…" aria-label="Filtrer les constats" value={recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
            <div className="w-40"><Liste libre aria-label="Type de constat" value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous les types</option>{TYPES_CONSTAT.map((t) => <option key={t}>{t}</option>)}</Liste></div>
          </>}
          {bouton}
        </div>}>
        {d.constats.length === 0 ? <Vide icone={<Camera size={22} />} titre="Aucun constat" texte="Un défaut, une situation dangereuse, un état des lieux avant travaux : décrivez, photographiez, et donnez la suite — réserve, tâche ou risque." action={bouton} />
          : liste.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Aucun constat ne correspond au filtre.</p> : (
            <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {liste.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setEdition(c)} className="flex h-full w-full flex-col overflow-hidden rounded-xl text-left ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-300 dark:ring-slate-700">
                    {c.photos[0] ? <Vignette fichierId={c.photos[0].fichierId} legende={c.photos[0].legende} className="w-full !rounded-none ring-0" /> : <span className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-slate-300 dark:bg-slate-800"><Camera size={28} /></span>}
                    <span className="flex flex-1 flex-col gap-1.5 p-3">
                      <span className="flex items-center gap-2 text-xs text-slate-500"><span className="num font-medium">{c.numero}</span><span>{formatDate(c.date)}</span>{c.photos.length > 1 && <span className="ml-auto">{c.photos.length} photos</span>}</span>
                      <span className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-white">{c.titre}</span>
                      {c.localisation && <span className="truncate text-xs text-slate-500">{c.localisation}</span>}
                      <span className="mt-auto flex flex-wrap gap-1 pt-1"><Badge couleur={COULEUR_TYPE[c.type]}>{c.type}</Badge>{suitesConstat(c).map((s) => <Badge key={s} couleur="gris">{s}</Badge>)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Carte>
      {edition && <EditeurConstat key={edition.id} initial={edition} nouveau={!existe(edition)} onFermer={() => setEdition(null)}
        onEnregistrer={(c, fermer) => {
          if (existe(c)) modifier("constats", c.id, c); else ajouter("constats", c);
          setEdition(fermer ? null : c);
        }}
        nomEntreprise={(id) => entreprises.find((e) => e.id === id)?.nom} />}
    </>
  );
}

function EditeurConstat({ initial, nouveau, onFermer, onEnregistrer, nomEntreprise }: { initial: Constat; nouveau: boolean; onFermer: () => void; onEnregistrer: (c: Constat, fermer: boolean) => void; nomEntreprise: (id?: string) => string | undefined }) {
  const d = useProjet();
  const { entreprises, personnes, ajouter, modifier, grouper } = useDonnees();
  const utilisateur = useUtilisateur();
  const supprimer = useSuppression();
  const lecture = useLectureSeule();
  const droitTaches = useDroit("taches"), droitRisques = useDroit("risques");
  const [c, setC] = useState(initial);
  const [manque, setManque] = useState(false);
  const maj = (patch: Partial<Constat>) => setC((x) => ({ ...x, ...patch }));
  const propre = (): Constat => ({ ...c, titre: c.titre.trim(), localisation: c.localisation?.trim() || undefined, partiesPresentes: c.partiesPresentes?.trim() || undefined, lotId: c.lotId || undefined, entrepriseId: c.entrepriseId || undefined });
  const valide = () => { const ok = !!c.titre.trim() && !!c.date; setManque(!ok); return ok; };
  const enregistrer = () => { if (valide()) onEnregistrer(propre(), true); };

  // Une suite crée l'objet lié et inscrit le lien sur le constat, en une seule opération annulable
  const suite = (libelle: string, creer: (base: Constat) => Partial<Constat>) => {
    if (!valide()) return;
    const base = propre();
    const fait = grouper(`${libelle} depuis le constat ${base.numero}`, () => {
      if (nouveau) ajouter("constats", base);
      const lien = creer(base);
      const complet = { ...base, ...lien };
      modifier("constats", base.id, nouveau ? lien : complet);
      return complet;
    });
    if (fait) { setC(fait); onEnregistrer(fait, false); notifier(`${libelle} : fait.`, "succes"); }
  };
  const creerReserve = () => suite("Réserve créée", (b) => {
    const id = nouvelId("res");
    ajouter("reserves", { id, projetId: b.projetId, numero: numeroSuivant(d.reserves, "R"), libelle: b.titre, description: b.description || undefined, localisation: b.localisation, lotId: b.lotId, entrepriseId: b.entrepriseId, gravite: "Mineure", statut: "Ouverte", dateConstat: b.date, delai: ajouterJours(b.date, 30), constatId: b.id, photos: enIds(b.photos) });
    return { reserveId: id };
  });
  const creerTache = () => suite("Tâche créée", (b) => {
    const id = nouvelId("act");
    ajouter("actions", { id, projetId: b.projetId, titre: `Suite du constat ${b.numero} : ${b.titre}`, description: b.description || undefined, statut: "À faire", priorite: b.type === "Sécurité" ? "Haute" : "Normale", echeance: ajouterJours(aujourdhui(), 7), dateCreation: aujourdhui(), origine: "Constat de chantier", creeParId: utilisateur?.id, assigneId: utilisateur?.id, lotId: b.lotId });
    return { actionId: id };
  });
  const creerRisque = () => suite("Risque inscrit au registre", (b) => {
    const id = nouvelId("rsk");
    ajouter("risques", { id, projetId: b.projetId, code: `R-${String(d.risques.length + 1).padStart(2, "0")}`, titre: b.titre, description: b.description, categorie: b.type === "Sécurité" ? "Sécurité" : b.type === "Environnement" ? "Environnement" : "Technique", probabilite: 3, impact: 3, impactFinancier: 0, statut: "Ouvert", mesures: "", dateIdentification: b.date, lotId: b.lotId, proprietaireId: utilisateur?.id });
    return { risqueId: id };
  });

  const reserve = d.reserves.find((r) => r.id === c.reserveId), action = d.actions.find((a) => a.id === c.actionId), risque = d.risques.find((r) => r.id === c.risqueId);
  const auteur = personnes.find((p) => p.id === c.auteurId)?.nom;

  return (
    <Panneau ouverte large onFermer={onFermer} titre={nouveau ? "Nouveau constat" : `Constat ${c.numero}`}
      pied={<>
        {!nouveau && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={async () => { if (await supprimer("constats", c.id, { quoi: "le constat", message: "Le constat est retiré ; la réserve, la tâche ou le risque qui en sont issus sont conservés." })) onFermer(); }}>Supprimer</Bouton>}
        {!nouveau && <Bouton libre icone={<Download size={14} />} onClick={() => void exporterConstat(d.projet!, propre(), { entreprise: nomEntreprise(c.entrepriseId), lot: d.lots.find((l) => l.id === c.lotId)?.nom, auteur })}>Word</Bouton>}
        <Bouton libre onClick={onFermer}>{lecture ? "Fermer" : "Annuler"}</Bouton>
        <Bouton variante="primaire" onClick={enregistrer}>Enregistrer</Bouton>
      </>}>
      <div className="space-y-5">
        <section>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Photographies</h4>
          <Photos photos={c.photos} projetId={c.projetId} legendes onChange={lecture ? undefined : (photos) => maj({ photos })} />
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Ce qui est constaté" obligatoire aide={manque && !c.titre.trim() ? "Champ obligatoire" : undefined} className="sm:col-span-2"><Saisie value={c.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder="Ex. Enrobage insuffisant des armatures, radier du regard R12" aria-invalid={(manque && !c.titre.trim()) || undefined} /></Champ>
          <Champ libelle="Type"><Liste value={c.type} onChange={(e) => maj({ type: e.target.value as Constat["type"] })}>{TYPES_CONSTAT.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
          <Champ libelle="Date" obligatoire><Saisie type="date" value={c.date} max={aujourdhui()} onChange={(e) => maj({ date: e.target.value })} /></Champ>
          <Champ libelle="Description" className="sm:col-span-2"><Zone rows={4} value={c.description} onChange={(e) => maj({ description: e.target.value })} placeholder="Faits observés, mesures relevées, référence au plan ou à la norme" /></Champ>
          <Champ libelle="Localisation"><Saisie value={c.localisation ?? ""} onChange={(e) => maj({ localisation: e.target.value })} placeholder="Axe, profil, ouvrage, niveau" /></Champ>
          <Champ libelle="Parties présentes"><Saisie value={c.partiesPresentes ?? ""} onChange={(e) => maj({ partiesPresentes: e.target.value })} placeholder="Direction des travaux, contremaître…" /></Champ>
          <Champ libelle="Lot"><Liste value={c.lotId ?? ""} onChange={(e) => maj({ lotId: e.target.value || undefined })}><option value="">—</option>{d.lots.map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}</Liste></Champ>
          <Champ libelle="Entreprise concernée"><Liste value={c.entrepriseId ?? ""} onChange={(e) => maj({ entrepriseId: e.target.value || undefined })}><option value="">—</option>{[...entreprises].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}</Liste></Champ>
        </div>

        <section className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Suites données</h4>
          <p className="mb-3 text-xs text-slate-500">Le constat décrit ; la suite engage. Chaque suite garde le lien vers ce constat.</p>
          <ul className="space-y-2 text-sm">
            <li className="flex flex-wrap items-center gap-2"><ClipboardCheck size={15} className="text-slate-400" />
              {reserve ? <><span>Réserve <strong className="num">{reserve.numero}</strong> · {reserve.statut}</span><LienProjet to="/chantier?onglet=reserves" className="text-brand-600 hover:underline">Voir les réserves</LienProjet></> : <><span className="flex-1 text-slate-500">Un défaut que l'entreprise doit corriger</span>{!lecture && <Bouton taille="sm" onClick={creerReserve}>Créer une réserve</Bouton>}</>}</li>
            <li className="flex flex-wrap items-center gap-2"><ListChecks size={15} className="text-slate-400" />
              {action ? <><span>Tâche « {action.titre} » · {action.statut}</span><LienProjet to="/taches" className="text-brand-600 hover:underline">Voir les tâches</LienProjet></> : <><span className="flex-1 text-slate-500">Une action à mener par l'équipe de projet</span>{!lecture && droitTaches.ecrire && <Bouton taille="sm" onClick={creerTache}>Créer une tâche</Bouton>}</>}</li>
            <li className="flex flex-wrap items-center gap-2"><ShieldAlert size={15} className="text-slate-400" />
              {risque ? <><span>Risque <strong className="num">{risque.code}</strong> · {risque.statut}</span><LienProjet to="/risques" className="text-brand-600 hover:underline">Voir les risques</LienProjet></> : <><span className="flex-1 text-slate-500">Une menace pour les coûts, les délais ou la sécurité</span>{!lecture && droitRisques.ecrire && <Bouton taille="sm" onClick={creerRisque}>Inscrire un risque</Bouton>}</>}</li>
          </ul>
        </section>
        {auteur && <p className="text-xs text-slate-400">Constat dressé par {auteur}.</p>}
      </div>
    </Panneau>
  );
}
