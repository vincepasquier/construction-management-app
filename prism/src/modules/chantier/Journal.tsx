// Journal de chantier : une entrée par jour (météo, effectifs, travaux, événements, photos).
// Passé le délai de correction, la journée se verrouille et devient une pièce du dossier.
import { CalendarPlus, CloudRain, CloudSnow, Cloudy, Download, Lock, LockOpen, Plus, Snowflake, Sun, Trash2, Users, Wind } from "lucide-react";
import { useState, type ReactNode } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { useSuppression } from "@/app/suppression";
import { Alerte, Badge, Bouton, Carte, Champ, cx, LectureSeule, Liste, Panneau, Saisie, useLectureSeule, Vide, Zone, type CouleurBadge } from "@/app/ui";
import { aVerrouiller, bilanJournal, effectifTotal, INTEMPERIES, joursSansEntree, METEOS, nouvelleEntree, TYPES_EVENEMENT } from "@/domaine/lib/chantier";
import { ajouterJours, aujourdhui, formatDate, moisDe, moisEnClair } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { EntreeJournalChantier, EvenementChantier } from "@/domaine/types-chantier";
import { useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { exporterJournal } from "./exportChantier";
import { enIds, enPhotos, Photos } from "./Photos";

const ICONE_METEO: Record<EntreeJournalChantier["meteo"], ReactNode> = { Beau: <Sun size={16} />, Nuageux: <Cloudy size={16} />, Pluie: <CloudRain size={16} />, Neige: <CloudSnow size={16} />, Gel: <Snowflake size={16} />, "Vent fort": <Wind size={16} /> };
const COULEUR_EVENEMENT: Record<EvenementChantier["type"], CouleurBadge> = { Livraison: "bleu", Visite: "gris", Incident: "rouge", "Sécurité": "orange", "Arrêt": "rouge", Autre: "gris" };
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const jourSemaine = (iso: string) => JOURS[new Date(`${iso}T12:00:00Z`).getUTCDay()];

export function Journal() {
  const d = useProjet();
  const { entreprises, ajouter, modifier, grouper } = useDonnees();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [edition, setEdition] = useState<EntreeJournalChantier | null>(null);
  const [mois, setMois] = useState("");
  if (!d.projet) return null;
  const projet = d.projet;
  const jour = aujourdhui();
  const entrees = [...d.journalChantier].sort((a, b) => b.date.localeCompare(a.date));
  const moisPresents = [...new Set(entrees.map((e) => moisDe(e.date)))];
  const affichees = mois ? entrees.filter((e) => moisDe(e.date) === mois) : entrees.slice(0, 40);
  const bilan = bilanJournal(mois ? affichees : entrees.filter((e) => moisDe(e.date) === moisDe(jour)));
  // Jours ouvrés manquants sur les dix derniers jours, à partir de la première entrée du journal
  const premier = entrees.at(-1)?.date;
  const manquants = premier ? joursSansEntree(entrees, premier > ajouterJours(jour, -10) ? premier : ajouterJours(jour, -10), ajouterJours(jour, -1)) : [];
  const anciennes = aVerrouiller(entrees, jour);
  const entreprisesProjet = [...new Set(d.contrats.map((c) => entreprises.find((e) => e.id === c.entrepriseId)?.nom).filter((n): n is string => !!n))].sort();

  const ouvrir = (date: string) => setEdition(entrees.find((e) => e.date === date) ?? nouvelleEntree(entrees, { id: nouvelId("jc"), projetId: projet.id, date, auteurId: utilisateur?.id }));
  const existe = (e: EntreeJournalChantier) => d.journalChantier.some((x) => x.id === e.id);

  const verrouillerAnciennes = async () => {
    if (!(await confirmer({ titre: `Verrouiller ${anciennes.length} journée(s)`, message: "Une journée verrouillée ne se modifie plus. Seul un administrateur peut la rouvrir, avec un motif.", action: "Verrouiller" }))) return;
    grouper(`Verrouillage de ${anciennes.length} journée(s) du journal de chantier`, () => { for (const e of anciennes) modifier("journalChantier", e.id, { verrouillee: true }); });
  };

  const boutonJour = !lecture && <Bouton variante="primaire" icone={<CalendarPlus size={15} />} onClick={() => ouvrir(jour)}>{entrees.some((e) => e.date === jour) ? "Journée d'aujourd'hui" : "Saisir aujourd'hui"}</Bouton>;

  return (
    <div className="space-y-5">
      {!lecture && manquants.length > 0 && (
        <Alerte>
          <span className="font-medium">{manquants.length} jour(s) ouvré(s) sans entrée sur les dix derniers jours : </span>
          {manquants.map((j, i) => <span key={j}>{i > 0 && ", "}<button type="button" className="underline decoration-dotted hover:decoration-solid" onClick={() => ouvrir(j)}>{jourSemaine(j)} {formatDate(j)}</button></span>)}
        </Alerte>
      )}
      <Carte titre="Journal de chantier" sousTitre={<><span className="capitalize">{moisEnClair(mois || moisDe(jour))}</span> · {bilan.jours} jour(s) saisi(s) · effectif moyen {bilan.effectifMoyen}<span className="hidden sm:inline"> · {bilan.joursIntemperies} jour(s) d'intempéries{bilan.arrets ? ` · ${bilan.arrets} arrêt(s)` : ""}</span></>}
        action={<div className="flex flex-wrap items-center justify-end gap-2">
          {moisPresents.length > 0 && <div className="hidden w-48 sm:block"><Liste libre aria-label="Mois affiché" value={mois} onChange={(e) => setMois(e.target.value)}><option value="">Dernières journées</option>{moisPresents.map((m) => <option key={m} value={m}>{moisEnClair(m)}</option>)}</Liste></div>}
          {entrees.length > 0 && <Bouton libre className="hidden sm:inline-flex" icone={<Download size={15} />} onClick={() => void exporterJournal(projet, mois ? affichees : entrees.filter((e) => moisDe(e.date) === moisDe(jour)), mois || moisDe(jour))} title="Journal du mois affiché, au format Word">Word</Bouton>}
          {boutonJour}
        </div>}>
        {!lecture && anciennes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-amber-50/60 px-5 py-2.5 text-sm text-amber-900 dark:border-slate-800 dark:bg-amber-950/40 dark:text-amber-100">
            <Lock size={14} /> <span className="flex-1">{anciennes.length} journée(s) de plus d'une semaine sont encore modifiables.</span>
            <Bouton taille="sm" onClick={() => void verrouillerAnciennes()}>Verrouiller</Bouton>
          </div>
        )}
        {entrees.length === 0 ? <Vide icone={<CalendarPlus size={22} />} titre="Journal vide" texte="Une entrée par jour de chantier : météo, effectifs par entreprise, travaux réalisés, événements, photographies. Le journal fait foi en cas de litige sur les délais ou les intempéries." action={boutonJour} /> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {affichees.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => setEdition(e)} className="flex w-full flex-col gap-1.5 px-5 py-3 text-left hover:bg-slate-50 sm:flex-row sm:items-start sm:gap-4 dark:hover:bg-slate-800/50">
                  <span className="flex shrink-0 items-center gap-2 sm:w-52">
                    <span className={cx("text-slate-400", INTEMPERIES.includes(e.meteo) && "text-sky-600")} title={e.meteo}>{ICONE_METEO[e.meteo]}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white"><span className="capitalize">{jourSemaine(e.date)}</span> {formatDate(e.date)}</span>
                    {e.verrouillee && <Lock size={12} className="text-slate-400" aria-label="Journée verrouillée" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{e.travaux || <span className="text-slate-400">Travaux non décrits</span>}</span>
                    {e.evenements.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{e.evenements.map((x) => <Badge key={x.id} couleur={COULEUR_EVENEMENT[x.type]} titre={x.texte}>{x.type}</Badge>)}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500 sm:w-40 sm:justify-end">
                    {e.temperature !== undefined && <span className="num">{e.temperature} °C</span>}
                    <span className="flex items-center gap-1 num"><Users size={13} />{effectifTotal(e)}</span>
                    {e.photos.length > 0 && <span>{e.photos.length} photo(s)</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!mois && entrees.length > affichees.length && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800">Les {affichees.length} dernières journées sont affichées : choisissez un mois pour voir les précédentes.</p>}
      </Carte>

      {edition && <EditeurJournee key={edition.id} initiale={edition} nouvelle={!existe(edition)} entreprises={entreprisesProjet} onFermer={() => setEdition(null)}
        onEnregistrer={(e) => {
          if (existe(e)) modifier("journalChantier", e.id, e); else ajouter("journalChantier", e);
          setEdition(null);
        }} />}
    </div>
  );
}

function EditeurJournee({ initiale, nouvelle, entreprises, onFermer, onEnregistrer }: { initiale: EntreeJournalChantier; nouvelle: boolean; entreprises: string[]; onFermer: () => void; onEnregistrer: (e: EntreeJournalChantier) => void }) {
  const d = useProjet();
  const { modifier } = useDonnees();
  const utilisateur = useUtilisateur();
  const supprimer = useSuppression();
  const lectureGlobale = useLectureSeule();
  const [e, setE] = useState(initiale);
  const fige = !!initiale.verrouillee;
  const lecture = lectureGlobale || fige;
  const maj = (patch: Partial<EntreeJournalChantier>) => setE((x) => ({ ...x, ...patch }));
  const doublon = d.journalChantier.some((x) => x.date === e.date && x.id !== e.id);

  const enregistrer = (verrouiller = false) => {
    if (!e.date) { notifier("Indiquez la date de la journée.", "erreur"); return; }
    if (doublon) { notifier(`Le journal a déjà une entrée pour le ${formatDate(e.date)}.`, "erreur"); return; }
    onEnregistrer({
      ...e, verrouillee: verrouiller || undefined,
      effectifs: e.effectifs.filter((x) => x.entreprise.trim()).map((x) => ({ ...x, entreprise: x.entreprise.trim(), remarque: x.remarque?.trim() || undefined })),
      evenements: e.evenements.filter((x) => x.texte.trim()),
    });
  };
  const rouvrir = async () => {
    const r = await confirmer({ titre: "Rouvrir la journée", message: "La journée redevient modifiable. La réouverture et son motif restent inscrits au journal d'audit.", action: "Rouvrir", motif: true });
    if (!r) return;
    modifier("journalChantier", e.id, { verrouillee: false }, { motif: r.motif });
    onFermer();
  };

  return (
    <Panneau ouverte large onFermer={onFermer} titre={<>Journée du {formatDate(e.date)}{fige && <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-slate-500"><Lock size={12} /> verrouillée</span>}</>}
      pied={fige
        ? <>{utilisateur?.acces?.profil === "Administrateur" && !lectureGlobale && <Bouton variante="fantome" className="mr-auto" icone={<LockOpen size={14} />} onClick={() => void rouvrir()}>Rouvrir</Bouton>}<Bouton libre onClick={onFermer}>Fermer</Bouton></>
        : <>
          {!nouvelle && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={async () => { if (await supprimer("journalChantier", e.id, { quoi: "cette journée du journal" })) onFermer(); }}>Supprimer</Bouton>}
          <Bouton libre onClick={onFermer}>Annuler</Bouton>
          <Bouton icone={<Lock size={14} />} onClick={() => enregistrer(true)} title="Enregistre la journée et la rend non modifiable">Enregistrer et verrouiller</Bouton>
          <Bouton variante="primaire" onClick={() => enregistrer()}>Enregistrer</Bouton>
        </>}>
      <LectureSeule.Provider value={lecture}>
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[11rem_1fr_7rem]">
            <Champ libelle="Date" aide={doublon ? "Une entrée existe déjà pour cette date" : undefined}><Saisie type="date" value={e.date} max={aujourdhui()} onChange={(x) => maj({ date: x.target.value })} aria-invalid={doublon || undefined} /></Champ>
            <Champ libelle="Météo">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Météo">
                {METEOS.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={e.meteo === m} disabled={lecture} onClick={() => maj({ meteo: m })}
                    className={cx("inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium ring-1 transition-colors", e.meteo === m ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700")}>
                    {ICONE_METEO[m]}{m}
                  </button>
                ))}
              </div>
            </Champ>
            <Champ libelle="Température (°C)"><Saisie inputMode="decimal" className="text-right num" value={e.temperature ?? ""} onChange={(x) => { const v = x.target.value.replace(",", "."); maj({ temperature: v === "" || v === "-" || Number.isNaN(Number(v)) ? undefined : Number(v) }); }} /></Champ>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Effectifs <span className="font-normal text-slate-500">· {effectifTotal(e)} personne(s)</span></h4>
              {!lecture && <Bouton taille="sm" icone={<Plus size={13} />} onClick={() => maj({ effectifs: [...e.effectifs, { entreprise: "", personnes: 0 }] })}>Entreprise</Bouton>}
            </div>
            <datalist id="entreprises-chantier">{entreprises.map((n) => <option key={n} value={n} />)}</datalist>
            {e.effectifs.length === 0 ? <p className="text-sm text-slate-400">Aucune entreprise sur le chantier ce jour-là.</p> : (
              <ul className="space-y-2">
                {e.effectifs.map((x, i) => (
                  <li key={i} className="grid grid-cols-[1fr_4.5rem_auto] gap-2 sm:grid-cols-[1fr_5rem_1fr_auto]">
                    <Saisie list="entreprises-chantier" placeholder="Entreprise" aria-label="Entreprise" value={x.entreprise} onChange={(v) => maj({ effectifs: e.effectifs.map((y, j) => (j === i ? { ...y, entreprise: v.target.value } : y)) })} />
                    <Saisie type="number" min={0} className="text-right num" aria-label="Nombre de personnes" value={x.personnes || ""} onChange={(v) => maj({ effectifs: e.effectifs.map((y, j) => (j === i ? { ...y, personnes: Math.max(0, Math.round(Number(v.target.value) || 0)) } : y)) })} />
                    <div className="col-span-3 sm:col-span-1 sm:col-start-3 sm:row-start-1"><Saisie placeholder="Remarque (demi-journée, sous-traitant…)" aria-label="Remarque" value={x.remarque ?? ""} onChange={(v) => maj({ effectifs: e.effectifs.map((y, j) => (j === i ? { ...y, remarque: v.target.value } : y)) })} /></div>
                    {!lecture && <button type="button" aria-label="Retirer l'entreprise" className="col-start-3 row-start-1 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 sm:col-start-4 dark:hover:bg-slate-800" onClick={() => maj({ effectifs: e.effectifs.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Champ libelle="Travaux réalisés"><Zone rows={4} value={e.travaux} onChange={(x) => maj({ travaux: x.target.value })} placeholder="Par entreprise ou par ouvrage : ce qui a été fait, où, avec quels moyens" /></Champ>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Événements</h4>
              {!lecture && <Bouton taille="sm" icone={<Plus size={13} />} onClick={() => maj({ evenements: [...e.evenements, { id: nouvelId("ev"), type: "Livraison", texte: "" }] })}>Événement</Bouton>}
            </div>
            {e.evenements.length === 0 ? <p className="text-sm text-slate-400">Livraisons, visites, incidents, arrêts de chantier : rien de particulier.</p> : (
              <ul className="space-y-2">
                {e.evenements.map((x) => (
                  <li key={x.id} className="grid grid-cols-[8rem_1fr_auto] gap-2">
                    <Liste aria-label="Type d'événement" value={x.type} onChange={(v) => maj({ evenements: e.evenements.map((y) => (y.id === x.id ? { ...y, type: v.target.value as EvenementChantier["type"] } : y)) })}>{TYPES_EVENEMENT.map((t) => <option key={t}>{t}</option>)}</Liste>
                    <Saisie placeholder="Description" aria-label="Description de l'événement" value={x.texte} onChange={(v) => maj({ evenements: e.evenements.map((y) => (y.id === x.id ? { ...y, texte: v.target.value } : y)) })} />
                    {!lecture && <button type="button" aria-label="Retirer l'événement" className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800" onClick={() => maj({ evenements: e.evenements.filter((y) => y.id !== x.id) })}><Trash2 size={15} /></button>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Photographies</h4>
            <Photos photos={enPhotos(e.photos)} projetId={e.projetId} onChange={lecture ? undefined : (p) => maj({ photos: enIds(p) })} />
          </section>
        </div>
      </LectureSeule.Provider>
    </Panneau>
  );
}
