import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Gavel, Plus } from "lucide-react";
import { parcoursMarche } from "../lib/parcours";
import { FormulaireContrat } from "./Contrats";
import { useProjetActif, useStore } from "../store/useStore";
import { montantNetSoumission } from "../lib/finance";
import { aujourdhui, formatCHF, formatDate, joursEntre } from "../lib/format";
import { nouvelId } from "../lib/id";
import { CFC_OPTIONS, libelleCFC } from "../data/cfc";
import { Bouton, Carte, Champ, EnTetePage, Liste, Modale, Onglets, Saisie, Tableau, Vide } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { AppelOffres, ProcedureAO, StatutAO } from "../types";

export const PROCEDURES: ProcedureAO[] = ["Ouverte", "Sélective", "Sur invitation", "Gré à gré"];
export const STATUTS_AO: StatutAO[] = ["Préparation", "Publié", "Ouverture des offres", "Évaluation", "Adjugé", "Annulé"];

export function AppelsOffres() {
  const d = useProjetActif();
  const { entreprises, ajouter, contrats, factures } = useStore();
  const [greAGre, setGreAGre] = useState(false);
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState<"tous" | "cours" | "termines">("cours");
  const [creation, setCreation] = useState(false);
  if (!d.projet) return <SansProjet />;
  const jour = aujourdhui();

  const liste = d.appelsOffres.filter((a) =>
    filtre === "tous" ? true : filtre === "cours" ? !["Adjugé", "Annulé"].includes(a.statut) : ["Adjugé", "Annulé"].includes(a.statut));

  return (
    <>
      <EnTetePage titre="Marchés & appels d'offres" description="Du descriptif CAN à l'adjudication, puis au contrat et aux factures"
        actions={<>
          <Bouton icone={<FileSignature size={16} />} onClick={() => setGreAGre(true)}>Marché de gré à gré</Bouton>
          <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setCreation(true)}>Nouvel appel d'offres</Bouton>
        </>} />

      <div className="mb-4">
        <Onglets valeur={filtre} onChange={setFiltre} options={[
          { id: "cours", libelle: "En cours", compte: d.appelsOffres.filter((a) => !["Adjugé", "Annulé"].includes(a.statut)).length },
          { id: "termines", libelle: "Terminés" },
          { id: "tous", libelle: "Tous", compte: d.appelsOffres.length },
        ]} />
      </div>

      <Carte>
        {liste.length === 0 ? (
          <Vide icone={<Gavel size={22} />} titre="Aucun appel d'offres" texte="Créez un appel d'offres pour préparer le descriptif CAN et recevoir les soumissions." />
        ) : (
          <Tableau>
            <thead><tr><th>N°</th><th>Objet</th><th>CFC</th><th>Procédure</th><th>Retour des offres</th><th>Offres</th><th className="!text-right">Estimation</th><th className="!text-right">Meilleure offre</th><th>Avancement du marché</th></tr></thead>
            <tbody>
              {liste.map((a) => {
                const montants = a.soumissions.map((s) => montantNetSoumission(a, s)).filter((m) => m > 0);
                const meilleure = montants.length ? Math.min(...montants) : 0;
                const ecart = a.montantEstime && meilleure ? ((meilleure - a.montantEstime) / a.montantEstime) * 100 : null;
                const jours = joursEntre(jour, a.dateRetour);
                return (
                  <tr key={a.id} className="cursor-pointer" onClick={() => navigate(`/appels-offres/${a.id}`)}>
                    <td className="font-medium text-brand-700 dark:text-indigo-300">{a.numero}</td>
                    <td className="font-medium">{a.objet}</td>
                    <td className="text-slate-500"><span className="num">{a.cfc}</span> {libelleCFC(a.cfc)}</td>
                    <td>{a.procedure}</td>
                    <td>
                      {formatDate(a.dateRetour)}
                      {["Publié", "Préparation"].includes(a.statut) && jours >= 0 && <span className="ml-2 text-xs text-slate-500">J-{jours}</span>}
                    </td>
                    <td>{a.soumissions.length} / {a.entreprisesInvitees.length || "—"}</td>
                    <td className="num text-right">{formatCHF(a.montantEstime)}</td>
                    <td className="num text-right">
                      {meilleure ? formatCHF(meilleure) : "—"}
                      {ecart !== null && <span className={`ml-1 text-xs ${ecart > 0 ? "text-rose-600" : "text-emerald-600"}`}>{ecart > 0 ? "+" : ""}{ecart.toFixed(1)}%</span>}
                    </td>
                    <td>
                      {(() => {
                        const etapes = parcoursMarche(a, contrats.find((c) => c.appelOffresId === a.id), factures);
                        const actuelle = etapes.find((e) => e.etat === "actuel");
                        return (
                          <div title={etapes.map((e) => `${e.libelle} : ${e.detail}`).join("\n")}>
                            <div className="flex gap-1">{etapes.map((e) => <span key={e.id} className={`h-1.5 w-5 rounded-full ${e.etat === "fait" ? "bg-emerald-500" : e.etat === "actuel" ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"}`} />)}</div>
                            <p className="mt-1 text-xs text-slate-500">{a.statut === "Annulé" ? "Annulé" : actuelle ? actuelle.libelle : "Clôturé"}{a.adjudicataireId && ` · ${entreprises.find((e) => e.id === a.adjudicataireId)?.nom}`}</p>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
      </Carte>

      {greAGre && <FormulaireContrat projetId={d.projet.id} numeroSuggere={`C-${d.projet.code}-${String(contrats.filter((c) => c.projetId === d.projet!.id).length + 1).padStart(2, "0")}`}
        onFermer={() => setGreAGre(false)} onEnregistrer={(c) => { ajouter("contrats", c); navigate(`/contrats/${c.id}`); }} />}

      {creation && (
        <FormulaireAO projetId={d.projet.id} numeroSuggere={`AO-${d.projet.code}-${String(d.appelsOffres.length + 1).padStart(2, "0")}`}
          onFermer={() => setCreation(false)} onEnregistrer={(a) => { ajouter("appelsOffres", a); navigate(`/appels-offres/${a.id}`); }} />
      )}
    </>
  );
}

export function FormulaireAO({ projetId, numeroSuggere, initial, onFermer, onEnregistrer }: {
  projetId: string; numeroSuggere?: string; initial?: AppelOffres; onFermer: () => void; onEnregistrer: (a: AppelOffres) => void;
}) {
  const { lots, entreprises } = useStore();
  const [a, setA] = useState<AppelOffres>(() => initial ?? {
    id: nouvelId("ao"), projetId, numero: numeroSuggere ?? "", objet: "", cfc: "", procedure: "Ouverte", statut: "Préparation",
    dateEnvoi: aujourdhui(), dateRetour: aujourdhui(), montantEstime: 0, positions: [], soumissions: [], entreprisesInvitees: [],
    criteres: [
      { id: nouvelId("cr"), nom: "Prix", poids: 60, estPrix: true },
      { id: nouvelId("cr"), nom: "Références", poids: 20 },
      { id: nouvelId("cr"), nom: "Organisation et délais", poids: 20 },
    ],
  });
  const maj = (p: Partial<AppelOffres>) => setA((x) => ({ ...x, ...p }));
  const lotsProjet = lots.filter((l) => l.projetId === projetId);
  const suggerees = entreprises.filter((e) => a.cfc && e.specialites.some((s) => a.cfc.startsWith(s) || s.startsWith(a.cfc)));

  return (
    <Modale ouverte onFermer={onFermer} titre={initial ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!a.numero || !a.objet || !a.cfc} onClick={() => { onEnregistrer(a); onFermer(); }}>Enregistrer</Bouton></>}>
      <div className="grid grid-cols-2 gap-4">
        <Champ libelle="Numéro"><Saisie value={a.numero} onChange={(e) => maj({ numero: e.target.value })} /></Champ>
        <Champ libelle="Statut"><Liste value={a.statut} onChange={(e) => maj({ statut: e.target.value as StatutAO })}>{STATUTS_AO.map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
        <Champ libelle="Objet" className="col-span-2"><Saisie value={a.objet} onChange={(e) => maj({ objet: e.target.value })} placeholder="Travaux de génie civil…" /></Champ>
        <Champ libelle="Code CFC">
          <Saisie list="cfc-ao" value={a.cfc} onChange={(e) => maj({ cfc: e.target.value.trim() })} placeholder="461" />
          <datalist id="cfc-ao">{CFC_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}</datalist>
        </Champ>
        <Champ libelle="Lot">
          <Liste value={a.lotId ?? ""} onChange={(e) => maj({ lotId: e.target.value || undefined })}>
            <option value="">—</option>{lotsProjet.map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Procédure" aide="Selon AIMP / seuils cantonaux"><Liste value={a.procedure} onChange={(e) => maj({ procedure: e.target.value as ProcedureAO })}>{PROCEDURES.map((s) => <option key={s}>{s}</option>)}</Liste></Champ>
        <Champ libelle="Estimation HT (CHF)"><Saisie type="number" value={a.montantEstime || ""} onChange={(e) => maj({ montantEstime: Number(e.target.value) })} /></Champ>
        <Champ libelle="Envoi / publication"><Saisie type="date" value={a.dateEnvoi} onChange={(e) => maj({ dateEnvoi: e.target.value })} /></Champ>
        <Champ libelle="Retour des offres"><Saisie type="date" value={a.dateRetour} onChange={(e) => maj({ dateRetour: e.target.value })} /></Champ>
        <Champ libelle="Entreprises invitées / intéressées" className="col-span-2" aide={suggerees.length ? `Suggestions selon CFC : ${suggerees.map((e) => e.nom).join(", ")}` : undefined}>
          <div className="flex flex-wrap gap-2">
            {entreprises.map((e) => {
              const actif = a.entreprisesInvitees.includes(e.id);
              return (
                <button key={e.id} type="button" onClick={() => maj({ entreprisesInvitees: actif ? a.entreprisesInvitees.filter((x) => x !== e.id) : [...a.entreprisesInvitees, e.id] })}
                  className={`rounded-full px-3 py-1 text-xs ring-1 transition ${actif ? "bg-brand-600 text-white ring-brand-600" : suggerees.includes(e) ? "bg-brand-50 text-brand-700 ring-brand-300 dark:bg-indigo-950 dark:text-indigo-200" : "ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800"}`}>
                  {e.nom}
                </button>
              );
            })}
          </div>
        </Champ>
      </div>
    </Modale>
  );
}
