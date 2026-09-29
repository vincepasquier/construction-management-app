import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Cloud, ExternalLink, File, FileText, Folder, FolderPlus, Home, Link2, LogIn, Plus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { aujourdhui, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import * as sp from "../lib/sharepoint";
import { Badge, Bouton, Carte, Champ, EnTetePage, Liste, Modale, Onglets, Saisie, Tableau, Vide } from "../components/ui";
import { SansProjet } from "../components/SansProjet";
import type { CategorieDocument, DocumentProjet } from "../types";

const CATEGORIES: CategorieDocument[] = ["Plans", "Contrats", "PV de séance", "Soumissions", "Factures", "Autorisations", "Rapports", "Autre"];

export function Documents() {
  const d = useProjetActif();
  const { sharePoint } = useStore();
  const [onglet, setOnglet] = useState<"registre" | "sharepoint">("registre");
  if (!d.projet) return <SansProjet />;
  return (
    <>
      <EnTetePage titre="Documents" description="Registre des documents du projet et accès direct à la bibliothèque SharePoint" />
      <div className="mb-4"><Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "registre", libelle: "Registre", compte: d.documents.length }, { id: "sharepoint", libelle: "SharePoint" }]} /></div>
      {onglet === "registre" ? <Registre /> : sp.estConfigure(sharePoint) ? <NavigateurSharePoint /> : (
        <Carte><Vide icone={<Cloud size={22} />} titre="SharePoint n'est pas configuré"
          texte="Renseignez l'application Entra ID (client ID, tenant) et le site SharePoint dans les paramètres pour parcourir et téléverser les documents du projet."
          action={<Link to="/parametres"><Bouton variante="primaire">Configurer SharePoint</Bouton></Link>} /></Carte>
      )}
    </>
  );
}

