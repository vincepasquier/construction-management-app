// Types de projet : modules actifs, mode financier, phases et champs obligatoires. C'est ce
// paramétrage qui adapte la profondeur de l'outil à la nature du projet.
import { Plus } from "lucide-react";
import { useState } from "react";
import { notifier } from "@/app/etatUI";
import { useSuppression } from "@/app/suppression";
import { Badge, Bouton, Carte, Case, Champ, Liste, Panneau, Saisie, Zone } from "@/app/ui";
import { nouvelId } from "@/domaine/lib/id";
import { MODULES } from "@/domaine/socle/droits";
import { PHASES_GROUPE, type TypeProjet } from "@/domaine/socle/types";
import { useDonnees } from "@/donnees/hooks";
import { LIBELLE_CHAMP } from "../projet/libelles";

const CHAMPS_POSSIBLES = ["code", "nom", "description", "directeurId", "sponsorId", "directionId", "portefeuilleId", "programmeId", "dateDebut", "dateFin", "classification", "compteAnalytique", "maitreOuvrage", "lieu"] as const;
const PARAMETRABLES = MODULES.filter((m) => !["parametres", "acces", "archives", "vuesGroupe", "entreprises", "portefeuille"].includes(m.id));

export function TypesProjet() {
  const { typesProjet, projets, ajouter, modifier } = useDonnees();
  const supprimer = useSuppression();
  const [edition, setEdition] = useState<TypeProjet | null>(null);
  const nouveau = (): TypeProjet => ({ id: nouvelId("type"), nom: "", description: "", modeFinancier: "synthese", modules: ["portefeuille", "finances", "risques", "planning", "taches", "documents"], phases: [...PHASES_GROUPE], champsObligatoires: { "*": ["code", "nom", "directeurId"] }, champs: [] });
  const existe = edition && typesProjet.some((t) => t.id === edition.id);
  const basculer = <T,>(liste: T[], x: T) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x]);

  const enregistrer = () => {
    if (!edition) return;
    if (existe) modifier("typesProjet", edition.id, edition);
    else ajouter("typesProjet", edition);
    setEdition(null);
  };
  const retirer = () => {
    if (!edition) return;
    const n = projets.filter((p) => p.typeProjetId === edition.id).length;
    if (n) { notifier(`${n} projet(s) utilisent ce type : il ne peut pas être supprimé.`, "erreur"); return; }
    void supprimer("typesProjet", edition.id, { quoi: `le type « ${edition.nom} »` }).then((ok) => ok && setEdition(null));
  };

  return (
    <>
      <div className="mb-4 flex justify-end"><Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition(nouveau())}>Type de projet</Bouton></div>
      <div className="grid gap-4 md:grid-cols-2">
        {typesProjet.map((t) => (
          <Carte key={t.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{t.nom}</h3>
                <p className="mt-0.5 text-sm text-slate-500">{t.description}</p>
              </div>
              <Bouton taille="sm" onClick={() => setEdition(t)}>Paramétrer</Bouton>
            </div>
            <p className="mt-3 flex flex-wrap gap-1.5">
              <Badge couleur={t.modeFinancier === "positions" ? "violet" : "bleu"}>{t.modeFinancier === "positions" ? "Finances par position" : "Finances depuis la source"}</Badge>
              <Badge>{t.modules.length} modules</Badge>
              <Badge>{t.phases.length} phases</Badge>
              <Badge>{projets.filter((p) => p.typeProjetId === t.id).length} projets</Badge>
            </p>
          </Carte>
        ))}
      </div>
      {edition && (
        <Panneau ouverte large onFermer={() => setEdition(null)} titre={existe ? `Type « ${edition.nom} »` : "Nouveau type de projet"}
          pied={<>
            {existe && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={retirer}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setEdition(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!edition.nom.trim()} onClick={enregistrer}>Enregistrer</Bouton>
          </>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Nom" obligatoire><Saisie value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></Champ>
            <Champ libelle="Mode financier" aide="« Par position » active le suivi budgétaire détaillé de la construction.">
              <Liste value={edition.modeFinancier} onChange={(e) => setEdition({ ...edition, modeFinancier: e.target.value as TypeProjet["modeFinancier"] })}>
                <option value="synthese">Depuis le système source (synthèse)</option>
                <option value="positions">Par position budgétaire (calcul PRISM)</option>
              </Liste>
            </Champ>
            <Champ libelle="Description" className="sm:col-span-2"><Zone rows={2} value={edition.description} onChange={(e) => setEdition({ ...edition, description: e.target.value })} /></Champ>
          </div>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Modules actifs</h3>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {PARAMETRABLES.map((m) => (
              <Case key={m.id} checked={edition.modules.includes(m.id)} onChange={() => setEdition({ ...edition, modules: basculer(edition.modules, m.id) })}
                libelle={<>{m.libelle}{m.portee === "construction" && <span className="ml-1.5 text-xs text-slate-400">construction</span>}</>} />
            ))}
          </div>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Phases de gouvernance</h3>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {PHASES_GROUPE.map((ph) => <Case key={ph} libelle={ph} checked={edition.phases.includes(ph)} onChange={() => setEdition({ ...edition, phases: PHASES_GROUPE.filter((x) => basculer(edition.phases, ph).includes(x)) })} />)}
          </div>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Champs obligatoires de la fiche (toutes phases)</h3>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {CHAMPS_POSSIBLES.map((c) => (
              <Case key={c} libelle={LIBELLE_CHAMP[c] ?? c} checked={(edition.champsObligatoires["*"] ?? []).includes(c)}
                onChange={() => setEdition({ ...edition, champsObligatoires: { ...edition.champsObligatoires, "*": basculer(edition.champsObligatoires["*"] ?? [], c) } })} />
            ))}
          </div>
          <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Champs propres au type</h3>
          <div className="space-y-2">
            {edition.champs.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Saisie value={c.libelle} placeholder="Libellé" onChange={(e) => setEdition({ ...edition, champs: edition.champs.map((x, j) => (j === i ? { ...x, libelle: e.target.value, cle: x.cle || nouvelId("c") } : x)) })} />
                <Liste className="!w-36" value={c.type} onChange={(e) => setEdition({ ...edition, champs: edition.champs.map((x, j) => (j === i ? { ...x, type: e.target.value as typeof c.type } : x)) })}>
                  <option value="texte">Texte</option><option value="nombre">Nombre</option><option value="date">Date</option><option value="liste">Liste</option>
                </Liste>
                {c.type === "liste" && <Saisie value={(c.options ?? []).join(", ")} placeholder="Valeurs, séparées par des virgules" onChange={(e) => setEdition({ ...edition, champs: edition.champs.map((x, j) => (j === i ? { ...x, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x)) })} />}
                <Bouton variante="fantome" onClick={() => setEdition({ ...edition, champs: edition.champs.filter((_, j) => j !== i) })}>Retirer</Bouton>
              </div>
            ))}
            <Bouton taille="sm" icone={<Plus size={14} />} onClick={() => setEdition({ ...edition, champs: [...edition.champs, { cle: nouvelId("c"), libelle: "", type: "texte" }] })}>Champ</Bouton>
          </div>
        </Panneau>
      )}
    </>
  );
}
