import { Hammer } from "lucide-react";
import { Carte, EnTetePage, Vide } from "./ui";

/** Page d'attente d'un module pas encore livré dans cette version */
export function EnConstruction({ titre, etape }: { titre: string; etape: number }) {
  return (
    <>
      <EnTetePage titre={titre} />
      <Carte><Vide icone={<Hammer size={22} />} titre="Module en cours de construction" texte={`Ce module arrive à l'étape ${etape} de la réécriture.`} /></Carte>
    </>
  );
}
