import { useMemo, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { lireTableau } from "../lib/lectureCsv";
import { importerPlanner } from "../lib/importPlanner";
import { importerContacts, lireContacts, organisationsProbablementInternes, roleDepuisFonction } from "../lib/importContacts";
import { aujourdhui } from "../lib/format";
import { Bouton, Modale } from "./ui";

type Feuilles = { sheet: string; data: unknown[][] }[];

function ChoixFichier({ accept, texte, onFichier }: { accept: string; texte: string; onFichier: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFichier(f); e.target.value = ""; }} />
      <button onClick={() => ref.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center hover:border-brand-400 dark:border-slate-700">
        <FileSpreadsheet size={28} className="text-slate-400" />
        <span className="max-w-md text-sm text-slate-600 dark:text-slate-400">{texte}</span>
      </button>
    </>
  );
}

const Erreur = ({ m }: { m: string }) => <p className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><AlertTriangle size={15} /> {m}</p>;

/** Import d'un plan Microsoft Planner (export Excel) dans les tâches du projet actif */
export function ImportPlanner({ onFermer }: { onFermer: () => void }) {
  const d = useProjetActif();
  const { personnes, ajouter, fusionnerDonnees } = useStore();
  const [feuilles, setFeuilles] = useState<Feuilles | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [creer, setCreer] = useState(true);
  const analyse = useMemo(() => {
    if (!feuilles || !d.projet) return null;
    try { return importerPlanner(feuilles, { projetId: d.projet.id, personnes, lots: d.lots, aujourdhui: aujourdhui() }); } catch (e) { return e instanceof Error ? e.message : String(e); }
  }, [feuilles, d.projet, personnes, d.lots]);
  const r = typeof analyse === "string" ? null : analyse;
  const lire = async (f: File) => { setErreur(null); try { setFeuilles(await lireTableau(f)); } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); } };
  const importer = () => {
    if (!r || !d.projet) return;
    let actions = r.actions;
    if (creer && r.personnesInconnues.length) {
      const ids = new Map<string, string>();
      for (const nom of r.personnesInconnues) {
        const id = `per-pl-${nom.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "-")}`;
        ids.set(nom, id);
        if (!personnes.some((p) => p.id === id)) ajouter("personnes", { id, nom, role: "Ingénieur", email: "", organisation: "", capacite: 100 });
      }
      // Réattribue les tâches dont le premier responsable vient d'être créé
      const res = importerPlanner(feuilles!, { projetId: d.projet.id, personnes: [...personnes, ...r.personnesInconnues.map((nom) => ({ id: ids.get(nom)!, nom, role: "Ingénieur" as const, email: "", organisation: "", capacite: 100 }))], lots: d.lots, aujourdhui: aujourdhui() });
      actions = res.actions;
    }
    fusionnerDonnees({ actions });
    onFermer();
  };
  return (
    <Modale ouverte large onFermer={onFermer} titre="Importer un plan Planner"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!r} onClick={importer}>Importer {r ? `${r.actions.length} tâches` : ""}</Bouton></>}>
      {!feuilles ? (
        <ChoixFichier accept=".xlsx,.csv" onFichier={lire} texte="Dans Planner : … (en haut à droite) › Exporter le plan vers Excel, puis choisissez le fichier. Responsables, échéances, avancement, priorités, notes et listes de contrôle sont repris." />
      ) : r ? (
        <div className="space-y-3 text-sm">
          <p>{r.resume}.</p>
          {r.personnesInconnues.length > 0 && (
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <input type="checkbox" className="mt-0.5" checked={creer} onChange={(e) => setCreer(e.target.checked)} />
              <span>Ajouter à l'équipe les personnes non trouvées : {r.personnesInconnues.join(", ")}.<br />
                <span className="text-xs">Importez d'abord la liste des parties prenantes (page Entreprises) pour reprendre leurs fonctions et adresses e-mail.</span></span>
            </label>
          )}
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
            {r.actions.slice(0, 40).map((a) => <li key={a.id}>{a.statut === "Terminé" ? "✓" : "○"} {a.titre} <span className="text-slate-500">· {a.origine}</span></li>)}
            {r.actions.length > 40 && <li className="text-slate-500">… et {r.actions.length - 40} autres</li>}
          </ul>
        </div>
      ) : null}
      {(erreur || typeof analyse === "string") && <Erreur m={erreur ?? (analyse as string)} />}
    </Modale>
  );
}

