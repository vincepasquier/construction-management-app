import { FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { Bouton, Carte, Vide } from "./ui";

export function SansProjet() {
  return (
    <Carte>
      <Vide icone={<FolderKanban size={24} />} titre="Aucun projet sélectionné"
        texte="Choisissez un projet dans la barre du haut ou créez-en un depuis le portefeuille."
        action={<Link to="/"><Bouton variante="primaire">Aller au portefeuille</Bouton></Link>} />
    </Carte>
  );
}
