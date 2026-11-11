// Bons de régie : travaux payés au temps passé. Le bon est saisi, puis validé de façon
// contradictoire ; validé, il ne se modifie plus et peut être rattaché à une facture.
import { Check, Download, FileSignature, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { useSuppression } from "@/app/suppression";
import { lireNombre } from "@/app/table/TableDonnees";
import { Alerte, Badge, Bouton, Carte, Champ, Indicateur, LectureSeule, Liste, Panneau, Saisie, Tableau, useLectureSeule, Vide, Zone, type CouleurBadge } from "@/app/ui";
import { Montant } from "@/app/ui/metier";
import { bilanRegies, manquesRegie, numeroSuivant, regieFigee, totalLigneRegie, totalRegie, totalRegieParType, TYPES_LIGNE_REGIE, UNITE_PAR_TYPE } from "@/domaine/lib/chantier";
import { aujourdhui, formatCHFPrecis, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { LigneRegie, Regie } from "@/domaine/types-chantier";
import { useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { exporterRegie } from "./exportChantier";

const COULEUR: Record<Regie["statut"], CouleurBadge> = { Saisi: "orange", "Validé": "vert", "Contesté": "rouge", "Facturé": "bleu" };

export function Regies() {
  const d = useProjet();
  const { entreprises, personnes, ajouter, modifier } = useDonnees();
  const lecture = useLectureSeule();
  const [edition, setEdition] = useState<Regie | null>(null);
  const [statut, setStatut] = useState("");
  if (!d.projet) return null;
  const projet = d.projet;
  const bilan = bilanRegies(d.regies);
  const libelleContrat = (id?: string) => { const c = d.contrats.find((x) => x.id === id); return c ? `${c.numero} · ${entreprises.find((e) => e.id === c.entrepriseId)?.nom ?? ""}` : ""; };
  const existe = (r: Regie) => d.regies.some((x) => x.id === r.id);
  const nouveau = (): Regie => ({ id: nouvelId("reg"), projetId: projet.id, numero: numeroSuivant(d.regies, "BR"), date: aujourdhui(), objet: "", lignes: [], statut: "Saisi", contratId: d.contrats.length === 1 ? d.contrats[0].id : undefined });
  const liste = d.regies.filter((r) => !statut || r.statut === statut).sort((a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero));
  const bouton = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition(nouveau())}>Bon de régie</Bouton>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="À valider" valeur={bilan.aValider} tendance={bilan.aValider ? "alerte" : "bon"} detail={bilan.aValider ? <Montant v={bilan.montantAValider} /> : "aucun bon en attente"} />
        <Indicateur libelle="Validé, non facturé" valeur={<Montant v={bilan.valide} />} detail="à retrouver sur une facture" />
        <Indicateur libelle="Facturé" valeur={<Montant v={bilan.facture} />} />
        <Indicateur libelle="Contesté" valeur={<Montant v={bilan.conteste} />} tendance={bilan.conteste ? "mauvais" : undefined} detail="hors total" />
      </div>
      <Carte titre="Bons de régie" sousTitre={`${bilan.nombre} bon(s) · ${formatCHFPrecis(bilan.total)} HT, hors bons contestés`}
        action={<div className="flex items-center gap-2">
          {d.regies.length > 0 && <div className="w-40"><Liste libre aria-label="État des bons" value={statut} onChange={(e) => setStatut(e.target.value)}><option value="">Tous les états</option>{(["Saisi", "Validé", "Contesté", "Facturé"] as const).map((s) => <option key={s}>{s}</option>)}</Liste></div>}
          {bouton}
        </div>}>
        {d.regies.length === 0 ? <Vide icone={<FileSignature size={22} />} titre="Aucun bon de régie" texte="Heures de main-d'œuvre, matériel et engins commandés hors des prix du contrat : le bon se saisit le jour même et se valide avec l'entreprise." action={bouton} /> : (
          <Tableau>
            <thead><tr><th>N°</th><th>Date</th><th>Travaux</th><th>Contrat</th><th className="text-right">Montant HT</th><th>État</th></tr></thead>
            <tbody>{liste.map((r) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setEdition(r)}>
                <td className="num font-medium whitespace-nowrap">{r.numero}</td><td className="whitespace-nowrap">{formatDate(r.date)}</td><td className="font-medium">{r.objet}</td><td>{libelleContrat(r.contratId) || "—"}</td>
                <td className="text-right num">{formatCHFPrecis(totalRegie(r))}</td>
                <td><Badge couleur={COULEUR[r.statut]}>{r.statut}</Badge>{r.statut === "Validé" && r.valideParId && <span className="ml-2 hidden text-xs text-slate-500 lg:inline">{personnes.find((p) => p.id === r.valideParId)?.nom}</span>}</td>
              </tr>
            ))}</tbody>
          </Tableau>
        )}
      </Carte>
      {edition && <EditeurRegie key={edition.id} initiale={edition} nouvelle={!existe(edition)} libelleContrat={libelleContrat} onFermer={() => setEdition(null)}
        onEnregistrer={(r, fermer = true) => { if (existe(r)) modifier("regies", r.id, r); else ajouter("regies", r); setEdition(fermer ? null : r); }} />}
    </div>
  );
}

