import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, Mail, Network, Pencil, Phone, Printer, RefreshCw, Sparkles, Square, Wand2 } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { useUI } from "../store/useUI";
import { COULEUR_NOEUD, descendance, enfants, genererDepuisProjet, modeleType } from "../lib/organigramme";
import { nouvelId } from "../lib/id";
import { ArbreOrganigramme, LegendeOrganigramme, useOccupant } from "../components/Organigramme";
import { Avatar, Bouton, Carte, Champ, cx, EnTetePage, Liste, Modale, Saisie, Tableau, useLectureSeule } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { NoeudOrganigramme, TypeNoeud } from "../types";

const TYPES = Object.keys(COULEUR_NOEUD) as TypeNoeud[];

const ETAPES_AIDE = [
  { titre: "Le sommet : le maître d'ouvrage", texte: "Placez en tête le mandant (commune, canton, association…) et, si elle existe, la commission de construction qui décide pour lui." },
  { titre: "La direction de projet", texte: "Sous le maître d'ouvrage : le directeur de projet, interlocuteur unique qui coordonne tous les intervenants." },
  { titre: "Mandataires et direction des travaux", texte: "Rattachez à la direction de projet les mandataires spécialisés (ingénieur civil, géotechnicien, géomètre…) et la direction des travaux." },
  { titre: "Les lots et leurs entreprises", texte: "Créez un nœud par lot avec son responsable, puis ajoutez sous chaque lot les entreprises adjudicataires." },
];

