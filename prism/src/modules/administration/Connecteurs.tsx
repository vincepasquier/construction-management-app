// État des connecteurs : ce qui est branché, ce qui est simulé, ce qui reste à ouvrir — et le
// journal des synchronisations avec la source de projets.
import { CheckCircle2, CircleDashed, Cloud, FlaskConical, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { notifier } from "@/app/etatUI";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, BandeauSimule, Bouton, Carte, Champ, Saisie, type CouleurBadge } from "@/app/ui";
import { anciennete } from "@/app/ui/metier";
import { formatDate } from "@/domaine/lib/format";
import type { ExecutionSynchro } from "@/domaine/socle/types";
import type { ParametresSharePoint } from "@/domaine/types";
import { dataPlatformSimulee } from "@/donnees/connecteurs/dataPlatformSimulee";
import { synchroniser } from "@/donnees/connecteurs/synchro";
import { useDepot, useDonnees, useMeta } from "@/donnees/hooks";
import { SHAREPOINT_VIDE } from "@/donnees/reglages";

type Etat = "Simulé" | "Par fichier" | "Opérationnel" | "Non raccordé";
const COULEUR: Record<Etat, CouleurBadge> = { "Simulé": "orange", "Par fichier": "bleu", "Opérationnel": "vert", "Non raccordé": "gris" };
const ICONE: Record<Etat, React.ReactNode> = { "Simulé": <FlaskConical size={15} />, "Par fichier": <CheckCircle2 size={15} />, "Opérationnel": <CheckCircle2 size={15} />, "Non raccordé": <CircleDashed size={15} /> };

const CONNECTEURS: { nom: string; role: string; etat: Etat; detail: string }[] = [
  { nom: "Data Platform (projets, budgets, réalisé, engagements)", role: "Source maître des projets et des valeurs financières de référence", etat: "Simulé", detail: "Catalogue fictif calculé à la date de synchronisation. L'interface « SourceProjets » est celle que consommera le vrai connecteur." },
  { nom: "Dynamics 365 (factures, commandes)", role: "Factures et engagements comptabilisés", etat: "Simulé", detail: "Les factures arrivent avec la Data Platform simulée. Les exports réels se chargent par fichier depuis les finances du projet." },
  { nom: "Classeur de suivi financier, export des factures, Planner, contacts", role: "Reprise de l'existant", etat: "Par fichier", detail: "Imports Excel et CSV depuis l'écran « Imports » de chaque projet." },
  { nom: "Messerli / CRB (.crbx, SIA 451)", role: "Descriptifs et offres des appels d'offres", etat: "Par fichier", detail: "Lecture des fichiers d'échange ; les soumissions restent dans le logiciel de devis." },
  { nom: "SharePoint", role: "Documents du projet", etat: "Non raccordé", detail: "Les documents sont référencés par lien. Le dépôt direct fonctionne dès qu'une inscription d'application est renseignée ci-dessus." },
  { nom: "Compte du groupe (Microsoft Entra ID)", role: "Identité et groupes", etat: "Simulé", detail: "L'utilisateur se choisit dans la barre du haut ; les droits appliqués sont ceux du profil choisi." },
  { nom: "Teams et courriel", role: "Notifications", etat: "Simulé", detail: "Les notifications restent dans l'application (cloche)." },
  { nom: "Assistant IA", role: "Analyse et rédaction à partir des données du projet", etat: "Opérationnel", detail: "Actif dès qu'une clé d'API est renseignée dans le fichier .env du serveur local." },
];

