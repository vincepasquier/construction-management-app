// Administration : référentiels, types de projet, connecteurs, sauvegarde. Chaque onglet a son
// adresse, pour qu'un lien (« Sauvegarder ») y mène directement.
import { useNavigate, useParams } from "react-router-dom";
import { EnTetePage, Onglets } from "@/app/ui";
import { useDepot } from "@/donnees/hooks";
import { Journal } from "../historique/Journal";
import { Qualite } from "../qualite/Qualite";
import { Secours } from "../secours/Secours";
import { Connecteurs } from "./Connecteurs";
import { Referentiels } from "./Referentiels";
import { TypesProjet } from "./TypesProjet";

const ONGLETS = [
  { id: "referentiels", libelle: "Référentiels" },
  { id: "types", libelle: "Types de projet" },
  { id: "connecteurs", libelle: "Connecteurs" },
  { id: "qualite", libelle: "Qualité des données" },
  { id: "journal", libelle: "Journal d'audit" },
  { id: "sauvegarde", libelle: "Sauvegarde" },
] as const;
type Onglet = (typeof ONGLETS)[number]["id"];

export function Administration() {
  const depot = useDepot();
  const navigate = useNavigate();
  const { "*": reste = "" } = useParams();
  const onglet: Onglet = ONGLETS.find((o) => o.id === reste.split("/")[0])?.id ?? "referentiels";
  return (
    <>
      <EnTetePage titre="Administration" description="Référentiels du groupe, types de projet, connecteurs et sauvegarde des données" />
      <div className="mb-6"><Onglets valeur={onglet} onChange={(o) => navigate(`/administration/${o}`)} options={[...ONGLETS]} /></div>
      {onglet === "referentiels" && <Referentiels />}
      {onglet === "types" && <TypesProjet />}
      {onglet === "connecteurs" && <Connecteurs />}
      {onglet === "qualite" && <Qualite />}
      {onglet === "journal" && <Journal />}
      {onglet === "sauvegarde" && <Secours depot={depot} integre />}
    </>
  );
}
