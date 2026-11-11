import { EnTetePage } from "@/app/ui";
import { useProjet } from "@/donnees/hooks";
import { Journal } from "./Journal";

export function PageHistorique() {
  const { projet } = useProjet();
  if (!projet) return null;
  return (
    <>
      <EnTetePage titre="Historique" description="Tout ce qui a été créé, modifié ou supprimé dans ce projet : auteur, date, origine, ancienne et nouvelle valeur" />
      <Journal projetId={projet.id} />
    </>
  );
}
