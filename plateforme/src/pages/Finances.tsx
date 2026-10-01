import { useState } from "react";
import { FileSpreadsheet, FileUp, Printer } from "lucide-react";
import { BoutonIA } from "../components/BoutonIA";
import { ImportChiffrage } from "../components/ImportChiffrage";
import { SansProjet } from "../components/SansProjet";
import { useDroit } from "../store/useStore";
import { Bouton, EnTetePage, Onglets } from "../components/ui";
import { useBudget } from "../components/finances/useBudget";
import { OngletSynthese } from "../components/finances/OngletSynthese";
import { OngletPositions } from "../components/finances/OngletPositions";
import { OngletMutations } from "../components/finances/OngletMutations";
import { OngletPrevisions } from "../components/finances/OngletPrevisions";
import { OngletEngagements } from "../components/finances/OngletEngagements";
import { OngletFactures } from "../components/finances/OngletFactures";
import { OngletClotures } from "../components/finances/OngletClotures";
import { ImportSuiviFinancier } from "../components/finances/ImportSuiviFinancier";
import { RapportMensuel } from "../components/finances/RapportMensuel";

type Onglet = "synthese" | "positions" | "mutations" | "previsions" | "engagements" | "factures" | "clotures";

export function Finances() {
  const b = useBudget();
  const droitIA = useDroit("ia");
  const [onglet, setOnglet] = useState<Onglet>("synthese");
  const [importIA, setImportIA] = useState(false);
  const [importExcel, setImportExcel] = useState(false);
  const [rapport, setRapport] = useState(false);
  if (!b.d.projet) return <SansProjet />;

  const aValider = b.d.mutations.filter((m) => m.statut === "Soumise").length;
  const aAffecter = b.d.facturesHorsCommande.filter((f) => !f.repartition.length).length;

  return (
    <>
      <EnTetePage titre="Finances" description="Budget par position, mutations, prévisions d'atterrissage et clôtures mensuelles – montants HT"
        actions={<>
          <Bouton libre icone={<Printer size={15} />} onClick={() => setRapport(true)}>Rapport mensuel</Bouton>
          <BoutonIA question={"Analyse le suivi financier par position : écart entre budget révisé et atterrissage, positions en dépassement, consommation de la réserve, prévisions à risque, et propose des mesures (mutations, négociations, arbitrages)."}>Analyse IA</BoutonIA>
          <Bouton icone={<FileSpreadsheet size={15} />} onClick={() => setImportExcel(true)}>Importer un classeur de suivi</Bouton>
          {droitIA.ecrire && <Bouton icone={<FileUp size={15} />} onClick={() => setImportIA(true)}>Importer un chiffrage (IA)</Bouton>}
        </>} />

      <div className="mb-5 overflow-x-auto">
        <Onglets valeur={onglet} onChange={setOnglet} options={[
          { id: "synthese", libelle: "Synthèse" },
          { id: "positions", libelle: "Suivi par position", compte: b.positions.filter((p) => !p.virtuelle).length },
          { id: "mutations", libelle: "Mutations", compte: aValider || undefined },
          { id: "previsions", libelle: "Prévisions" },
          { id: "engagements", libelle: "Commandes et offres" },
          { id: "factures", libelle: "Factures", compte: aAffecter || undefined },
          { id: "clotures", libelle: "Clôtures", compte: b.d.clotures.length },
        ]} />
      </div>

      {onglet === "synthese" && <OngletSynthese b={b} allerA={setOnglet} />}
      {onglet === "positions" && <OngletPositions b={b} />}
      {onglet === "mutations" && <OngletMutations b={b} />}
      {onglet === "previsions" && <OngletPrevisions b={b} />}
      {onglet === "engagements" && <OngletEngagements b={b} />}
      {onglet === "factures" && <OngletFactures b={b} />}
      {onglet === "clotures" && <OngletClotures b={b} />}

      {importIA && <ImportChiffrage projetId={b.d.projet.id} onFermer={() => { setImportIA(false); setOnglet("positions"); }} />}
      {importExcel && <ImportSuiviFinancier onFermer={() => setImportExcel(false)} onTermine={() => { setImportExcel(false); setOnglet("synthese"); }} />}
      {rapport && <RapportMensuel b={b} onFermer={() => setRapport(false)} />}
    </>
  );
}