/** Inscription d'application nécessaire au dépôt direct de documents dans SharePoint */
function ReglagesSharePoint() {
  const [enregistre, setEnregistre] = useMeta<ParametresSharePoint>("sharePoint", SHAREPOINT_VIDE);
  const [sp, setSp] = useState(enregistre);
  const champ = (cle: keyof ParametresSharePoint, libelle: string, exemple: string, large = false) => (
    <Champ libelle={libelle} className={large ? "sm:col-span-2" : undefined}><Saisie value={sp[cle]} placeholder={exemple} onChange={(e) => setSp({ ...sp, [cle]: cle === "dossierRacine" ? e.target.value : e.target.value.trim() })} /></Champ>
  );
  return (
    <Carte titre={<span className="flex items-center gap-2"><Cloud size={16} /> SharePoint / Microsoft 365</span>} sousTitre="Application Entra ID de type « Single-page application »">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {champ("clientId", "Client ID de l'application", "00000000-0000-…")}
        {champ("tenantId", "Tenant ID", "organisation.onmicrosoft.com")}
        {champ("hostname", "Hôte SharePoint", "entreprise.sharepoint.com")}
        {champ("sitePath", "Chemin du site", "/sites/Projets")}
        {champ("dossierRacine", "Dossier racine des projets", "Projets", true)}
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2 dark:bg-slate-800 dark:text-slate-400">
          Dans le portail Azure : <em>Inscriptions d'applications → Nouvelle inscription</em>, plateforme « SPA » avec l'URI de redirection <code className="rounded bg-white px-1 dark:bg-slate-900">{window.location.origin}</code>,
          puis autorisations déléguées Microsoft Graph <code>Sites.ReadWrite.All</code> et <code>Files.ReadWrite.All</code> (consentement administrateur).
        </p>
        <div className="flex justify-end sm:col-span-2"><Bouton variante="primaire" onClick={() => { setEnregistre(sp); notifier("Configuration SharePoint enregistrée.", "succes"); }}>Enregistrer</Bouton></div>
      </div>
    </Carte>
  );
}

