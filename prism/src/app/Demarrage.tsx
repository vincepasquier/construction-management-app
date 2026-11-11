// Premier lancement : la base est vide. Trois départs possibles, dont la reprise de Chantier+.
import { ArrowRight, DatabaseZap, FolderInput, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useDepot } from "../donnees/hooks";
import { chargerDemo, demarrerVide, reprendreChantierPlus } from "../donnees/initialisation";
import { detecterChantierPlus } from "../donnees/reprise";
import { lireChantierPlus } from "../donnees/reprise";
import { lireSauvegarde, restaurerSauvegarde } from "../donnees/sauvegarde";
import { Alerte, Bouton, Saisie } from "./ui";

export function Demarrage() {
  const depot = useDepot();
  const ancien = useMemo(() => detecterChantierPlus(), []);
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const lancer = async (libelle: string, action: () => void | Promise<void>) => {
    setEnCours(libelle);
    setErreur(null);
    try { await action(); } catch (e) { setErreur(e instanceof Error ? e.message : "Opération impossible."); }
    setEnCours(null);
  };

  const depuisFichier = (f: File | undefined) => f && lancer("Lecture du fichier…", async () => {
    const lue = lireSauvegarde(new Uint8Array(await f.arrayBuffer()));
    if (lue.type === "prism") await restaurerSauvegarde(depot, lue);
    else reprendreChantierPlus(depot, lireChantierPlus(lue.brut)!);
  });

  const choix = (icone: ReactNode, titre: string, texte: ReactNode, action: ReactNode) => (
    <div className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-sky-300">{icone}</div>
      <h2 className="font-semibold text-slate-900 dark:text-white">{titre}</h2>
      <div className="mt-1 flex-1 text-sm text-slate-500">{texte}</div>
      <div className="mt-4">{action}</div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">PRISM</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Pilotage, reporting et gestion intégrée des projets</h1>
      <p className="mt-2 max-w-2xl text-slate-500">La base de ce navigateur est vide. Choisissez comment commencer ; vous pourrez tout effacer ou restaurer une sauvegarde plus tard, dans l'administration.</p>
      {erreur && <div className="mt-4"><Alerte type="erreur">{erreur}</Alerte></div>}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {ancien && choix(<FolderInput size={20} />, "Reprendre Chantier+",
          <>Ce navigateur contient les données de Chantier+ : <strong>{ancien.donnees.projets?.length ?? 0} projet(s)</strong>. Elles sont copiées dans PRISM ; rien n'est modifié dans Chantier+.</>,
          <Bouton variante="primaire" disabled={!!enCours} icone={<ArrowRight size={15} />} onClick={() => lancer("Reprise…", () => { reprendreChantierPlus(depot, ancien); })}>Reprendre mes données</Bouton>)}
        {choix(<Sparkles size={20} />, "Découvrir avec la démonstration",
          "Un portefeuille fictif : deux projets de construction complets et des projets numériques, d'investissement et d'organisation venus de la source simulée.",
          <Bouton variante={ancien ? "secondaire" : "primaire"} disabled={!!enCours} onClick={() => lancer("Chargement…", () => chargerDemo(depot))}>Charger la démonstration</Bouton>)}
        {choix(<DatabaseZap size={20} />, "Commencer à vide",
          <><span>Seuls les référentiels sont installés. Vous serez l'administrateur.</span><Saisie libre className="mt-3" placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} /></>,
          <Bouton disabled={!!enCours || nom.trim().length < 2} onClick={() => lancer("Création…", () => { demarrerVide(depot, nom); })}>Créer la base</Bouton>)}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Vous avez un fichier ?{" "}
        <label className="cursor-pointer font-medium text-brand-600 underline underline-offset-2">
          Restaurer une sauvegarde PRISM ou un export Chantier+
          <input type="file" accept=".zip,.json" hidden onChange={(e) => { void depuisFichier(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </p>
      {enCours && <p className="mt-3 text-sm text-slate-500" role="status">{enCours}</p>}
    </div>
  );
}
