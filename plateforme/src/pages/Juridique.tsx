import { useState } from "react";
import { CalendarClock, ExternalLink, Landmark, ListPlus, MapPinned, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { aujourdhui, ajouterJours, formatCHF, formatDate, joursEntre } from "../lib/format";
import { nouvelId } from "../lib/id";
import { FormulaireAction, nouvelleAction } from "../components/FormulaireAction";
import { Avatar, Badge, Bouton, Carte, Champ, cx, EnTetePage, Indicateur, Liste, Modale, Onglets, Saisie, Tableau, Vide, Zone, type CouleurBadge } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type {
  Action, Autorisation, ConditionAutorisation, Servitude, StatutAutorisation, StatutCondition, StatutServitude, TypeAutorisation, TypeServitude,
} from "../types";

const TYPES_AUT: TypeAutorisation[] = ["Permis de construire", "Approbation des plans", "Autorisation spéciale", "Autorisation de défrichement", "Permis de fouille", "Autorisation de police (circulation)", "Autre"];
const STATUTS_AUT: StatutAutorisation[] = ["En préparation", "Déposée", "Mise à l'enquête", "Oppositions en traitement", "Délivrée", "En recours", "Refusée", "Échue"];
const STATUTS_COND: StatutCondition[] = ["À traiter", "En cours", "Respectée", "Levée"];
const TYPES_SRV: TypeServitude[] = ["Servitude de passage", "Servitude de conduite", "Emprise temporaire", "Acquisition de terrain", "Droit de superficie", "Autre"];
const STATUTS_SRV: StatutServitude[] = ["À négocier", "En négociation", "Accord de principe", "Convention signée", "Inscrite au registre foncier", "Refus / expropriation"];

const COULEUR_AUT: Record<StatutAutorisation, CouleurBadge> = {
  "En préparation": "gris", "Déposée": "bleu", "Mise à l'enquête": "bleu", "Oppositions en traitement": "orange", "Délivrée": "vert", "En recours": "rouge", "Refusée": "rouge", "Échue": "gris",
};
const COULEUR_SRV: Record<StatutServitude, CouleurBadge> = {
  "À négocier": "gris", "En négociation": "orange", "Accord de principe": "bleu", "Convention signée": "violet", "Inscrite au registre foncier": "vert", "Refus / expropriation": "rouge",
};
/** Avancement d'une servitude, de la négociation à l'inscription au registre foncier */
const ETAPE_SRV: Record<StatutServitude, number> = { "À négocier": 0, "En négociation": 1, "Accord de principe": 2, "Convention signée": 3, "Inscrite au registre foncier": 4, "Refus / expropriation": 0 };

type Onglet = "autorisations" | "conditions" | "servitudes";

export function Juridique() {
  const d = useProjetActif();
  const { personnes, ajouter, modifier, supprimer } = useStore();
  const [onglet, setOnglet] = useState<Onglet>("autorisations");
  const [autorisation, setAutorisation] = useState<Autorisation | null>(null);
  const [servitude, setServitude] = useState<Servitude | null>(null);
  const [condition, setCondition] = useState<{ aut: Autorisation; c: ConditionAutorisation } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  if (!d.projet) return <SansProjet />;
  const projet = d.projet;
  const jour = aujourdhui();
  const nomPers = (id?: string) => personnes.find((p) => p.id === id)?.nom;

  const conditions = d.autorisations.flatMap((a) => a.conditions.map((c) => ({ a, c })));
  const condOuvertes = conditions.filter(({ c }) => c.statut === "À traiter" || c.statut === "En cours");
  const srvSignees = d.servitudes.filter((s) => ETAPE_SRV[s.statut] >= 3).length;
  const echeances = [
    ...d.autorisations.filter((a) => a.validite && a.statut === "Délivrée").map((a) => ({ date: a.validite!, texte: `Fin de validité : ${a.type} – ${a.objet}` })),
    ...condOuvertes.filter(({ c }) => c.echeance).map(({ a, c }) => ({ date: c.echeance!, texte: `${c.service} : ${c.texte} (${a.type})` })),
    ...d.servitudes.filter((s) => s.echeance && ETAPE_SRV[s.statut] < 3).map((s) => ({ date: s.echeance!, texte: `Parcelle ${s.parcelle} – ${s.proprietaire} : ${s.type.toLowerCase()}` })),
  ].filter((e) => e.date <= ajouterJours(jour, 60)).sort((a, b) => a.date.localeCompare(b.date));

  const majCondition = (aut: Autorisation, c: ConditionAutorisation) =>
    modifier("autorisations", aut.id, { conditions: aut.conditions.some((x) => x.id === c.id) ? aut.conditions.map((x) => (x.id === c.id ? c : x)) : [...aut.conditions, c] });

  return (
    <>
      <EnTetePage titre="Autorisations & foncier" description="Permis et approbations, conditions des préavis, servitudes et emprises par parcelle"
        actions={<>
          {onglet === "servitudes"
            ? <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setServitude({ id: nouvelId("srv"), projetId: projet.id, parcelle: "", commune: projet.lieu, proprietaire: "", type: "Servitude de conduite", statut: "À négocier", indemnite: 0 })}>Parcelle / servitude</Bouton>
            : <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setAutorisation({ id: nouvelId("aut"), projetId: projet.id, type: "Permis de construire", objet: "", autorite: "", statut: "En préparation", oppositions: 0, conditions: [] })}>Autorisation</Bouton>}
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Autorisations délivrées" valeur={`${d.autorisations.filter((a) => a.statut === "Délivrée").length} / ${d.autorisations.length}`}
          detail={d.autorisations.some((a) => ["Oppositions en traitement", "En recours"].includes(a.statut)) ? "oppositions ou recours en cours" : "aucun recours en cours"}
          tendance={d.autorisations.some((a) => ["En recours", "Refusée"].includes(a.statut)) ? "mauvais" : undefined} />
        <Indicateur libelle="Conditions ouvertes" valeur={condOuvertes.length}
          detail={condOuvertes.some(({ c }) => c.echeance && c.echeance < jour) ? `${condOuvertes.filter(({ c }) => c.echeance && c.echeance < jour).length} échéance(s) dépassée(s)` : `${conditions.length - condOuvertes.length} respectée(s) ou levée(s)`}
          tendance={condOuvertes.some(({ c }) => c.echeance && c.echeance < jour) ? "mauvais" : undefined} />
        <Indicateur libelle="Servitudes signées" valeur={`${srvSignees} / ${d.servitudes.length}`} detail={`${d.servitudes.filter((s) => s.statut === "Inscrite au registre foncier").length} inscrite(s) au RF`} />
        <Indicateur libelle="Indemnités foncières" valeur={formatCHF(d.servitudes.reduce((s, x) => s + x.indemnite, 0))} detail="total estimé" />
      </div>

      {echeances.length > 0 && (
        <Carte className="mt-6" titre={<span className="flex items-center gap-2"><CalendarClock size={16} className="text-amber-500" /> Échéances des 60 prochains jours</span>}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {echeances.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className={cx("num w-24 shrink-0 font-medium", e.date < jour ? "text-rose-600" : "text-slate-600")}>{formatDate(e.date)}</span>
                <span className="flex-1">{e.texte}</span>
                <span className="text-xs text-slate-400">{e.date < jour ? "dépassée" : `J-${joursEntre(jour, e.date)}`}</span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <div className="mt-6 mb-4">
        <Onglets valeur={onglet} onChange={setOnglet} options={[
          { id: "autorisations", libelle: "Autorisations", compte: d.autorisations.length },
          { id: "conditions", libelle: "Conditions & préavis", compte: condOuvertes.length },
          { id: "servitudes", libelle: "Parcelles & servitudes", compte: d.servitudes.length },
        ]} />
      </div>

      {onglet === "autorisations" && (
        d.autorisations.length === 0 ? <Carte><Vide icone={<Landmark size={22} />} titre="Aucune autorisation" texte="Enregistrez le permis de construire, l'approbation des plans et les autorisations spéciales." /></Carte> : (
          <div className="space-y-4">
            {d.autorisations.map((a) => {
              const ouvertes = a.conditions.filter((c) => c.statut === "À traiter" || c.statut === "En cours").length;
              return (
                <Carte key={a.id}>
                  <div className="flex flex-wrap items-start gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge couleur="violet">{a.type}</Badge>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{a.objet}</h3>
                        {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-brand-600"><ExternalLink size={14} /></a>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{a.autorite}{a.reference && ` · réf. ${a.reference}`}</p>
                    </div>
                    <Badge couleur={COULEUR_AUT[a.statut]}>{a.statut}</Badge>
                    <Bouton taille="sm" variante="fantome" onClick={() => setAutorisation(a)}><Pencil size={14} /></Bouton>
                  </div>
                  {/* Jalons de la procédure */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-3 text-sm sm:grid-cols-5 dark:border-slate-800">
                    {[["Dépôt", a.dateDepot], ["Mise à l'enquête", a.dateEnquete], ["Oppositions", String(a.oppositions)], ["Décision", a.dateDecision], ["Validité jusqu'au", a.validite]].map(([l, v], i) => (
                      <div key={l}><p className="text-xs text-slate-500">{l}</p><p className={cx("num font-medium", i === 4 && v && v < ajouterJours(jour, 90) && "text-amber-600")}>{i === 2 ? v : formatDate(v)}</p></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-2.5 text-sm dark:border-slate-800">
                    <ScrollText size={15} className="text-slate-400" />
                    <span>{a.conditions.length} condition(s) · <span className={ouvertes ? "font-medium text-amber-600" : "text-emerald-600"}>{ouvertes} ouverte(s)</span></span>
                    <Bouton libre taille="sm" variante="fantome" className="ml-auto" onClick={() => setOnglet("conditions")}>Voir les conditions</Bouton>
                    <Bouton taille="sm" icone={<Plus size={14} />} onClick={() => setCondition({ aut: a, c: { id: nouvelId("cond"), service: "", texte: "", statut: "À traiter" } })}>Condition</Bouton>
                  </div>
                </Carte>
              );
            })}
          </div>
        )
      )}

      {onglet === "conditions" && (
        <Carte>
          {conditions.length === 0 ? <Vide icone={<ScrollText size={22} />} titre="Aucune condition" texte="Reportez ici les charges et conditions des préavis des services, pour en suivre le respect." /> : (
            <Tableau>
              <thead><tr><th>Condition / préavis</th><th>Autorisation</th><th>Échéance</th><th>Responsable</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {[...conditions].sort((x, y) => STATUTS_COND.indexOf(x.c.statut) - STATUTS_COND.indexOf(y.c.statut) || (x.c.echeance ?? "9").localeCompare(y.c.echeance ?? "9")).map(({ a, c }) => (
                  <tr key={c.id}>
                    <td className="max-w-md"><p className="font-medium">{c.texte}</p><p className="text-xs text-slate-500">{c.service}</p></td>
                    <td className="text-xs text-slate-500">{a.type}<br />{a.reference}</td>
                    <td className={cx("num whitespace-nowrap", c.echeance && c.echeance < jour && (c.statut === "À traiter" || c.statut === "En cours") && "font-medium text-rose-600")}>{formatDate(c.echeance)}</td>
                    <td>{nomPers(c.responsableId) ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Avatar nom={nomPers(c.responsableId)!} taille={22} />{nomPers(c.responsableId)}</span> : "—"}</td>
                    <td>
                      <Liste value={c.statut} onChange={(e) => majCondition(a, { ...c, statut: e.target.value as StatutCondition })} className="!w-32 !py-1 text-xs">
                        {STATUTS_COND.map((x) => <option key={x}>{x}</option>)}
                      </Liste>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <Bouton taille="sm" variante="fantome" title="Créer une tâche" onClick={() => setAction(nouvelleAction(projet.id, { titre: c.texte, assigneId: c.responsableId, echeance: c.echeance, origine: `Condition ${a.reference ?? a.type}`, lotId: a.lotId }))}><ListPlus size={14} /></Bouton>
                      <Bouton taille="sm" variante="fantome" onClick={() => setCondition({ aut: a, c })}><Pencil size={14} /></Bouton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {onglet === "servitudes" && (
        <Carte>
          {d.servitudes.length === 0 ? <Vide icone={<MapPinned size={22} />} titre="Aucune parcelle" texte="Listez les parcelles touchées par le projet et suivez les servitudes, emprises et acquisitions." /> : (
            <Tableau>
              <thead><tr><th>Parcelle</th><th>Propriétaire</th><th>Objet</th><th>Avancement</th><th className="!text-right">Indemnité</th><th>Échéance</th><th /></tr></thead>
              <tbody>
                {[...d.servitudes].sort((a, b) => a.parcelle.localeCompare(b.parcelle, "fr", { numeric: true })).map((s) => (
                  <tr key={s.id}>
                    <td><p className="font-medium">n° {s.parcelle}</p><p className="text-xs text-slate-500">{s.commune}</p></td>
                    <td><p>{s.proprietaire}</p>{s.contact && <p className="text-xs text-slate-500">{s.contact}</p>}</td>
                    <td><p>{s.type}</p>{s.emprise && <p className="text-xs text-slate-500">{s.emprise}</p>}</td>
                    <td>
                      <Badge couleur={COULEUR_SRV[s.statut]}>{s.statut}</Badge>
                      {s.statut !== "Refus / expropriation" && (
                        <div className="mt-1.5 flex gap-0.5">{[1, 2, 3, 4].map((i) => <span key={i} className={cx("h-1 w-6 rounded-full", ETAPE_SRV[s.statut] >= i ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700")} />)}</div>
                      )}
                      {s.remarque && <p className="mt-1 max-w-56 truncate text-xs text-slate-500" title={s.remarque}>{s.remarque}</p>}
                    </td>
                    <td className="num text-right">{s.indemnite ? formatCHF(s.indemnite) : "—"}</td>
                    <td className={cx("num", s.echeance && s.echeance < jour && ETAPE_SRV[s.statut] < 3 && "font-medium text-rose-600")}>{s.dateSignature ? <span className="text-emerald-600">signé {formatDate(s.dateSignature)}</span> : formatDate(s.echeance)}</td>
                    <td className="text-right"><Bouton taille="sm" variante="fantome" onClick={() => setServitude(s)}><Pencil size={14} /></Bouton></td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Carte>
      )}

      {autorisation && (
        <Modale ouverte large onFermer={() => setAutorisation(null)} titre="Autorisation"
          pied={<>
            {d.autorisations.some((x) => x.id === autorisation.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" icone={<Trash2 size={14} />} onClick={() => { if (confirm("Supprimer cette autorisation et ses conditions ?")) { supprimer("autorisations", autorisation.id); setAutorisation(null); } }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setAutorisation(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!autorisation.objet} onClick={() => { if (d.autorisations.some((x) => x.id === autorisation.id)) modifier("autorisations", autorisation.id, autorisation); else ajouter("autorisations", autorisation); setAutorisation(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid gap-4 md:grid-cols-3">
            <Champ libelle="Type"><Liste value={autorisation.type} onChange={(e) => setAutorisation({ ...autorisation, type: e.target.value as TypeAutorisation })}>{TYPES_AUT.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Objet" className="md:col-span-2"><Saisie value={autorisation.objet} onChange={(e) => setAutorisation({ ...autorisation, objet: e.target.value })} /></Champ>
            <Champ libelle="Autorité" className="md:col-span-2"><Saisie value={autorisation.autorite} onChange={(e) => setAutorisation({ ...autorisation, autorite: e.target.value })} /></Champ>
            <Champ libelle="Référence"><Saisie value={autorisation.reference ?? ""} onChange={(e) => setAutorisation({ ...autorisation, reference: e.target.value || undefined })} /></Champ>
            <Champ libelle="Statut"><Liste value={autorisation.statut} onChange={(e) => setAutorisation({ ...autorisation, statut: e.target.value as StatutAutorisation })}>{STATUTS_AUT.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Dépôt"><Saisie type="date" value={autorisation.dateDepot ?? ""} onChange={(e) => setAutorisation({ ...autorisation, dateDepot: e.target.value || undefined })} /></Champ>
            <Champ libelle="Mise à l'enquête"><Saisie type="date" value={autorisation.dateEnquete ?? ""} onChange={(e) => setAutorisation({ ...autorisation, dateEnquete: e.target.value || undefined })} /></Champ>
            <Champ libelle="Nombre d'oppositions"><Saisie type="number" min={0} value={autorisation.oppositions} onChange={(e) => setAutorisation({ ...autorisation, oppositions: Number(e.target.value) })} /></Champ>
            <Champ libelle="Décision"><Saisie type="date" value={autorisation.dateDecision ?? ""} onChange={(e) => setAutorisation({ ...autorisation, dateDecision: e.target.value || undefined })} /></Champ>
            <Champ libelle="Valable jusqu'au"><Saisie type="date" value={autorisation.validite ?? ""} onChange={(e) => setAutorisation({ ...autorisation, validite: e.target.value || undefined })} /></Champ>
            <Champ libelle="Lot"><Liste value={autorisation.lotId ?? ""} onChange={(e) => setAutorisation({ ...autorisation, lotId: e.target.value || undefined })}><option value="">— tout le projet</option>{d.lots.map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}</Liste></Champ>
            <Champ libelle="Lien vers la décision (SharePoint…)" className="md:col-span-3"><Saisie value={autorisation.url ?? ""} onChange={(e) => setAutorisation({ ...autorisation, url: e.target.value || undefined })} placeholder="https://…" /></Champ>
          </div>
        </Modale>
      )}

      {condition && (
        <Modale ouverte onFermer={() => setCondition(null)} titre="Condition / préavis"
          pied={<>
            {condition.aut.conditions.some((x) => x.id === condition.c.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { modifier("autorisations", condition.aut.id, { conditions: condition.aut.conditions.filter((x) => x.id !== condition.c.id) }); setCondition(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setCondition(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!condition.c.texte} onClick={() => { majCondition(condition.aut, condition.c); setCondition(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Service / autorité" className="col-span-2"><Saisie value={condition.c.service} onChange={(e) => setCondition({ ...condition, c: { ...condition.c, service: e.target.value } })} placeholder="ex. Office de l'environnement" /></Champ>
            <Champ libelle="Condition" className="col-span-2"><Zone rows={3} value={condition.c.texte} onChange={(e) => setCondition({ ...condition, c: { ...condition.c, texte: e.target.value } })} /></Champ>
            <Champ libelle="Échéance"><Saisie type="date" value={condition.c.echeance ?? ""} onChange={(e) => setCondition({ ...condition, c: { ...condition.c, echeance: e.target.value || undefined } })} /></Champ>
            <Champ libelle="Statut"><Liste value={condition.c.statut} onChange={(e) => setCondition({ ...condition, c: { ...condition.c, statut: e.target.value as StatutCondition } })}>{STATUTS_COND.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Responsable" className="col-span-2"><Liste value={condition.c.responsableId ?? ""} onChange={(e) => setCondition({ ...condition, c: { ...condition.c, responsableId: e.target.value || undefined } })}><option value="">—</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste></Champ>
          </div>
        </Modale>
      )}

      {servitude && (
        <Modale ouverte large onFermer={() => setServitude(null)} titre="Parcelle et servitude"
          pied={<>
            {d.servitudes.some((x) => x.id === servitude.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("servitudes", servitude.id); setServitude(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setServitude(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!servitude.parcelle || !servitude.proprietaire} onClick={() => { if (d.servitudes.some((x) => x.id === servitude.id)) modifier("servitudes", servitude.id, servitude); else ajouter("servitudes", servitude); setServitude(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid gap-4 md:grid-cols-3">
            <Champ libelle="N° de parcelle"><Saisie value={servitude.parcelle} onChange={(e) => setServitude({ ...servitude, parcelle: e.target.value })} /></Champ>
            <Champ libelle="Commune"><Saisie value={servitude.commune} onChange={(e) => setServitude({ ...servitude, commune: e.target.value })} /></Champ>
            <Champ libelle="Lot"><Liste value={servitude.lotId ?? ""} onChange={(e) => setServitude({ ...servitude, lotId: e.target.value || undefined })}><option value="">—</option>{d.lots.map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}</Liste></Champ>
            <Champ libelle="Propriétaire" className="md:col-span-2"><Saisie value={servitude.proprietaire} onChange={(e) => setServitude({ ...servitude, proprietaire: e.target.value })} /></Champ>
            <Champ libelle="Contact"><Saisie value={servitude.contact ?? ""} onChange={(e) => setServitude({ ...servitude, contact: e.target.value || undefined })} placeholder="téléphone, e-mail, notaire…" /></Champ>
            <Champ libelle="Type"><Liste value={servitude.type} onChange={(e) => setServitude({ ...servitude, type: e.target.value as TypeServitude })}>{TYPES_SRV.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Statut"><Liste value={servitude.statut} onChange={(e) => setServitude({ ...servitude, statut: e.target.value as StatutServitude })}>{STATUTS_SRV.map((t) => <option key={t}>{t}</option>)}</Liste></Champ>
            <Champ libelle="Emprise"><Saisie value={servitude.emprise ?? ""} onChange={(e) => setServitude({ ...servitude, emprise: e.target.value || undefined })} placeholder="ex. 45 m, 120 m2" /></Champ>
            <Champ libelle="Indemnité (CHF)"><Saisie type="number" value={servitude.indemnite || ""} onChange={(e) => setServitude({ ...servitude, indemnite: Number(e.target.value) })} /></Champ>
            <Champ libelle="Échéance (signature visée)"><Saisie type="date" value={servitude.echeance ?? ""} onChange={(e) => setServitude({ ...servitude, echeance: e.target.value || undefined })} /></Champ>
            <Champ libelle="Date de signature"><Saisie type="date" value={servitude.dateSignature ?? ""} onChange={(e) => setServitude({ ...servitude, dateSignature: e.target.value || undefined })} /></Champ>
            <Champ libelle="Remarque" className="md:col-span-3"><Zone rows={2} value={servitude.remarque ?? ""} onChange={(e) => setServitude({ ...servitude, remarque: e.target.value || undefined })} /></Champ>
          </div>
        </Modale>
      )}

      {action && <FormulaireAction initial={action} onFermer={() => setAction(null)} />}
    </>
  );
}
