import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Bouton, Carte, EnTetePage, Vide } from "./ui";

/** Adresse qui ne correspond à aucun écran du projet (lien ancien ou saisi à la main) */
export function Introuvable() {
  return (
    <>
      <EnTetePage titre="Page introuvable" />
      <Carte>
        <Vide icone={<Compass size={22} />} titre="Cette adresse ne correspond à aucun écran"
          texte="Le lien est peut-être ancien. Reprenez depuis la synthèse du projet ou le menu de gauche."
          action={<Link to=".."><Bouton libre>Synthèse du projet</Bouton></Link>} />
      </Carte>
    </>
  );
}
