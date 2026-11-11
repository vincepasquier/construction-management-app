// Journal d'audit : qui a modifié quoi, quand, depuis quelle source, avec l'ancienne et la nouvelle
// valeur. Sert à l'historique d'un projet, d'un objet, et au journal complet de l'administration.
import { ChevronRight, Download, History, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Bouton, Carte, cx, Liste, Saisie, Vide, type CouleurBadge } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import { niveau } from "@/domaine/socle/droits";
import { journalVisible, lignesAudit } from "@/donnees/audit";
import { detailler, resumerValeur } from "@/donnees/diff";
import { useDepot, useDonnees, useJournal, useUtilisateur } from "@/donnees/hooks";
import { filtrerJournal, type EntreeJournal, type Origine } from "@/donnees/journal";
import { META, type NomCollection } from "@/donnees/schema";
import { telechargerXlsx } from "@/outils/telechargement";

const ORIGINE: Record<Origine, { libelle: string; couleur: CouleurBadge }> = {
  saisie: { libelle: "Saisie", couleur: "gris" }, import: { libelle: "Import", couleur: "bleu" }, connecteur: { libelle: "Source", couleur: "bleu" },
  ia: { libelle: "IA", couleur: "violet" }, migration: { libelle: "Migration", couleur: "gris" }, systeme: { libelle: "Système", couleur: "gris" },
};
const OPERATION = { creer: "Créé", modifier: "Modifié", supprimer: "Supprimé" } as const;
const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
const PAGE = 60;

