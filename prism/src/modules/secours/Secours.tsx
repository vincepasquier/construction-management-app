// Page de secours, indépendante des modules : exporter ou restaurer la base même si le reste de
// l'application ne s'affiche plus.
import { Download, LifeBuoy, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmer } from "../../app/etatUI";
import { Alerte, Bouton, Carte, Confirmation } from "../../app/ui";
import { aujourdhui, formatDate } from "../../domaine/lib/format";
import type { Depot } from "../../donnees/depot";
import { reprendreChantierPlus } from "../../donnees/initialisation";
import { COLLECTIONS } from "../../donnees/schema";
import { creerSauvegarde, lireSauvegarde, restaurerSauvegarde } from "../../donnees/sauvegarde";
import { session } from "../../donnees/session";
import { telechargerBlob } from "../../outils/telechargement";

export async function telechargerSauvegarde(depot: Depot): Promise<void> {
  const zip = await creerSauvegarde(depot);
  telechargerBlob(`prism-sauvegarde-${aujourdhui()}.zip`, new Blob([zip as BlobPart], { type: "application/zip" }));
  session.ecrire({ derniereSauvegarde: new Date().toISOString() });
}

/** `integre` : affichée comme onglet de l'administration, sans en-tête ni lien de retour */
export function Secours({ depot, erreur, integre }: { depot: Depot; erreur?: string; integre?: boolean }) {
  const [message, setMessage] = useState<{ type: "info" | "erreur"; texte: string } | null>(null);
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);
  const [version, setVersion] = useState(0);
  const derniere = session.utiliser((s) => s.derniereSauvegarde);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setQuota({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
  }, [version]);

  const total = depot.ouvert ? COLLECTIONS.reduce((s, c) => s + depot.tous(c).length, 0) : 0;
  const executer = async (action: () => Promise<string>) => {
    setMessage(null);
    try { setMessage({ type: "info", texte: await action() }); } catch (e) { setMessage({ type: "erreur", texte: e instanceof Error ? e.message : "Opération impossible." }); }
    setVersion((v) => v + 1);
  };

  const restaurer = (f: File | undefined) => f && executer(async () => {
    const lue = lireSauvegarde(new Uint8Array(await f.arrayBuffer()));
    const r = lue.resume;
    const ok = await confirmer({
      titre: lue.type === "prism" ? "Restaurer cette sauvegarde" : "Reprendre cet export Chantier+",
      message: lue.type === "prism"
        ? `Sauvegarde du ${formatDate(r.date)} : ${r.projets} projet(s), ${r.enregistrements} enregistrements, ${r.fichiers} fichier(s).\n\nToute la base actuelle sera remplacée.`
        : `${r.projets} projet(s) et ${r.enregistrements} enregistrements seront ajoutés à la base actuelle.`,
      action: lue.type === "prism" ? "Remplacer la base" : "Reprendre", danger: lue.type === "prism",
    });
    if (!ok) return "Restauration abandonnée.";
    if (lue.type === "prism") await restaurerSauvegarde(depot, lue);
    else reprendreChantierPlus(depot, { donnees: (lue.brut as { state?: object }).state ?? (lue.brut as object) });
    return "Données restaurées.";
  });

  const effacer = () => executer(async () => {
    const ok = await confirmer({ titre: "Effacer toute la base", message: "Toutes les données de PRISM dans ce navigateur seront supprimées. Téléchargez d'abord une sauvegarde si vous voulez les conserver.", action: "Tout effacer", danger: true });
    if (!ok) return "Rien n'a été effacé.";
    for (const f of await depot.listerFichiers()) await depot.supprimerFichier(f.id);
    await depot.vider();
    session.ecrire({ utilisateurId: null, dernierProjetId: null });
    return "La base est vide. Rechargez la page pour recommencer.";
  });

  return (
    <div className={integre ? "max-w-2xl" : "mx-auto max-w-2xl px-4 py-10"}>
      <div className={integre ? "hidden" : "mb-6 flex items-center gap-3"}>
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-sky-300"><LifeBuoy size={20} /></div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Sauvegarde et secours</h1>
          <p className="text-sm text-slate-500">Les données de PRISM vivent dans ce navigateur. Une sauvegarde régulière est la seule protection contre leur effacement.</p>
        </div>
      </div>
      {erreur && <div className="mb-4"><Alerte type="erreur"><p className="font-medium">L'application n'a pas pu démarrer normalement.</p><p className="mt-1 break-words text-xs">{erreur}</p></Alerte></div>}
      {message && <div className="mb-4"><Alerte type={message.type === "erreur" ? "erreur" : "info"}>{message.texte}</Alerte></div>}
      <Carte className="divide-y divide-slate-100 dark:divide-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Télécharger une sauvegarde</p>
            <p className="text-sm text-slate-500">{total} enregistrements · dernière sauvegarde : {derniere ? formatDate(derniere) : "jamais"}</p>
          </div>
          <Bouton libre variante="primaire" icone={<Download size={15} />} disabled={!depot.ouvert} onClick={() => executer(async () => { await telechargerSauvegarde(depot); return "Sauvegarde téléchargée."; })}>Télécharger (.zip)</Bouton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Restaurer depuis un fichier</p>
            <p className="text-sm text-slate-500">Sauvegarde PRISM (.zip) ou export Chantier+ (.json)</p>
          </div>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
            <Upload size={15} /> Choisir un fichier
            <input type="file" accept=".zip,.json" hidden onChange={(e) => { void restaurer(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Espace utilisé dans le navigateur</p>
            <p className="text-sm text-slate-500 num">{quota ? `${(quota.usage / 1_048_576).toFixed(1)} Mo sur ${(quota.quota / 1_073_741_824).toFixed(1)} Go disponibles` : "Mesure indisponible dans ce navigateur"}</p>
          </div>
          <Bouton libre variante="fantome" className="text-rose-600" icone={<Trash2 size={15} />} disabled={!depot.ouvert} onClick={effacer}>Effacer la base</Bouton>
        </div>
      </Carte>
      {integre
        ? <p className="mt-4 text-sm text-slate-500">Les données de PRISM vivent dans ce navigateur : une sauvegarde régulière est la seule protection contre leur effacement. En cas de blocage de l'application, cette page reste accessible à l'adresse <a className="font-medium text-brand-600" href="/secours">/secours</a>.</p>
        : <><p className="mt-6 text-sm"><a href="/" className="inline-flex items-center gap-1.5 font-medium text-brand-600"><RotateCcw size={14} /> Revenir à l'application</a></p><Confirmation /></>}
    </div>
  );
}