export function Organigramme() {
  const d = useProjetActif();
  const { ajouter, modifier, supprimer, personnes, entreprises } = useStore();
  const { setOrganigramme } = useUI();
  const lecture = useLectureSeule();
  const [edition, setEdition] = useState(false);
  const [noeud, setNoeud] = useState<NoeudOrganigramme | null>(null);
  if (!d.projet) return <SansProjet />;
  const projet = d.projet;
  const noeuds = d.organigramme;

  const remplacer = (nouveaux: NoeudOrganigramme[]) => {
    noeuds.forEach((x) => supprimer("organigramme", x.id));
    nouveaux.forEach((x) => ajouter("organigramme", x));
    setEdition(true);
  };
  const generer = () => remplacer(genererDepuisProjet(projet, useStore.getState().lots.filter((l) => l.projetId === projet.id), personnes,
    useStore.getState().contrats.filter((c) => c.projetId === projet.id), entreprises));

  const ajouterEnfant = (parentId?: string) => setNoeud({
    id: nouvelId("org"), projetId: projet.id, parentId, type: parentId ? "Autre" : "Maître d'ouvrage", titre: "", ordre: enfants(noeuds, parentId).length,
  });

  const deplacer = (n: NoeudOrganigramme, sens: -1 | 1) => {
    const freres = enfants(noeuds, n.parentId);
    const i = freres.findIndex((x) => x.id === n.id);
    const autre = freres[i + sens];
    if (!autre) return;
    modifier("organigramme", n.id, { ordre: autre.ordre });
    modifier("organigramme", autre.id, { ordre: n.ordre });
  };

  // Premier lancement : assistant de création
  if (noeuds.length === 0) {
    return (
      <>
        <EnTetePage titre="Organigramme du projet" description="Qui fait quoi : construisez la structure du projet en quelques clics" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Comment voulez-vous commencer ?</p>
            {[
              { icone: <Wand2 size={22} />, titre: "Générer à partir du projet", texte: "Utilise le maître d'ouvrage, le directeur de projet, les lots et leurs responsables, les mandataires et les entreprises sous contrat.", action: generer, recommande: true },
              { icone: <LayoutTemplate size={22} />, titre: "Partir d'un modèle type", texte: "Structure classique d'un projet d'infrastructure (MO, commission, direction de projet, mandataires, direction des travaux, lots) à compléter.", action: () => remplacer(modeleType(projet.id)) },
              { icone: <Square size={22} />, titre: "Partir de zéro", texte: "Une seule case au sommet ; ajoutez ensuite les niveaux un à un.", action: () => remplacer([{ id: nouvelId("org"), projetId: projet.id, type: "Maître d'ouvrage", titre: "Maître d'ouvrage", nomLibre: projet.maitreOuvrage, ordre: 0 }]) },
            ].map((o) => (
              <button key={o.titre} disabled={lecture} onClick={o.action} className="flex w-full items-start gap-4 rounded-xl bg-white p-5 text-left ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-300 disabled:opacity-60 dark:bg-slate-900 dark:ring-slate-800">
                <span className="rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-indigo-950">{o.icone}</span>
                <span>
                  <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">{o.titre}{o.recommande && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Recommandé</span>}</span>
                  <span className="mt-1 block text-sm text-slate-500">{o.texte}</span>
                </span>
              </button>
            ))}
          </div>
          <AideConstruction />
        </div>
      </>
    );
  }

  return (
    <>
      <EnTetePage titre="Organigramme du projet" description={edition ? "Survolez une case pour ajouter un subordonné, la modifier ou la supprimer" : "Toujours accessible en un clic via le bouton « Organigramme » en haut de l'écran"}
        actions={<>
          <Bouton libre icone={<Network size={15} />} onClick={() => setOrganigramme(true)}>Plein écran</Bouton>
          <Bouton libre icone={<Printer size={15} />} onClick={() => { setOrganigramme(true); setTimeout(() => window.print(), 300); }}>Imprimer</Bouton>
          {edition && <Bouton icone={<RefreshCw size={15} />} onClick={() => confirm("Remplacer l'organigramme actuel par une version générée à partir des données du projet ?") && generer()}>Régénérer</Bouton>}
          <Bouton variante={edition ? "primaire" : "secondaire"} icone={edition ? <Check size={15} /> : <Pencil size={15} />} onClick={() => setEdition(!edition)}>{edition ? "Terminer" : "Modifier"}</Bouton>
        </>} />

      <div className="grid gap-6 xl:grid-cols-4">
        <Carte className={cx("overflow-auto", edition ? "xl:col-span-3" : "xl:col-span-4")}>
          <ArbreOrganigramme noeuds={noeuds} edition={edition} onAjouter={ajouterEnfant} onModifier={setNoeud}
            onSupprimer={(n) => {
              const ids = descendance(noeuds, n.id);
              if (confirm(ids.length > 1 ? `Supprimer « ${n.titre} » et ses ${ids.length - 1} subordonné(s) ?` : `Supprimer « ${n.titre} » ?`)) ids.forEach((id) => supprimer("organigramme", id));
            }} />
          <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800"><LegendeOrganigramme /></div>
        </Carte>
        {edition && <AideConstruction />}
      </div>

      <Carte className="mt-6" titre="Annuaire du projet" sousTitre="Coordonnées de tous les intervenants de l'organigramme">
        <Annuaire noeuds={noeuds} />
      </Carte>

      {noeud && (
        <Modale ouverte onFermer={() => setNoeud(null)} titre={noeuds.some((x) => x.id === noeud.id) ? "Modifier la fonction" : "Nouvelle fonction"}
          pied={<>
            <Bouton libre onClick={() => setNoeud(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!noeud.titre} onClick={() => {
              if (noeuds.some((x) => x.id === noeud.id)) modifier("organigramme", noeud.id, noeud); else ajouter("organigramme", noeud);
              setNoeud(null);
            }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Type">
              <Liste value={noeud.type} onChange={(e) => setNoeud({ ...noeud, type: e.target.value as TypeNoeud, titre: noeud.titre || e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="Rattaché à">
              <Liste value={noeud.parentId ?? ""} onChange={(e) => setNoeud({ ...noeud, parentId: e.target.value || undefined })}>
                <option value="">— (sommet)</option>
                {noeuds.filter((x) => !descendance(noeuds, noeud.id).includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="Fonction / intitulé" className="col-span-2"><Saisie value={noeud.titre} onChange={(e) => setNoeud({ ...noeud, titre: e.target.value })} placeholder="ex. Ingénieur civil, Lot 2 – Réseaux…" /></Champ>
            <Champ libelle="Membre de l'équipe">
              <Liste value={noeud.personneId ?? ""} onChange={(e) => setNoeud({ ...noeud, personneId: e.target.value || undefined, entrepriseId: e.target.value ? undefined : noeud.entrepriseId })}>
                <option value="">—</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom} ({p.role})</option>)}
              </Liste>
            </Champ>
            <Champ libelle="ou entreprise / mandataire">
              <Liste value={noeud.entrepriseId ?? ""} onChange={(e) => setNoeud({ ...noeud, entrepriseId: e.target.value || undefined, personneId: e.target.value ? undefined : noeud.personneId })}>
                <option value="">—</option>{entreprises.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </Liste>
            </Champ>
            <Champ libelle="ou nom libre" className="col-span-2" aide="Pour une personne externe qui n'est pas dans l'équipe ni dans les entreprises">
              <Saisie value={noeud.nomLibre ?? ""} onChange={(e) => setNoeud({ ...noeud, nomLibre: e.target.value || undefined })} />
            </Champ>
            {noeuds.some((x) => x.id === noeud.id) && (
              <div className="col-span-2 flex items-center gap-2 text-sm text-slate-500">
                Position parmi les fonctions du même niveau :
                <Bouton taille="sm" icone={<ArrowLeft size={14} />} onClick={() => deplacer(noeud, -1)}>Avant</Bouton>
                <Bouton taille="sm" icone={<ArrowRight size={14} />} onClick={() => deplacer(noeud, 1)}>Après</Bouton>
              </div>
            )}
          </div>
        </Modale>
      )}
    </>
  );
}

function AideConstruction() {
  return (
    <Carte titre={<span className="flex items-center gap-2"><Sparkles size={15} className="text-brand-600" /> Construire l'organigramme</span>} className="h-fit">
      <ol className="space-y-4 p-5">
        {ETAPES_AIDE.map((e, i) => (
          <li key={e.titre} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
            <div><p className="text-sm font-medium text-slate-900 dark:text-white">{e.titre}</p><p className="mt-0.5 text-xs text-slate-500">{e.texte}</p></div>
          </li>
        ))}
      </ol>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">
        Astuce : les responsables de lot se règlent dans Ressources → Organisation des lots ; « Régénérer » reprend ces informations.
      </p>
    </Carte>
  );
}

function LigneAnnuaire({ n }: { n: NoeudOrganigramme }) {
  const o = useOccupant(n);
  return (
    <tr>
      <td><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COULEUR_NOEUD[n.type] }} />{n.titre}</span></td>
      <td>{o.nom ? <span className="inline-flex items-center gap-2">{o.estPersonne && <Avatar nom={o.nom} taille={22} />}{o.nom}</span> : <span className="text-slate-400">À attribuer</span>}</td>
      <td className="text-slate-500">{o.detail}</td>
      <td>{o.email && <a href={`mailto:${o.email}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline dark:text-indigo-300"><Mail size={13} />{o.email}</a>}</td>
      <td>{o.telephone && <a href={`tel:${o.telephone}`} className="inline-flex items-center gap-1 hover:underline"><Phone size={13} />{o.telephone}</a>}</td>
    </tr>
  );
}

export function Annuaire({ noeuds }: { noeuds: NoeudOrganigramme[] }) {
  // Ordre de lecture : parcours en profondeur depuis le sommet
  const ordre: NoeudOrganigramme[] = [];
  const parcourir = (parentId?: string) => enfants(noeuds, parentId).forEach((x) => { ordre.push(x); parcourir(x.id); });
  parcourir(undefined);
  return (
    <Tableau>
      <thead><tr><th>Fonction</th><th>Nom</th><th>Organisation</th><th>E-mail</th><th>Téléphone</th></tr></thead>
      <tbody>{ordre.map((n) => <LigneAnnuaire key={n.id} n={n} />)}</tbody>
    </Tableau>
  );
}