/** `objet` : historique d'un seul enregistrement, présenté sans filtres */
export function Journal({ projetId, objet, compact }: { projetId?: string; objet?: { collection: NomCollection; id: string }; compact?: boolean }) {
  const depot = useDepot();
  const utilisateur = useUtilisateur();
  const { personnes, projets } = useDonnees();
  const journal = useJournal();
  const [texte, setTexte] = useState("");
  const [acteurId, setActeurId] = useState("");
  const [origine, setOrigine] = useState("");
  const [collection, setCollection] = useState("");
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [limite, setLimite] = useState(PAGE);

  const visibles = useMemo(() => journalVisible(depot, utilisateur), [depot, utilisateur, journal.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const entrees = useMemo(() => {
    const f = filtrerJournal(visibles, { projetId, collection: (objet?.collection ?? (collection || undefined)) as NomCollection | undefined, id: objet?.id, acteurId: acteurId || undefined, texte });
    return (origine ? f.filter((e) => e.origine === origine) : f).slice().reverse();
  }, [visibles, projetId, objet?.collection, objet?.id, collection, acteurId, texte, origine]);
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? (id ? "Utilisateur supprimé" : "Système");
  const collections = useMemo(() => [...new Set(visibles.flatMap((e) => e.changements.map((c) => c.collection)))].sort((a, b) => META[a].libelle.localeCompare(META[b].libelle, "fr")), [visibles]);
  const peutExporter = niveau(utilisateur, "parametres") !== "aucun" || niveau(utilisateur, "portefeuille") === "ecriture";

  const exporter = () => telechargerXlsx(`journal-audit${projetId ? `-${projets.find((p) => p.id === projetId)?.code}` : ""}`, [{
    nom: "Journal", largeurs: [17, 22, 11, 14, 40, 22, 34, 26, 30, 30, 30],
    lignes: [
      ["Date", "Auteur", "Origine", "Projet", "Action", "Type", "Objet", "Champ", "Ancienne valeur", "Nouvelle valeur", "Motif"],
      ...lignesAudit(depot, entrees.slice().reverse()).map((l) => [l.date.replace("T", " ").slice(0, 16), l.auteur, l.origine, l.projet, l.action, l.type, l.objet, l.champ, l.avant, l.apres, l.motif]),
    ],
  }]);

  const liste = (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {entrees.slice(0, limite).map((e) => <Ligne key={e.seq} e={e} nom={nom} ouvert={ouvert === e.seq} basculer={() => setOuvert(ouvert === e.seq ? null : e.seq)} seulement={objet} code={projetId ? undefined : projets.find((p) => p.id === e.projetId)?.code} />)}
    </ul>
  );
  if (objet) return entrees.length === 0 ? <p className="text-sm text-slate-500">Aucune modification enregistrée.</p> : liste;

  return (
    <Carte>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 pas-impression">
          <div className="min-w-48 flex-1"><Saisie libre aria-label="Filtrer le journal" placeholder="Filtrer : libellé, objet, motif…" value={texte} onChange={(e) => { setTexte(e.target.value); setLimite(PAGE); }} /></div>
          <div className="w-44"><Liste libre aria-label="Auteur" value={acteurId} onChange={(e) => setActeurId(e.target.value)}><option value="">Tous les auteurs</option>{[...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste></div>
          <div className="w-48"><Liste libre aria-label="Type d'objet" value={collection} onChange={(e) => setCollection(e.target.value)}><option value="">Tous les objets</option>{collections.map((c) => <option key={c} value={c}>{META[c].libelle}</option>)}</Liste></div>
          <div className="w-36"><Liste libre aria-label="Origine" value={origine} onChange={(e) => setOrigine(e.target.value)}><option value="">Toute origine</option>{(Object.keys(ORIGINE) as Origine[]).map((o) => <option key={o} value={o}>{ORIGINE[o].libelle}</option>)}</Liste></div>
          <span className="text-xs text-slate-400 num">{entrees.length} entrée(s)</span>
          {peutExporter && <Bouton libre taille="sm" variante="fantome" icone={<Download size={14} />} onClick={exporter}>Excel</Bouton>}
        </div>
      )}
      {entrees.length === 0 ? <Vide icone={<History size={22} />} titre="Aucune entrée" texte="Chaque création, modification ou suppression laisse ici une trace : auteur, date, ancienne et nouvelle valeur." /> : liste}
      {entrees.length > limite && <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800"><Bouton libre taille="sm" variante="fantome" onClick={() => setLimite(limite + PAGE * 2)}>Afficher la suite ({entrees.length - limite})</Bouton></div>}
    </Carte>
  );
}

function Ligne({ e, nom, ouvert, basculer, seulement, code }: { e: EntreeJournal; nom: (id?: string) => string; ouvert: boolean; basculer: () => void; seulement?: { collection: NomCollection; id: string }; code?: string }) {
  const changements = seulement ? e.changements.filter((c) => c.collection === seulement.collection && c.id === seulement.id) : e.changements;
  const detail = changements.length > 0;
  return (
    <li className={cx(e.annuleePar !== undefined && "opacity-60")}>
      <button type="button" disabled={!detail} onClick={basculer} aria-expanded={ouvert} className={cx("flex w-full items-start gap-3 px-4 py-2.5 text-left", detail && "hover:bg-slate-50/70 dark:hover:bg-slate-800/40")}>
        <ChevronRight size={14} className={cx("mt-1 shrink-0 text-slate-400 transition", ouvert && "rotate-90", !detail && "invisible")} />
        <span className="w-28 shrink-0 text-xs text-slate-500 num">{formatDate(e.date)}<br />{heure(e.date)}</span>
        <span className="min-w-0 flex-1">
          <span className={cx("block text-sm text-slate-900 dark:text-white", e.annuleePar !== undefined && "line-through")}>{e.libelle}{code && <span className="ml-2 text-xs text-slate-400">{code}</span>}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {nom(e.acteurId)}
            {e.volumes && <span>· {e.volumes.crees} créés, {e.volumes.modifies} modifiés, {e.volumes.supprimes} supprimés</span>}
            {e.motif && <span className="text-slate-600 dark:text-slate-300">· motif : {e.motif}</span>}
            {e.annule !== undefined && <span className="inline-flex items-center gap-1"><Undo2 size={11} /> annulation</span>}
            {e.annuleePar !== undefined && <span>· annulée</span>}
          </span>
        </span>
        <Badge couleur={ORIGINE[e.origine].couleur}>{ORIGINE[e.origine].libelle}</Badge>
      </button>
      {ouvert && detail && (
        <div className="space-y-2 bg-slate-50/60 px-4 pb-3 pl-14 pt-1 dark:bg-slate-900/40">
          {changements.map((c, i) => (
            <div key={i} className="text-sm">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{OPERATION[c.op]} · {META[c.collection].libelle} · {c.objet}</p>
              {c.op === "modifier" && c.champs && (
                <table className="mt-1 w-full text-xs">
                  <tbody>
                    {c.champs.flatMap((ch) => detailler(ch)).map((d, j) => (
                      <tr key={j} className="align-top"><td className="w-56 py-0.5 pr-3 text-slate-500">{d.chemin}</td><td className="py-0.5 pr-2 text-rose-700 line-through decoration-rose-300 dark:text-rose-300">{resumerValeur(d.avant)}</td><td className="py-0.5 text-emerald-700 dark:text-emerald-300">{resumerValeur(d.apres)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

/** Page « Historique » d'un projet */
export function HistoriqueProjet({ projetId }: { projetId: string }) {
  return <Journal projetId={projetId} />;
}