function EtatAssistant() {
  const [sante, setSante] = useState<{ ok: boolean; cleConfiguree?: boolean; modele?: string } | null>(null);
  useEffect(() => {
    fetch("/api/sante").then((r) => r.json()).then(setSante).catch(() => setSante({ ok: false }));
  }, []);
  return (
    <Carte titre={<span className="flex items-center gap-2"><Sparkles size={16} /> Assistant IA</span>} sousTitre="Appelé par le serveur local de l'application">
      <div className="space-y-3 p-5 text-sm">
        <p className="flex items-center gap-2">Serveur local : {sante === null ? <Badge>vérification…</Badge> : sante.ok ? <Badge couleur="vert">en ligne</Badge> : <Badge couleur="rouge">injoignable</Badge>}</p>
        {sante?.ok && <p className="flex items-center gap-2">Clé d'API : {sante.cleConfiguree ? <Badge couleur="vert">configurée</Badge> : <Badge couleur="orange">non détectée</Badge>}</p>}
        {sante?.modele && <p className="flex items-center gap-2">Modèle : <Badge>{sante.modele}</Badge></p>}
        <p className="text-slate-600 dark:text-slate-400">
          La clé <code>ANTHROPIC_API_KEY</code> et, si besoin, le modèle <code>PRISM_MODELE</code> se renseignent dans le fichier <code>.env</code> du serveur ; la clé n'est jamais transmise au navigateur.
          À chaque question, l'assistant reçoit un résumé des données du projet ouvert, limité à ce que l'utilisateur a le droit de voir.
        </p>
      </div>
    </Carte>
  );
}

export function Connecteurs() {
  const depot = useDepot();
  const { executionsSynchro, projets, personnes } = useDonnees();
  const [enCours, setEnCours] = useState(false);
  const rattaches = projets.filter((p) => p.numeroSource && !p.archive);
  const executions = [...executionsSynchro].sort((a, b) => b.date.localeCompare(a.date));
  const derniere = executions[0];

  const lancer = async () => {
    setEnCours(true);
    try {
      const e = await synchroniser(depot, dataPlatformSimulee);
      notifier(`Synchronisation ${e.statut.toLowerCase()} : ${e.lus} projet(s) lus, ${e.modifies} mis à jour${e.erreurs.length ? `, ${e.erreurs.length} erreur(s)` : ""}.`, e.erreurs.length ? "erreur" : "succes");
    } catch (err) {
      notifier(err instanceof Error ? err.message : "La synchronisation a échoué.", "erreur");
    } finally { setEnCours(false); }
  };

  const colonnes: Colonne<ExecutionSynchro>[] = [
    { id: "date", titre: "Date", valeur: (e) => e.date, rendu: (e) => `${formatDate(e.date)} ${new Date(e.date).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}`, largeur: "11rem" },
    { id: "connecteur", titre: "Connecteur", valeur: (e) => e.connecteur },
    { id: "statut", titre: "Résultat", valeur: (e) => e.statut, rendu: (e) => <Badge couleur={e.statut === "Réussie" ? "vert" : e.statut === "Partielle" ? "orange" : "rouge"}>{e.statut}</Badge> },
    { id: "lus", titre: "Lus", valeur: (e) => e.lus, type: "nombre" },
    { id: "crees", titre: "Créés", valeur: (e) => e.crees, type: "nombre" },
    { id: "modifies", titre: "Mis à jour", valeur: (e) => e.modifies, type: "nombre" },
    { id: "duree", titre: "Durée", valeur: (e) => e.dureeMs, rendu: (e) => `${e.dureeMs} ms`, type: "nombre" },
    { id: "erreurs", titre: "Erreurs", valeur: (e) => e.erreurs.join(" ; "), rendu: (e) => (e.erreurs.length ? <span className="text-rose-600" title={e.erreurs.join("\n")}>{e.erreurs.length} · {e.erreurs[0]}</span> : "—") },
    { id: "par", titre: "Lancée par", valeur: (e) => personnes.find((p) => p.id === e.declencheePar)?.nom ?? "Automatique" },
  ];

  return (
    <div className="space-y-6">
      <BandeauSimule>Aucun système du groupe n'est raccordé à cette preuve de concept. Les connecteurs marqués « Simulé » exposent l'interface prévue avec des données fictives : ils se remplacent sans toucher aux écrans.</BandeauSimule>

      <Carte titre="Source de projets" sousTitre={`${dataPlatformSimulee.nom} · ${rattaches.length} projet(s) rattaché(s)`}
        action={<Bouton variante="primaire" icone={<RefreshCw size={15} className={enCours ? "animate-spin" : ""} />} disabled={enCours || rattaches.length === 0} onClick={lancer}>Synchroniser maintenant</Bouton>}>
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-slate-500">Dernière synchronisation</dt><dd className="mt-0.5 font-medium">{derniere ? `${formatDate(derniere.date)} · ${anciennete(derniere.date)}` : "Jamais"}</dd></div>
          <div><dt className="text-xs text-slate-500">Résultat</dt><dd className="mt-0.5">{derniere ? <Badge couleur={derniere.statut === "Réussie" ? "vert" : derniere.statut === "Partielle" ? "orange" : "rouge"}>{derniere.statut}</Badge> : "—"}</dd></div>
          <div><dt className="text-xs text-slate-500">Projets lus</dt><dd className="mt-0.5 font-medium num">{derniere?.lus ?? "—"}</dd></div>
          <div><dt className="text-xs text-slate-500">Projets sans numéro source</dt><dd className="mt-0.5 font-medium num">{projets.filter((p) => !p.numeroSource && !p.archive).length}</dd></div>
        </dl>
      </Carte>

      <Carte titre="Journal des synchronisations">
        <TableDonnees id="synchros" lignes={executions} colonnes={colonnes} cle={(e) => e.id} simple vide="Aucune synchronisation n'a encore été lancée." />
      </Carte>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReglagesSharePoint />
        <EtatAssistant />
      </div>

      <Carte titre="Tous les connecteurs">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {CONNECTEURS.map((c) => (
            <li key={c.nom} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{c.nom}</p>
                <p className="text-xs text-slate-500">{c.role}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.detail}</p>
              </div>
              <Badge couleur={COULEUR[c.etat]}>{ICONE[c.etat]} {c.etat}</Badge>
            </li>
          ))}
        </ul>
      </Carte>
    </div>
  );
}