function Registre() {
  const d = useProjetActif();
  const { ajouter, modifier, supprimer } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [edition, setEdition] = useState<DocumentProjet | null>(null);
  const liste = d.documents
    .filter((x) => (!cat || x.categorie === cat) && `${x.nom} ${x.auteur ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Carte>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div className="relative min-w-60 flex-1">
          <Search size={15} className="absolute top-2.5 left-3 text-slate-400" />
          <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un document…" className="pl-9" />
        </div>
        <Liste value={cat} onChange={(e) => setCat(e.target.value)} className="!w-48"><option value="">Toutes catégories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Liste>
        <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setEdition({ id: nouvelId("doc"), projetId: d.projet!.id, nom: "", categorie: "Plans", version: "1", date: aujourdhui(), source: "Lien" })}>Document</Bouton>
      </div>
      {liste.length === 0 ? <Vide icone={<FileText size={22} />} titre="Aucun document" /> : (
        <Tableau>
          <thead><tr><th>Nom</th><th>Catégorie</th><th>Version</th><th>Date</th><th>Auteur</th><th>Source</th><th /></tr></thead>
          <tbody>
            {liste.map((x) => (
              <tr key={x.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="shrink-0 text-slate-400" />
                    {x.url ? <a href={x.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline dark:text-indigo-300">{x.nom}</a> : <span className="font-medium">{x.nom}</span>}
                  </div>
                </td>
                <td><Badge>{x.categorie}</Badge></td>
                <td>{x.version}</td>
                <td className="num">{formatDate(x.date)}</td>
                <td className="text-slate-500">{x.auteur}</td>
                <td>{x.source === "SharePoint" ? <Badge couleur="bleu"><Cloud size={12} className="mr-1" />SharePoint</Badge> : <Badge><Link2 size={12} className="mr-1" />Lien</Badge>}</td>
                <td className="text-right whitespace-nowrap">
                  {x.url && <a href={x.url} target="_blank" rel="noreferrer" className="inline-flex p-1 text-slate-400 hover:text-slate-600"><ExternalLink size={14} /></a>}
                  <button onClick={() => setEdition(x)} className="p-1 text-slate-400 hover:text-slate-600"><FileText size={14} /></button>
                  <button onClick={() => confirm("Retirer ce document du registre ?") && supprimer("documents", x.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
      {edition && (
        <Modale ouverte onFermer={() => setEdition(null)} titre="Document"
          pied={<><Bouton onClick={() => setEdition(null)}>Annuler</Bouton><Bouton variante="primaire" disabled={!edition.nom} onClick={() => {
            if (d.documents.some((x) => x.id === edition.id)) modifier("documents", edition.id, edition); else ajouter("documents", edition);
            setEdition(null);
          }}>Enregistrer</Bouton></>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Nom" className="col-span-2"><Saisie value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></Champ>
            <Champ libelle="Catégorie"><Liste value={edition.categorie} onChange={(e) => setEdition({ ...edition, categorie: e.target.value as CategorieDocument })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Liste></Champ>
            <Champ libelle="Version / indice"><Saisie value={edition.version} onChange={(e) => setEdition({ ...edition, version: e.target.value })} /></Champ>
            <Champ libelle="Date"><Saisie type="date" value={edition.date} onChange={(e) => setEdition({ ...edition, date: e.target.value })} /></Champ>
            <Champ libelle="Auteur"><Saisie value={edition.auteur ?? ""} onChange={(e) => setEdition({ ...edition, auteur: e.target.value })} /></Champ>
            <Champ libelle="Lien (SharePoint, Teams, serveur…)" className="col-span-2"><Saisie value={edition.url ?? ""} onChange={(e) => setEdition({ ...edition, url: e.target.value })} placeholder="https://…" /></Champ>
            <Champ libelle="Code CFC (optionnel)"><Saisie value={edition.cfc ?? ""} onChange={(e) => setEdition({ ...edition, cfc: e.target.value || undefined })} /></Champ>
          </div>
        </Modale>
      )}
    </Carte>
  );
}

function NavigateurSharePoint() {
  const d = useProjetActif();
  const { sharePoint, ajouter, personnes, utilisateurId } = useStore();
  const racine = [sharePoint.dossierRacine, d.projet?.dossierSharePoint ?? d.projet?.code ?? ""].filter(Boolean).join("/");
  const [chemin, setChemin] = useState(racine);
  const [elements, setElements] = useState<sp.ElementSharePoint[]>([]);
  const [compte, setCompte] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const fichier = useRef<HTMLInputElement>(null);

  const charger = useCallback(async (c: string) => {
    setChargement(true); setErreur(null);
    try { setElements(await sp.listerDossier(sharePoint, c)); setChemin(c); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    finally { setChargement(false); }
  }, [sharePoint]);

  useEffect(() => {
    sp.compteConnecte(sharePoint).then((a) => { setCompte(a?.name ?? a?.username ?? null); if (a) void charger(racine); });
  }, [sharePoint, racine, charger]);

  const connecter = async () => {
    try { const a = await sp.connecter(sharePoint); setCompte(a.name ?? a.username); await charger(racine); }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
  };

  const enregistrer = (el: sp.ElementSharePoint) => {
    ajouter("documents", {
      id: nouvelId("doc"), projetId: d.projet!.id, nom: el.name, categorie: "Autre", version: "1", date: el.lastModifiedDateTime.slice(0, 10),
      url: el.webUrl, source: "SharePoint", sharePointId: el.id, auteur: el.lastModifiedBy?.user?.displayName ?? personnes.find((p) => p.id === utilisateurId)?.nom,
    });
  };

  if (!compte) {
    return (
      <Carte><Vide icone={<LogIn size={22} />} titre="Connexion Microsoft 365" texte={`Site : ${sharePoint.hostname}${sharePoint.sitePath}`}
        action={<><Bouton variante="primaire" onClick={connecter}>Se connecter</Bouton>{erreur && <p className="mt-3 text-sm text-rose-600">{erreur}</p>}</>} /></Carte>
    );
  }

  const segments = chemin.split("/").filter(Boolean);
  return (
    <Carte>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          <button onClick={() => charger("")} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Home size={15} /></button>
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-slate-300" />
              <button onClick={() => charger(segments.slice(0, i + 1).join("/"))} className="rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800">{s}</button>
            </span>
          ))}
        </nav>
        <form onSubmit={async (e) => { e.preventDefault(); if (!recherche) return; setChargement(true); try { setElements(await sp.rechercher(sharePoint, recherche)); } catch (er) { setErreur(String(er)); } finally { setChargement(false); } }}>
          <Saisie value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher dans le site…" className="!w-56" />
        </form>
        <Bouton taille="sm" icone={<RefreshCw size={14} />} onClick={() => charger(chemin)}>Actualiser</Bouton>
        <Bouton taille="sm" icone={<FolderPlus size={14} />} onClick={async () => { const n = prompt("Nom du dossier"); if (n) { await sp.creerDossier(sharePoint, chemin, n); await charger(chemin); } }}>Dossier</Bouton>
        <input ref={fichier} type="file" hidden multiple onChange={async (e) => {
          const fs = [...(e.target.files ?? [])];
          setChargement(true);
          try { for (const f of fs) enregistrer(await sp.televerser(sharePoint, chemin, f)); await charger(chemin); }
          catch (er) { setErreur(er instanceof Error ? er.message : String(er)); }
          finally { setChargement(false); e.target.value = ""; }
        }} />
        <Bouton taille="sm" variante="primaire" icone={<Upload size={14} />} onClick={() => fichier.current?.click()}>Téléverser</Bouton>
      </div>
      {erreur && <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erreur}</p>}
      {chargement ? <p className="p-8 text-center text-sm text-slate-500">Chargement…</p> : elements.length === 0 ? <Vide titre="Dossier vide ou inexistant" texte={`Chemin : /${chemin}`} /> : (
        <Tableau>
          <thead><tr><th>Nom</th><th>Modifié</th><th>Par</th><th /></tr></thead>
          <tbody>
            {elements.map((el) => (
              <tr key={el.id}>
                <td>
                  {el.folder ? (
                    <button onClick={() => charger(`${chemin}/${el.name}`.replace(/^\//, ""))} className="flex items-center gap-2 font-medium"><Folder size={16} className="text-amber-500" fill="currentColor" />{el.name}<span className="text-xs text-slate-400">{el.folder.childCount}</span></button>
                  ) : (
                    <a href={el.webUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline"><File size={16} className="text-slate-400" />{el.name}</a>
                  )}
                </td>
                <td className="num">{formatDate(el.lastModifiedDateTime)}</td>
                <td className="text-slate-500">{el.lastModifiedBy?.user?.displayName}</td>
                <td className="text-right">{!el.folder && !d.documents.some((x) => x.sharePointId === el.id) && <Bouton taille="sm" variante="fantome" onClick={() => enregistrer(el)}>+ Registre</Bouton>}</td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">Connecté en tant que {compte}</p>
    </Carte>
  );
}