function EditeurRegie({ initiale, nouvelle, libelleContrat, onFermer, onEnregistrer }: { initiale: Regie; nouvelle: boolean; libelleContrat: (id?: string) => string; onFermer: () => void; onEnregistrer: (r: Regie, fermer?: boolean) => void }) {
  const d = useProjet();
  const { modifier, entreprises } = useDonnees();
  const utilisateur = useUtilisateur();
  const supprimer = useSuppression();
  const lectureGlobale = useLectureSeule();
  const [r, setR] = useState(initiale);
  const fige = regieFigee(initiale);
  const lecture = lectureGlobale || fige;
  const maj = (patch: Partial<Regie>) => setR((x) => ({ ...x, ...patch }));
  const majLigne = (id: string, patch: Partial<LigneRegie>) => maj({ lignes: r.lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const propre = (): Regie => ({ ...r, objet: r.objet.trim(), contratId: r.contratId || undefined, remarques: r.remarques?.trim() || undefined, lignes: r.lignes.filter((l) => l.libelle.trim() || l.quantite || l.prixUnitaire) });
  const manques = manquesRegie(propre());
  const parType = totalRegieParType(r);
  const contrat = d.contrats.find((c) => c.id === r.contratId);
  const facturesRegie = d.factures.filter((f) => f.contratId === r.contratId);

  const enregistrer = () => {
    if (!r.objet.trim()) { notifier("Indiquez l'objet des travaux en régie.", "erreur"); return; }
    onEnregistrer(propre());
  };
  const valider = () => {
    if (manques.length) { notifier(`Avant validation, il manque : ${manques.join(", ")}.`, "erreur"); return; }
    onEnregistrer({ ...propre(), statut: "Validé", valideParId: utilisateur?.id, dateValidation: aujourdhui() });
  };
  // Sur un bon figé, seuls l'état et la facture évoluent : l'écriture passe directement par le dépôt
  const changerEtat = (patch: Partial<Regie>, libelle: string) => { modifier("regies", r.id, patch, { libelle }); onFermer(); };
  const rouvrir = async () => {
    if (await confirmer({ titre: `Rouvrir le bon ${r.numero}`, message: "Le bon redevient modifiable et devra être validé à nouveau.", action: "Rouvrir" })) changerEtat({ statut: "Saisi", valideParId: undefined, dateValidation: undefined, factureId: undefined }, `Réouverture du bon de régie ${r.numero}`);
  };

  return (
    <Panneau ouverte large onFermer={onFermer} titre={<>{nouvelle ? "Nouveau bon de régie" : `Bon de régie ${r.numero}`}<span className="ml-2"><Badge couleur={COULEUR[initiale.statut]}>{initiale.statut}</Badge></span></>}
      pied={fige ? <>
        {!lectureGlobale && <Bouton variante="fantome" className="mr-auto" icone={<RotateCcw size={14} />} onClick={() => void rouvrir()}>Rouvrir</Bouton>}
        <Bouton libre icone={<Download size={14} />} onClick={() => void exporterRegie(d.projet!, initiale, { contrat: libelleContrat(initiale.contratId) })}>Word</Bouton>
        <Bouton libre onClick={onFermer}>Fermer</Bouton>
      </> : <>
        {!nouvelle && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={async () => { if (await supprimer("regies", r.id, { quoi: `le bon de régie ${r.numero}` })) onFermer(); }}>Supprimer</Bouton>}
        {!nouvelle && <Bouton libre icone={<Download size={14} />} onClick={() => void exporterRegie(d.projet!, propre(), { contrat: libelleContrat(r.contratId) })}>Word</Bouton>}
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        {!nouvelle && initiale.statut === "Saisi" && <Bouton icone={<X size={14} />} onClick={() => onEnregistrer({ ...propre(), statut: "Contesté" })}>Contester</Bouton>}
        <Bouton onClick={enregistrer}>Enregistrer</Bouton>
        <Bouton variante="primaire" icone={<Check size={14} />} onClick={valider} title="Bon reconnu par la direction des travaux et l'entreprise : il ne se modifie plus">Valider</Bouton>
      </>}>
      <LectureSeule.Provider value={lecture}>
        <div className="space-y-5">
          {fige && <Alerte type="info">Bon validé{initiale.dateValidation ? ` le ${formatDate(initiale.dateValidation)}` : ""} : son contenu est figé. Rouvrez-le pour le corriger.</Alerte>}
          <div className="grid gap-4 sm:grid-cols-[8rem_10rem_1fr]">
            <Champ libelle="N°"><Saisie value={r.numero} onChange={(e) => maj({ numero: e.target.value })} /></Champ>
            <Champ libelle="Date des travaux"><Saisie type="date" value={r.date} onChange={(e) => maj({ date: e.target.value })} /></Champ>
            <Champ libelle="Contrat" obligatoire><Liste value={r.contratId ?? ""} onChange={(e) => maj({ contratId: e.target.value || undefined })}><option value="">—</option>{d.contrats.map((c) => <option key={c.id} value={c.id}>{c.numero} · {entreprises.find((e) => e.id === c.entrepriseId)?.nom} · {c.objet}</option>)}</Liste></Champ>
          </div>
          <Champ libelle="Travaux exécutés en régie" obligatoire><Saisie value={r.objet} onChange={(e) => maj({ objet: e.target.value })} placeholder="Ex. Dégagement d'une conduite non répertoriée, profil 12" /></Champ>

          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Lignes</h4>
              {!lecture && <div className="flex gap-1.5">{TYPES_LIGNE_REGIE.map((t) => <Bouton key={t} taille="sm" icone={<Plus size={13} />} onClick={() => maj({ lignes: [...r.lignes, { id: nouvelId("lr"), type: t, libelle: "", quantite: 0, unite: UNITE_PAR_TYPE[t], prixUnitaire: 0 }] })}>{t}</Bouton>)}</div>}
            </div>
            {r.lignes.length === 0 ? <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/50">Ajoutez la main-d'œuvre, le matériel et les engins mis en œuvre.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="pb-1.5 pr-2 font-medium">Type</th><th className="pb-1.5 pr-2 font-medium">Désignation</th><th className="w-20 pb-1.5 pr-2 text-right font-medium">Quantité</th><th className="w-16 pb-1.5 pr-2 font-medium">Unité</th><th className="w-24 pb-1.5 pr-2 text-right font-medium">Prix unit.</th><th className="w-28 pb-1.5 text-right font-medium">Total</th><th className="w-8" /></tr></thead>
                  <tbody>{r.lignes.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1 pr-2"><div className="w-40"><Liste aria-label="Type de ligne" value={l.type} onChange={(e) => majLigne(l.id, { type: e.target.value as LigneRegie["type"] })}>{TYPES_LIGNE_REGIE.map((t) => <option key={t}>{t}</option>)}</Liste></div></td>
                      <td className="py-1 pr-2"><Saisie aria-label="Désignation" value={l.libelle} onChange={(e) => majLigne(l.id, { libelle: e.target.value })} placeholder={l.type === "Main-d'œuvre" ? "Qualification" : l.type === "Engin" ? "Engin, tonnage" : "Fourniture"} /></td>
                      <td className="py-1 pr-2"><Saisie aria-label="Quantité" inputMode="decimal" className="text-right num" defaultValue={l.quantite || ""} key={`q-${l.id}-${l.quantite}`} onBlur={(e) => majLigne(l.id, { quantite: lireNombre(e.target.value) })} /></td>
                      <td className="py-1 pr-2"><Saisie aria-label="Unité" value={l.unite} onChange={(e) => majLigne(l.id, { unite: e.target.value })} /></td>
                      <td className="py-1 pr-2"><Saisie aria-label="Prix unitaire" inputMode="decimal" className="text-right num" defaultValue={l.prixUnitaire || ""} key={`p-${l.id}-${l.prixUnitaire}`} onBlur={(e) => majLigne(l.id, { prixUnitaire: lireNombre(e.target.value) })} /></td>
                      <td className="py-1 text-right num">{formatCHFPrecis(totalLigneRegie(l))}</td>
                      <td className="py-1 text-right">{!lecture && <button type="button" aria-label="Retirer la ligne" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800" onClick={() => maj({ lignes: r.lignes.filter((x) => x.id !== l.id) })}><Trash2 size={14} /></button>}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot>
                    {Object.entries(parType).length > 1 && Object.entries(parType).map(([t, v]) => <tr key={t} className="text-xs text-slate-500"><td colSpan={5} className="pt-1 pr-2 text-right">{t}</td><td className="pt-1 text-right num">{formatCHFPrecis(v)}</td><td /></tr>)}
                    <tr className="font-semibold"><td colSpan={5} className="pt-2 pr-2 text-right">Total HT</td><td className="pt-2 text-right num">{formatCHFPrecis(totalRegie(r))}</td><td /></tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
          <Champ libelle="Remarques"><Zone rows={2} value={r.remarques ?? ""} onChange={(e) => maj({ remarques: e.target.value })} placeholder="Qui a ordonné les travaux, pourquoi ils sortent du contrat" /></Champ>
          {!lecture && !nouvelle && manques.length > 0 && <p className="text-xs text-slate-500">Avant validation, il manque : {manques.join(", ")}.</p>}
        </div>
      </LectureSeule.Provider>

      {fige && !lectureGlobale && (
        <section className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Facturation</h4>
          <p className="mb-3 text-xs text-slate-500">Rattachez le bon à la facture de l'entreprise qui le reprend{contrat ? ` (contrat ${contrat.numero})` : ""}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1"><Liste aria-label="Facture" value={r.factureId ?? ""} onChange={(e) => maj({ factureId: e.target.value || undefined })}><option value="">Aucune facture</option>{facturesRegie.map((f) => <option key={f.id} value={f.id}>{f.numero} · {formatDate(f.date)} · {f.type}</option>)}</Liste></div>
            {initiale.statut === "Validé"
              ? <Bouton variante="primaire" onClick={() => changerEtat({ statut: "Facturé", factureId: r.factureId }, `Bon de régie ${r.numero} facturé`)}>Marquer facturé</Bouton>
              : <Bouton onClick={() => changerEtat({ statut: "Validé", factureId: undefined }, `Bon de régie ${r.numero} : facturation annulée`)}>Annuler la facturation</Bouton>}
          </div>
        </section>
      )}
    </Panneau>
  );
}
