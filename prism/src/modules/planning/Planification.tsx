// Planification du projet : planning (Gantt), jalons et charge en jours-hommes.
import { useState } from "react";
import { EnTetePage, Onglets } from "@/app/ui";
import { useProjet } from "@/donnees/hooks";
import { Charge } from "./Charge";
import { Jalons } from "./Jalons";
import { Planning } from "./Planning";

type Onglet = "gantt" | "jalons" | "charge";

export function Planification() {
  const { taches, estimationsCharge } = useProjet();
  const [onglet, setOnglet] = useState<Onglet>("gantt");
  const onglets = (
    <div className="mb-5 pas-impression"><Onglets valeur={onglet} onChange={setOnglet} options={[
      { id: "gantt", libelle: "Planning" },
      { id: "jalons", libelle: "Jalons", compte: taches.filter((t) => t.jalon).length || undefined },
      { id: "charge", libelle: "Charge (jours-hommes)", compte: estimationsCharge.length || undefined },
    ]} /></div>
  );
  if (onglet === "gantt") return <Planning onglets={onglets} />;
  return (
    <>
      <EnTetePage titre="Planification" description={onglet === "jalons" ? "Jalons du projet : référence, date actuelle, date réelle et écart" : "Charge demandée aux directions, en jours-hommes, par phase et par année"} />
      {onglets}
      {onglet === "jalons" ? <Jalons /> : <Charge />}
    </>
  );
}