/** Import de la liste des parties prenantes (CSV/Excel d'une liste SharePoint) */
export function ImportPartiesPrenantes({ onFermer }: { onFermer: () => void }) {
  const { personnes, entreprises, fusionnerDonnees, modifier } = useStore();
  const d = useProjetActif();
  const [feuilles, setFeuilles] = useState<Feuilles | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [internes, setInternes] = useState<string[] | null>(null);
  const [affecter, setAffecter] = useState(true);
  const lignes = useMemo(() => {
    if (!feuilles) return null;
    for (const f of feuilles) { try { return lireContacts(f.data); } catch { /* feuille suivante */ } }
    return "Colonnes « Nom » et « Société » introuvables dans ce fichier.";
  }, [feuilles]);
  const liste = typeof lignes === "string" ? null : lignes;
  const organisations = liste ? [...new Set(liste.map((l) => l.societe).filter((s) => s && s !== "-"))] : [];
  const choix = internes ?? (liste ? organisationsProbablementInternes(liste) : []);
  const r = liste ? importerContacts(liste, { internes: choix, personnes, entreprises }) : null;

  const lire = async (f: File) => { setErreur(null); try { setFeuilles(await lireTableau(f)); } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); } };
  const importer = () => {
    if (!r) return;
    fusionnerDonnees({
      personnes: r.personnes, entreprises: r.entreprises,
      affectations: affecter && d.projet ? r.personnes.map((p) => ({ id: `aff-${p.id}`, personneId: p.id, projetId: d.projet!.id, pourcentage: 20, debut: d.projet!.dateDebut, fin: d.projet!.dateFin })) : [],
    });
    for (const m of r.personnesMaj) modifier("personnes", m.id, m.patch);
    for (const m of r.entreprisesMaj) modifier("entreprises", m.id, { contacts: m.contacts });
    onFermer();
  };
  return (
    <Modale ouverte large onFermer={onFermer} titre="Importer la liste des parties prenantes"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!r} onClick={importer}>Importer</Bouton></>}>
      {!feuilles ? (
        <ChoixFichier accept=".csv,.xlsx" onFichier={lire} texte="Fichier CSV ou Excel avec les colonnes Nom, Prénom, Société, Fonction, Adresse mail, Téléphone, Remarques (ex. export d'une liste SharePoint)." />
      ) : liste && r ? (
        <div className="space-y-4 text-sm">
          <p>{liste.length} personnes lues. {r.resume}.</p>
          <div>
            <p className="mb-1 font-medium">Organisations internes : leurs collaborateurs deviennent des membres de l'équipe</p>
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-lg bg-slate-50 p-3 sm:grid-cols-2 dark:bg-slate-800/50">
              {organisations.map((o) => (
                <label key={o} className="flex items-center gap-2">
                  <input type="checkbox" checked={choix.includes(o)} onChange={(e) => setInternes(e.target.checked ? [...choix, o] : choix.filter((x) => x !== o))} />{o}
                </label>
              ))}
            </div>
          </div>
          {d.projet && <label className="flex items-center gap-2"><input type="checkbox" checked={affecter} onChange={(e) => setAffecter(e.target.checked)} /> Affecter les nouveaux membres au projet {d.projet.code} (20 % par défaut, à ajuster dans Ressources)</label>}
          <p className="text-xs text-slate-500">Rôles proposés d'après la fonction : {r.personnes.slice(0, 4).map((p) => `${p.nom} → ${roleDepuisFonction(p.fonction ?? "")}`).join(" ; ")}{r.personnes.length > 4 ? "…" : ""}</p>
        </div>
      ) : null}
      {(erreur || typeof lignes === "string") && <Erreur m={erreur ?? (lignes as string)} />}
    </Modale>
  );
}
