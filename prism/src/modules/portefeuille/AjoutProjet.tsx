// Ajout d'un projet : depuis son numéro dans le système source (cas normal), ou en projet
// provisoire tant qu'il n'existe pas dans la source.
import { CloudDownload, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notifier } from "@/app/etatUI";
import { FormulaireSchema, champsManquants, type ChampSchema } from "@/app/formulaire/Formulaire";
import { cheminProjet } from "@/app/registre";
import { Alerte, BandeauSimule, Bouton, Onglets, Panneau, Saisie } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { Projet } from "@/domaine/types";
import { dataPlatformSimulee } from "@/donnees/connecteurs/dataPlatformSimulee";
import { importerProjet } from "@/donnees/connecteurs/synchro";
import { ErreurDepot } from "@/donnees/depot";
import { useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";

type Connu = Awaited<ReturnType<typeof dataPlatformSimulee.lister>>[number];

export function AjoutProjet({ onFermer, parentId }: { onFermer: () => void; parentId?: string }) {
  const depot = useDepot();
  const navigate = useNavigate();
  const utilisateur = useUtilisateur();
  const { projets, typesProjet, ajouter } = useDonnees();
  const source = dataPlatformSimulee;
  const [mode, setMode] = useState<"source" | "provisoire">("source");
  const [numero, setNumero] = useState("");
  const [connus, setConnus] = useState<Connu[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [manquants, setManquants] = useState<string[]>([]);
  const [brouillon, setBrouillon] = useState<Projet>(() => ({
    id: nouvelId("prj"), code: "", nom: "", maitreOuvrage: "", lieu: "", phase: "11 Énoncé des besoins", dateDebut: aujourdhui(), dateFin: `${Number(aujourdhui().slice(0, 4)) + 1}-12-31`,
    tauxTVA: 8.1, couleur: "#475569", description: "", typeProjetId: typesProjet[0]?.id, statut: "Idée", priorite: "Normale", confidentialite: "Interne",
    provisoire: true, directeurId: utilisateur?.id, directionId: utilisateur?.directionId, parentId, phaseGroupe: "Définition des objectifs",
  }));

  useEffect(() => { void source.lister().then(setConnus); }, [source]);

  const dejaLa = useMemo(() => new Set(projets.map((p) => p.numeroSource).filter(Boolean)), [projets]);
  const filtre = numero.trim().toLowerCase();
  const propositions = connus.filter((c) => !c.parent && !dejaLa.has(c.numero) && (!filtre || `${c.numero} ${c.nom}`.toLowerCase().includes(filtre)));

  const importer = async (n: string) => {
    setEnCours(true);
    setErreur(null);
    try {
      const p = await importerProjet(depot, source, n);
      notifier(`${p.code} ajouté depuis ${source.nom}.`, "succes");
      onFermer();
      navigate(cheminProjet(p.id));
    } catch (e) {
      setErreur(e instanceof ErreurDepot || e instanceof Error ? e.message : "Ajout impossible.");
    }
    setEnCours(false);
  };

  const champs: ChampSchema<Projet>[] = [
    { cle: "code", libelle: "Code provisoire", type: "texte", obligatoire: true, aide: "Remplacé par le numéro officiel dès que le projet existe dans la source." },
    { cle: "typeProjetId", libelle: "Type de projet", type: "liste", obligatoire: true, options: typesProjet.map((t) => ({ valeur: t.id, libelle: t.nom })) },
    { cle: "nom", libelle: "Nom du projet", type: "texte", obligatoire: true, large: true },
    { cle: "directionId", libelle: "Direction", type: "direction" },
    { cle: "directeurId", libelle: "Responsable de projet", type: "personne", obligatoire: true },
    { cle: "dateDebut", libelle: "Début prévu", type: "date" },
    { cle: "dateFin", libelle: "Fin prévue", type: "date" },
    { cle: "description", libelle: "Description", type: "zone" },
  ];

  const creer = () => {
    const m = champsManquants(champs, brouillon);
    setManquants(m);
    if (m.length) return;
    if (projets.some((p) => p.code.toLowerCase() === brouillon.code.trim().toLowerCase())) { setErreur(`Le code « ${brouillon.code} » est déjà utilisé.`); return; }
    ajouter("projets", { ...brouillon, code: brouillon.code.trim() });
    onFermer();
    navigate(cheminProjet(brouillon.id));
  };

  return (
    <Panneau ouverte onFermer={onFermer} titre={parentId ? "Ajouter un sous-projet" : "Ajouter un projet"}
      pied={mode === "provisoire" ? <><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" onClick={creer}>Créer le projet provisoire</Bouton></> : <Bouton libre onClick={onFermer}>Fermer</Bouton>}>
      <div className="mb-4"><Onglets valeur={mode} onChange={setMode} options={[{ id: "source", libelle: "Depuis un numéro de projet" }, { id: "provisoire", libelle: "Projet provisoire" }]} /></div>
      {erreur && <div className="mb-4"><Alerte type="erreur">{erreur}</Alerte></div>}
      {mode === "source" ? (
        <>
          {source.simulee && <BandeauSimule>La source de projets est <strong>simulée</strong> : les numéros ci-dessous sont fictifs. Le jour où l'accès à la Data Platform est ouvert, cet écran fonctionne à l'identique avec les vrais projets.</BandeauSimule>}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (numero.trim()) void importer(numero.trim()); }}>
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
              <Saisie libre className="pl-9" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Numéro ou nom du projet" />
            </div>
            <Bouton type="submit" variante="primaire" disabled={enCours || !numero.trim()}>Ajouter</Bouton>
          </form>
          <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">Projets de la source pas encore suivis dans PRISM</p>
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200 dark:divide-slate-800 dark:ring-slate-800">
            {propositions.map((c) => (
              <li key={c.numero} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{c.nom}</p>
                  <p className="text-xs text-slate-500">{c.numero} · {c.direction} · {c.statut}{connus.some((x) => x.parent === c.numero) ? ` · ${connus.filter((x) => x.parent === c.numero).length} sous-projets` : ""}</p>
                </div>
                <Bouton taille="sm" disabled={enCours} icone={<CloudDownload size={14} />} onClick={() => importer(c.numero)}>Ajouter</Bouton>
              </li>
            ))}
            {propositions.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">{filtre ? "Aucun projet de la source ne correspond." : "Tous les projets de la source sont déjà suivis."}</li>}
          </ul>
        </>
      ) : (
        <>
          <div className="mb-4"><Alerte type="info">Un projet provisoire n'existe pas encore dans le système source : ses chiffres sont saisis à la main et il est signalé comme tel jusqu'à son rattachement.</Alerte></div>
          <FormulaireSchema champs={champs} valeur={brouillon} onChange={setBrouillon} manquants={manquants} />
        </>
      )}
    </Panneau>
  );
}
