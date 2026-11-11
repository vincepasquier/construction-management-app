// Décisions du projet : registre, conditions à lever et séances du comité de pilotage.
import { useState } from "react";
import { Carte, EnTetePage, Onglets } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { decisionVisible } from "@/domaine/socle/droits";
import { conditionsOuvertes } from "@/donnees/gouvernance";
import { useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { Seances } from "../seances/Seances";
import { SuiviConditions } from "./Conditions";
import { RegistreDecisions } from "./RegistreDecisions";

export function DecisionsProjet() {
  const { projet, decisions, decisionsPhase } = useProjet();
  const { seances } = useDonnees();
  const utilisateur = useUtilisateur();
  const [onglet, setOnglet] = useState<"decisions" | "conditions" | "seances">("decisions");
  if (!projet) return null;
  const conditions = conditionsOuvertes(decisions.filter((d) => decisionVisible(utilisateur, d)), decisionsPhase, aujourdhui());
  return (
    <>
      <EnTetePage titre="Décisions" description="Décisions qui concernent le projet, conditions à lever et séances du comité de pilotage" />
      <div className="mb-6 pas-impression"><Onglets valeur={onglet} onChange={setOnglet} options={[
        { id: "decisions", libelle: "Registre" },
        { id: "conditions", libelle: "Conditions à lever", compte: conditions.length || undefined },
        { id: "seances", libelle: "Comité de pilotage", compte: seances.filter((s) => s.type === "Comité de pilotage" && s.projetId === projet.id).length || undefined },
      ]} /></div>
      {onglet === "decisions" && <RegistreDecisions projetId={projet.id} />}
      {onglet === "conditions" && <Carte titre="Conditions et réserves ouvertes"><SuiviConditions conditions={conditions} /></Carte>}
      {onglet === "seances" && <Seances type="Comité de pilotage" projetId={projet.id} libelle="Séances du comité de pilotage" />}
    </>
  );
}
