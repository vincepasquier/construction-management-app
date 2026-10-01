import { useEffect, useRef, useState } from "react";
import { Cloud, Database, Download, FolderPlus, History, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { COLLECTIONS, exporterDonnees, useStore } from "../store/useStore";
import { telecharger } from "../lib/csv";
import { importerAncienneSession } from "../lib/importAncien";
import { aujourdhui } from "../lib/format";
import { Badge, Bouton, Carte, Champ, EnTetePage, Saisie } from "../components/ui";
import type { DonneesDemo } from "../data/demo";
import type { ParametresSharePoint } from "../types";

export function Parametres() {
  const { sharePoint, setSharePoint, remplacerDonnees, fusionnerDonnees, reinitialiserDemo, viderTout, setProjetActif } = useStore();
  const [sp, setSp] = useState<ParametresSharePoint>(sharePoint);
  const [sante, setSante] = useState<{ ok: boolean; cleConfiguree?: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fichierJson = useRef<HTMLInputElement>(null);
  const fichierAncien = useRef<HTMLInputElement>(null);
  const fichierProjet = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/sante").then((r) => r.json()).then(setSante).catch(() => setSante({ ok: false }));
  }, []);

  const lireJson = async (f: File) => JSON.parse(await f.text()) as unknown;

  return (
    <>
      <EnTetePage titre="Paramètres" description="Intégrations, sauvegarde et import des données" />
      {message && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre={<span className="flex items-center gap-2"><Cloud size={16} /> SharePoint / Microsoft 365</span>}
          sousTitre="Application Entra ID de type « Single-page application »">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Champ libelle="Client ID de l'application"><Saisie value={sp.clientId} onChange={(e) => setSp({ ...sp, clientId: e.target.value.trim() })} placeholder="00000000-0000-…" /></Champ>
            <Champ libelle="Tenant ID"><Saisie value={sp.tenantId} onChange={(e) => setSp({ ...sp, tenantId: e.target.value.trim() })} placeholder="organisation.onmicrosoft.com" /></Champ>
            <Champ libelle="Hôte SharePoint"><Saisie value={sp.hostname} onChange={(e) => setSp({ ...sp, hostname: e.target.value.trim() })} placeholder="entreprise.sharepoint.com" /></Champ>
            <Champ libelle="Chemin du site"><Saisie value={sp.sitePath} onChange={(e) => setSp({ ...sp, sitePath: e.target.value.trim() })} placeholder="/sites/Projets" /></Champ>
            <Champ libelle="Dossier racine des projets" className="sm:col-span-2" aide="Dans la bibliothèque « Documents » du site. Chaque projet utilise un sous-dossier (voir fiche projet).">
              <Saisie value={sp.dossierRacine} onChange={(e) => setSp({ ...sp, dossierRacine: e.target.value })} />
            </Champ>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Dans le portail Azure : <em>Inscriptions d'applications → Nouvelle inscription</em>, plateforme « SPA » avec l'URI de redirection <code className="rounded bg-white px-1 dark:bg-slate-900">{window.location.origin}</code>,
              puis autorisations déléguées Microsoft Graph <code>Sites.ReadWrite.All</code> et <code>Files.ReadWrite.All</code> (consentement administrateur).
            </div>
            <div className="sm:col-span-2 flex justify-end"><Bouton variante="primaire" onClick={() => { setSharePoint(sp); setMessage("Configuration SharePoint enregistrée."); }}>Enregistrer</Bouton></div>
          </div>
        </Carte>

        <Carte titre={<span className="flex items-center gap-2"><Sparkles size={16} /> Assistant IA</span>} sousTitre="Claude (Anthropic), appelé via le serveur de la plateforme">
          <div className="space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2">Serveur API :
              {sante === null ? <Badge>vérification…</Badge> : sante.ok ? <Badge couleur="vert">en ligne</Badge> : <Badge couleur="rouge">injoignable</Badge>}
            </p>
            {sante?.ok && <p className="flex items-center gap-2">Clé API : {sante.cleConfiguree ? <Badge couleur="vert">configurée</Badge> : <Badge couleur="orange">non détectée</Badge>}</p>}
            <p className="text-slate-600 dark:text-slate-400">
              La clé <code>ANTHROPIC_API_KEY</code> se renseigne dans le fichier <code>.env</code> du serveur ; elle n'est jamais transmise au navigateur.
              L'assistant reçoit un résumé des données du projet actif (finances, contrats, AO, planning, documents) pour chaque question.
            </p>
          </div>
        </Carte>

        <Carte titre={<span className="flex items-center gap-2"><Database size={16} /> Sauvegarde</span>} sousTitre="Les données sont stockées dans ce navigateur">
          <div className="flex flex-wrap gap-2 p-5">
            <Bouton icone={<Download size={15} />} onClick={() => telecharger(`chantier-plus_${aujourdhui()}.json`, JSON.stringify({ format: "chantier-plus", version: 1, date: new Date().toISOString(), donnees: exporterDonnees() }, null, 2), "application/json")}>Exporter tout (JSON)</Bouton>
            <input ref={fichierJson} type="file" accept=".json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try {
                const j = (await lireJson(f)) as { donnees?: DonneesDemo };
                if (!j.donnees?.projets) throw new Error("Format non reconnu");
                if (confirm("Remplacer toutes les données actuelles par ce fichier ?")) { remplacerDonnees(j.donnees); setMessage("Sauvegarde restaurée."); }
              } catch (er) { alert(`Import impossible : ${er instanceof Error ? er.message : er}`); }
              e.target.value = "";
            }} />
            <Bouton icone={<Upload size={15} />} onClick={() => fichierJson.current?.click()}>Restaurer une sauvegarde</Bouton>
            <input ref={fichierProjet} type="file" accept=".json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try {
                const j = (await lireJson(f)) as { donnees?: Partial<DonneesDemo> };
                const projets = j.donnees?.projets ?? [];
                if (!projets.length) throw new Error("Aucun projet dans ce fichier");
                const existants = useStore.getState().projets.filter((p) => projets.some((x) => x.id === p.id));
                if (existants.length && !confirm(`Le projet ${existants.map((p) => p.code).join(", ")} existe déjà : le remplacer par celui du fichier ?`)) return;
                // Les données existantes de ces projets sont remplacées ; personnes et entreprises sont fusionnées
                const ids = new Set(projets.map((p) => p.id));
                useStore.setState((etat) => {
                  const patch: Record<string, unknown> = {};
                  for (const c of COLLECTIONS) {
                    const actuels = etat[c] as { id: string; projetId?: string }[];
                    const ajout = (j.donnees![c] ?? []) as { id: string }[];
                    const nouveaux = new Set(ajout.map((x) => x.id));
                    patch[c] = [...actuels.filter((x) => !nouveaux.has(x.id) && !(x.projetId && ids.has(x.projetId)) && !(c === "projets" && ids.has(x.id))), ...ajout];
                  }
                  return patch;
                });
                setProjetActif(projets[0].id);
                setMessage(`Projet ajouté : ${projets.map((p) => `${p.code} ${p.nom}`).join(", ")}. Les autres projets sont conservés.`);
              } catch (er) { alert(`Import impossible : ${er instanceof Error ? er.message : er}`); }
              e.target.value = "";
            }} />
            <Bouton icone={<FolderPlus size={15} />} onClick={() => fichierProjet.current?.click()}>Ajouter un projet depuis un fichier</Bouton>
          </div>
          <p className="px-5 pb-5 -mt-2 text-xs text-slate-500">« Restaurer » remplace toutes les données ; « Ajouter un projet » ajoute ou met à jour les projets du fichier sans toucher aux autres.</p>
        </Carte>

        <Carte titre={<span className="flex items-center gap-2"><History size={16} /> Import depuis l'ancienne application</span>} sousTitre="Fichier JSON « Export session » de l'application de suivi financier">
          <div className="space-y-3 p-5 text-sm text-slate-600 dark:text-slate-400">
            <p>Crée un nouveau projet avec : lots d'estimation → budget CFC, appels d'offres et offres → comparatif, commandes → contrats (offres complémentaires → avenants), factures.</p>
            <input ref={fichierAncien} type="file" accept=".json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try {
                const { resume, ...donnees } = importerAncienneSession(await lireJson(f));
                fusionnerDonnees(donnees);
                setProjetActif(donnees.projets![0].id);
                setMessage(`Import réussi : ${resume}. Complétez la fiche projet (code, dates, maître d'ouvrage).`);
              } catch (er) { alert(`Import impossible : ${er instanceof Error ? er.message : er}`); }
              e.target.value = "";
            }} />
            <Bouton variante="primaire" icone={<Upload size={15} />} onClick={() => fichierAncien.current?.click()}>Importer une session</Bouton>
          </div>
        </Carte>

        <Carte titre="Zone sensible" className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 p-5">
            <Bouton icone={<RotateCcw size={15} />} onClick={() => confirm("Remplacer toutes les données par le jeu de démonstration ?") && reinitialiserDemo()}>Recharger la démonstration</Bouton>
            <Bouton variante="danger" icone={<Trash2 size={15} />} onClick={() => confirm("Supprimer définitivement toutes les données de ce navigateur ? Pensez à exporter une sauvegarde.") && viderTout()}>Tout effacer</Bouton>
          </div>
        </Carte>
      </div>
    </>
  );
}
