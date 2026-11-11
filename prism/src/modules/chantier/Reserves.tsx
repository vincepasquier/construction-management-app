// Réserves et réceptions : liste des défauts à lever avec leur délai, réceptions d'ouvrage et
// délais de garantie qui en découlent (SIA 118).
import { Check, ClipboardCheck, Download, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { champsManquants, FormulaireSchema, PanneauFiche, type ChampSchema } from "@/app/formulaire/Formulaire";
import { useSuppression } from "@/app/suppression";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, cx, Indicateur, Liste, Panneau, Tableau, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { bilanReserves, changerStatutReserve, echeancesGarantie, garantieDepuis, GRAVITES, numeroSuivant, reserveOuverte, resultatReception, retardReserve, STATUTS_RESERVE } from "@/domaine/lib/chantier";
import { ajouterJours, aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { Reception, Reserve } from "@/domaine/types-chantier";
import { useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { RESULTAT_RECEPTION, sia, SIA118 } from "@/domaine/lib/sia118";
import { exporterReception, exporterReserves } from "./exportChantier";
import { enIds, enPhotos, Photos } from "./Photos";

const COULEUR_STATUT: Record<Reserve["statut"], CouleurBadge> = { Ouverte: "orange", "Levée annoncée": "bleu", "Levée": "vert", "Contestée": "rouge" };
const COULEUR_GRAVITE: Record<Reserve["gravite"], CouleurBadge> = { Mineure: "gris", Majeure: "orange", Bloquante: "rouge" };
const COULEUR_RESULTAT: Record<Reception["resultat"], CouleurBadge> = { "Acceptée": "vert", "Acceptée avec réserves": "orange", "Refusée": "rouge" };
const COULEUR_GARANTIE = { "En cours": "vert", "À vérifier": "orange", "Échue": "gris" } as const;

export function Reserves({ creer, onCree }: { creer?: boolean; onCree?: () => void }) {
  const d = useProjet();
  const { entreprises, ajouter, modifier } = useDonnees();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const supprimer = useSuppression();
  const [edition, setEdition] = useState<Reserve | null>(null);
  const [reception, setReception] = useState<Reception | null>(null);
  const [filtre, setFiltre] = useState<"ouvertes" | "toutes">("ouvertes");
  const [demande, setDemande] = useState(creer);
  if (!d.projet) return null;
  const projet = d.projet;
  const jour = aujourdhui();
  const bilan = bilanReserves(d.reserves, jour);
  const garanties = echeancesGarantie(d.receptions, jour);
  const nomEntreprise = (id?: string) => entreprises.find((e) => e.id === id)?.nom ?? "";
  const nomLot = (id?: string) => { const l = d.lots.find((x) => x.id === id); return l ? `${l.code} ${l.nom}` : ""; };
  const existe = (r: Reserve) => d.reserves.some((x) => x.id === r.id);
  const nouvelle = (p: Partial<Reserve> = {}): Reserve => ({ id: nouvelId("res"), projetId: projet.id, numero: numeroSuivant(d.reserves, "R"), libelle: "", gravite: "Mineure", statut: "Ouverte", dateConstat: jour, delai: ajouterJours(jour, 30), photos: [], ...p });
  if (demande && !edition && !lecture) { setDemande(false); setEdition(nouvelle()); onCree?.(); }

  const lever = (r: Reserve) => modifier("reserves", r.id, changerStatutReserve(r, "Levée", jour, utilisateur?.id), { libelle: `Levée de la réserve ${r.numero}` });
  const liste = (filtre === "ouvertes" ? d.reserves.filter(reserveOuverte) : d.reserves).slice().sort((a, b) => b.numero.localeCompare(a.numero, "fr", { numeric: true }));

  const colonnes: Colonne<Reserve>[] = [
    { id: "numero", titre: "N°", valeur: (r) => r.numero, largeur: "5.5rem", rendu: (r) => <span className="num whitespace-nowrap font-medium">{r.numero}</span> },
    { id: "libelle", titre: "Réserve", valeur: (r) => r.libelle, rendu: (r) => <span className="block max-w-sm truncate font-medium text-slate-900 dark:text-white" title={r.libelle}>{r.libelle}</span> },
    { id: "localisation", titre: "Localisation", valeur: (r) => r.localisation ?? "" },
    { id: "entreprise", titre: "Entreprise", valeur: (r) => nomEntreprise(r.entrepriseId), groupable: true },
    { id: "lot", titre: "Lot", valeur: (r) => nomLot(r.lotId), groupable: true, masquee: true },
    { id: "gravite", titre: "Gravité", valeur: (r) => r.gravite, groupable: true, rendu: (r) => <Badge couleur={COULEUR_GRAVITE[r.gravite]}>{r.gravite}</Badge> },
    { id: "statut", titre: "État", valeur: (r) => r.statut, groupable: true, rendu: (r) => <Badge couleur={COULEUR_STATUT[r.statut]}>{r.statut}</Badge> },
    { id: "constat", titre: "Constatée le", valeur: (r) => r.dateConstat, type: "date", masquee: true },
    { id: "delai", titre: "Délai", valeur: (r) => r.delai ?? "", type: "date", rendu: (r) => (r.delai ? <span className={cx("whitespace-nowrap", retardReserve(r, jour) > 0 && "font-medium text-rose-600")}>{formatDate(r.delai)}{retardReserve(r, jour) > 0 && ` · ${retardReserve(r, jour)} j`}</span> : "—") },
    { id: "levee", titre: "Levée le", valeur: (r) => r.dateLevee ?? "", type: "date", masquee: true },
    { id: "reception", titre: "Réception", valeur: (r) => d.receptions.find((x) => x.id === r.receptionId)?.objet ?? "", groupable: true, masquee: true },
    { id: "photos", titre: "Photos", valeur: (r) => r.photos.length, type: "nombre", masquee: true },
  ];

  const champs: ChampSchema<Reserve>[] = [
    { cle: "libelle", libelle: "Défaut constaté", type: "texte", obligatoire: true, large: true },
    { cle: "gravite", libelle: "Gravité", type: "liste", options: GRAVITES, obligatoire: true, aide: `Bloquante : défaut majeur, la réception est différée (${sia("defautsMajeurs")}). Les autres sont des défauts mineurs (${SIA118.defautsMineurs})` },
    { cle: "statut", libelle: "État", type: "liste", options: STATUTS_RESERVE, obligatoire: true },
    { cle: "localisation", libelle: "Localisation", type: "texte", large: true },
    { cle: "entrepriseId", libelle: "Entreprise", type: "entreprise" },
    { cle: "lotId", libelle: "Lot", type: "lot" },
    { cle: "dateConstat", libelle: "Constatée le", type: "date", obligatoire: true },
    { cle: "delai", libelle: "À lever jusqu'au", type: "date" },
    { cle: "receptionId", libelle: "Réception", type: "liste", options: d.receptions.map((x) => ({ valeur: x.id, libelle: `${formatDate(x.date)} · ${x.objet}` })), large: true },
    { cle: "description", libelle: "Description, travaux demandés", type: "zone", large: true },
  ];

  const champsReception: ChampSchema<Reception>[] = [
    { cle: "objet", libelle: "Ouvrage ou partie d'ouvrage reçu", type: "texte", obligatoire: true, large: true },
    { cle: "contratId", libelle: "Contrat", type: "liste", options: d.contrats.map((c) => ({ valeur: c.id, libelle: `${c.numero} · ${nomEntreprise(c.entrepriseId)}` })), large: true },
    { cle: "date", libelle: "Date de la réception", type: "date", obligatoire: true },
    { cle: "type", libelle: "Type", type: "liste", options: ["Partielle", "Finale"], obligatoire: true },
    { cle: "lieu", libelle: "Lieu", type: "texte" },
    { cle: "avisAchevement", libelle: "Avis d'achèvement reçu le", type: "date", aide: `La vérification commune suit l'avis de l'entrepreneur (${sia("verification")})` },
    { cle: "resultat", libelle: "Résultat de la vérification commune", type: "liste", obligatoire: true, large: true, aide: "Défauts majeurs : l'ouvrage n'est pas reçu et les délais de garantie ne courent pas",
      options: (["Acceptée", "Acceptée avec réserves", "Refusée"] as const).map((v) => ({ valeur: v, libelle: `${RESULTAT_RECEPTION[v].libelle} (${SIA118[RESULTAT_RECEPTION[v].renvoi]})` })) },
    { cle: "secondeVerification", libelle: "Nouvelle vérification commune prévue le", type: "date", visible: (r) => r.resultat === "Refusée" },
    { cle: "debutGarantie", libelle: "Début de la garantie", type: "date", visible: (r) => r.resultat !== "Refusée", aide: "Laissé vide : la date de la réception" },
    { cle: "finGarantie", libelle: "Fin du délai de dénonciation", type: "date", visible: (r) => r.resultat !== "Refusée", aide: `Laissé vide : deux ans après la réception (${sia("denonciation")})` },
    { cle: "surete", libelle: "Sûreté remise", type: "texte", large: true, visible: (r) => r.resultat !== "Refusée", aide: `Cautionnement solidaire ou garantie bancaire, montant, échéance (${sia("surete")})` },
    { cle: "participants", libelle: "Participants", type: "texte", large: true, aide: "Maître de l'ouvrage, direction des travaux, entrepreneur" },
    { cle: "documentsRemis", libelle: "Documents remis", type: "zone", large: true, aide: "Un par ligne : plans conformes à l'exécution, procès-verbaux d'essais, notices…" },
    { cle: "remarques", libelle: "Remarques", type: "zone", large: true },
  ];
  const receptionExiste = (r: Reception) => d.receptions.some((x) => x.id === r.id);

  const boutonReserve = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition(nouvelle())}>Réserve</Bouton>;
  const boutonReception = !lecture && <Bouton icone={<Plus size={15} />} onClick={() => setReception({ id: nouvelId("rcp"), projetId: projet.id, objet: "", date: jour, type: "Partielle", resultat: "Acceptée avec réserves" })}>Réception</Bouton>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Réserves ouvertes" valeur={bilan.ouvertes} detail={`sur ${bilan.total} · ${bilan.tauxLevee} % levées`} />
        <Indicateur libelle="Délai dépassé" valeur={bilan.enRetard} tendance={bilan.enRetard ? "mauvais" : "bon"} detail={bilan.enRetard ? "à relancer" : "aucune"} />
        <Indicateur libelle="Bloquantes" valeur={bilan.bloquantes} tendance={bilan.bloquantes ? "mauvais" : "bon"} detail="empêchent la réception" />
        <Indicateur libelle="Levées annoncées" valeur={bilan.annoncees} tendance={bilan.annoncees ? "alerte" : undefined} detail="à vérifier sur place" />
      </div>

      <Carte>
        {/* Sur téléphone : des cartes, avec la levée à portée de pouce */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex-1"><Liste libre aria-label="Réserves affichées" value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)}><option value="ouvertes">Ouvertes ({bilan.ouvertes})</option><option value="toutes">Toutes ({bilan.total})</option></Liste></div>
            {boutonReserve}
          </div>
          {liste.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">{d.reserves.length ? "Toutes les réserves sont levées." : "Aucune réserve."}</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {liste.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEdition(r)}>
                    <span className="flex items-center gap-2 text-xs text-slate-500"><span className="num font-medium">{r.numero}</span><Badge couleur={COULEUR_GRAVITE[r.gravite]}>{r.gravite}</Badge><Badge couleur={COULEUR_STATUT[r.statut]}>{r.statut}</Badge></span>
                    <span className="mt-1 block text-sm font-medium text-slate-900 dark:text-white">{r.libelle}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{[r.localisation, nomEntreprise(r.entrepriseId)].filter(Boolean).join(" · ")}</span>
                    {r.delai && reserveOuverte(r) && <span className={retardReserve(r, jour) > 0 ? "mt-0.5 block text-xs font-medium text-rose-600" : "mt-0.5 block text-xs text-slate-500"}>À lever jusqu'au {formatDate(r.delai)}{retardReserve(r, jour) > 0 && ` · ${retardReserve(r, jour)} j de retard`}</span>}
                  </button>
                  {!lecture && reserveOuverte(r) && <button type="button" onClick={() => lever(r)} aria-label={`Lever la réserve ${r.numero}`} className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900"><Check size={18} /></button>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hidden sm:block">
          <TableDonnees id="reserves" lignes={liste} colonnes={colonnes} cle={(r) => r.id} onOuvrir={setEdition} grouperPar=""
            classeLigne={(r) => (retardReserve(r, jour) > 0 ? "bg-rose-50/40 dark:bg-rose-950/20" : undefined)}
            actions={lecture ? undefined : (r) => (reserveOuverte(r) ? <Bouton taille="sm" variante="fantome" icone={<Check size={13} />} onClick={() => lever(r)} title="Le défaut est corrigé : la levée est datée et signée de votre nom">Lever</Bouton> : null)}
            barre={<>
              <div className="w-44"><Liste libre aria-label="Réserves affichées" value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)}><option value="ouvertes">Ouvertes ({bilan.ouvertes})</option><option value="toutes">Toutes ({bilan.total})</option></Liste></div>
              {d.reserves.some(reserveOuverte) && <Bouton libre icone={<Download size={15} />} onClick={() => void exporterReserves(projet, d.reserves.filter(reserveOuverte), { nomEntreprise, nomLot })} title="Liste des réserves ouvertes par entreprise, au format Word">Liste par entreprise</Bouton>}
              {boutonReserve}
            </>}
            vide={<Vide icone={<ClipboardCheck size={22} />} titre={d.reserves.length ? "Toutes les réserves sont levées" : "Aucune réserve"} texte={d.reserves.length ? "Affichez « Toutes » pour revoir les réserves levées." : "Chaque défaut relevé à la réception ou en cours de chantier devient une réserve, avec l'entreprise concernée, un délai et des photographies."} action={boutonReserve} />} />
        </div>
      </Carte>

      <Carte titre="Réceptions et garanties" sousTitre={`Chaque réception ouvre le délai de dénonciation des défauts, deux ans (${sia("denonciation")}) ; la prescription est de cinq ans (${SIA118.prescription})`} action={boutonReception}>
        {d.receptions.length === 0 ? <Vide icone={<ShieldCheck size={22} />} titre="Aucune réception" texte="Enregistrez les réceptions partielles et finales : les dates de garantie sont proposées, et les garanties qui arrivent à échéance sont signalées trois mois avant." action={boutonReception} /> : (
          <Tableau>
            <thead><tr><th>Date</th><th>Ouvrage reçu</th><th>Contrat</th><th>Type</th><th>Résultat</th><th className="text-right">Réserves ouvertes</th><th>Garantie jusqu'au</th></tr></thead>
            <tbody>{[...d.receptions].sort((a, b) => b.date.localeCompare(a.date)).map((x) => {
              const siennes = d.reserves.filter((r) => r.receptionId === x.id);
              const g = garanties.find((e) => e.reception.id === x.id);
              const contrat = d.contrats.find((c) => c.id === x.contratId);
              return (
                <tr key={x.id} className={lecture ? undefined : "cursor-pointer"} onClick={lecture ? undefined : () => setReception(x)}>
                  <td className="whitespace-nowrap">{formatDate(x.date)}</td><td className="font-medium">{x.objet}</td><td>{contrat ? `${contrat.numero} · ${nomEntreprise(contrat.entrepriseId)}` : "—"}</td><td>{x.type}</td>
                  <td><Badge couleur={COULEUR_RESULTAT[x.resultat]} titre={`${RESULTAT_RECEPTION[x.resultat].libelle} (${sia(RESULTAT_RECEPTION[x.resultat].renvoi)})`}>{x.resultat === "Refusée" ? "Différée" : x.resultat}</Badge>{siennes.length > 0 && resultatReception(siennes) !== x.resultat && x.resultat !== "Refusée" && <span className="ml-2 text-xs text-slate-500" title="D'après l'état actuel des réserves rattachées">→ {resultatReception(siennes).toLowerCase()}</span>}</td>
                  <td className="text-right num">{siennes.filter(reserveOuverte).length || "—"}<span className="text-slate-400"> / {siennes.length}</span></td>
                  <td>{g ? <span className="flex items-center gap-2 whitespace-nowrap">{formatDate(g.fin)}<Badge couleur={COULEUR_GARANTIE[g.etat]}>{g.etat === "En cours" ? `${Math.round(g.joursRestants / 30)} mois` : g.etat}</Badge></span> : "—"}</td>
                </tr>
              );
            })}</tbody>
          </Tableau>
        )}
      </Carte>

      {edition && <EditeurReserve key={edition.id} initiale={edition} nouvelle={!existe(edition)} champs={champs} onFermer={() => setEdition(null)}
        onEnregistrer={(r) => {
          // Le passage à « Levée » date et signe la levée ; le retour en arrière l'efface
          const avant = d.reserves.find((x) => x.id === r.id);
          const propre = { ...r, ...(r.statut !== (avant?.statut ?? "Ouverte") || (!avant && r.statut === "Levée") ? changerStatutReserve(r, r.statut, jour, utilisateur?.id) : {}), entrepriseId: r.entrepriseId || undefined, lotId: r.lotId || undefined, receptionId: r.receptionId || undefined, delai: r.delai || undefined };
          if (avant) modifier("reserves", r.id, propre); else ajouter("reserves", propre);
          setEdition(null);
        }}
        onSupprimer={async () => { if (await supprimer("reserves", edition.id, { quoi: `la réserve ${edition.numero}` })) setEdition(null); }} />}

      {reception && (
        <PanneauFiche titre={receptionExiste(reception) ? "Réception" : "Nouvelle réception"} initial={reception} champs={champsReception} onFermer={() => setReception(null)}
          onEnregistrer={(v) => {
            const g = garantieDepuis(v.date);
            const propre: Reception = v.resultat === "Refusée"
              ? { ...v, contratId: v.contratId || undefined, debutGarantie: undefined, finGarantie: undefined }
              : { ...v, contratId: v.contratId || undefined, debutGarantie: v.debutGarantie || g.debutGarantie, finGarantie: v.finGarantie || garantieDepuis(v.debutGarantie || v.date).finGarantie };
            if (receptionExiste(v)) modifier("receptions", v.id, propre); else ajouter("receptions", propre);
            setReception(null);
          }}
          enfants={(v) => receptionExiste(v) && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">Procès-verbal de réception, dans l'ordre de la SIA 118 : vérification commune, résultat, défauts à éliminer, délais, signatures.</p>
              <Bouton libre icone={<Download size={15} />} onClick={() => { const contrat = d.contrats.find((c) => c.id === v.contratId); void exporterReception(projet, v, d.reserves.filter((r) => r.receptionId === v.id), { contrat: contrat ? `${contrat.numero} – ${contrat.objet}` : undefined, entreprise: nomEntreprise(contrat?.entrepriseId) || undefined, nomEntreprise }); }}>Procès-verbal (Word)</Bouton>
            </div>
          )}
          onSupprimer={receptionExiste(reception) ? async () => { if (await supprimer("receptions", reception.id, { quoi: "la réception", message: "Les réserves rattachées sont conservées, sans réception." })) setReception(null); } : undefined} />
      )}
    </div>
  );
}

function EditeurReserve({ initiale, nouvelle, champs, onFermer, onEnregistrer, onSupprimer }: { initiale: Reserve; nouvelle: boolean; champs: ChampSchema<Reserve>[]; onFermer: () => void; onEnregistrer: (r: Reserve) => void; onSupprimer: () => void }) {
  const { personnes } = useDonnees();
  const lecture = useLectureSeule();
  const [r, setR] = useState(initiale);
  const [manquants, setManquants] = useState<string[]>([]);
  const enregistrer = () => { const m = champsManquants(champs, r); setManquants(m); if (!m.length) onEnregistrer(r); };
  return (
    <Panneau ouverte onFermer={onFermer} titre={nouvelle ? `Nouvelle réserve ${r.numero}` : `Réserve ${r.numero}`}
      pied={<>
        {!nouvelle && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={onSupprimer}>Supprimer</Bouton>}
        <Bouton libre onClick={onFermer}>{lecture ? "Fermer" : "Annuler"}</Bouton>
        <Bouton variante="primaire" onClick={enregistrer}>Enregistrer</Bouton>
      </>}>
      <div className="space-y-5">
        <section>
          <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Photographies</h4>
          <Photos photos={enPhotos(r.photos)} projetId={r.projetId} onChange={lecture ? undefined : (p) => setR((x) => ({ ...x, photos: enIds(p) }))} />
        </section>
        <FormulaireSchema champs={champs} valeur={r} onChange={setR} manquants={manquants} />
        {r.dateLevee && <p className="text-xs text-slate-500">Levée le {formatDate(r.dateLevee)}{r.leveeParId ? ` par ${personnes.find((p) => p.id === r.leveeParId)?.nom ?? "—"}` : ""}.</p>}
      </div>
    </Panneau>
  );
}
