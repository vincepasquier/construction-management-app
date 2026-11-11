// Cadre des pages d'un projet : vérifie que le projet existe et qu'il est dans le périmètre de
// l'utilisateur, puis le fournit aux pages.
import { FolderX, Lock } from "lucide-react";
import { Link, Outlet, useParams } from "react-router-dom";
import { projetVisible } from "../domaine/socle/droits";
import { FournisseurProjet, useDoc, useUtilisateur } from "../donnees/hooks";
import { moduleActif } from "./modulesActifs";
import { Bouton, Carte, Vide } from "./ui";

export function ProjetCourant() {
  const { projetId = "", "*": reste } = useParams();
  const projet = useDoc("projets", projetId);
  const type = useDoc("typesProjet", projet?.typeProjetId);
  const utilisateur = useUtilisateur();
  const retour = <Link to="/portefeuille"><Bouton libre>Retour au portefeuille</Bouton></Link>;
  if (!projet) return <Carte><Vide icone={<FolderX size={22} />} titre="Projet introuvable" texte="Ce projet n'existe pas ou a été supprimé." action={retour} /></Carte>;
  if (!projetVisible(utilisateur, projet)) {
    return <Carte><Vide icone={<Lock size={22} />} titre="Projet hors de votre périmètre" texte="Demandez l'accès au responsable du projet ou à un administrateur." action={retour} /></Carte>;
  }
  if (!moduleActif(type, reste ?? "")) {
    return <Carte><Vide icone={<Lock size={22} />} titre="Module non utilisé pour ce type de projet" texte={`Les projets de type « ${type?.nom} » n'utilisent pas ce module.`} action={<Link to={`/projets/${projetId}`}><Bouton libre>Synthèse du projet</Bouton></Link>} /></Carte>;
  }
  return <FournisseurProjet projetId={projetId}><Outlet /></FournisseurProjet>;
}
