// Ce que le système source connaît du projet : valeurs de référence, budget et réalisé par année,
// factures comptabilisées. Tout est en lecture seule : la correction se fait dans le système source.
import { Database } from "lucide-react";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { BadgeStatut, BandeauSimule, Carte, Progression, Tableau, Vide } from "@/app/ui";
import { Fraicheur, Montant } from "@/app/ui/metier";
import { rapprochement } from "@/domaine/socle/synthese";
import type { FactureSource } from "@/domaine/socle/types";
import { useProjet } from "@/donnees/hooks";
import { useSynthese } from "@/donnees/lectures";

export function ParAnnee() {
  const { projet, relevesSource } = useProjet();
  const r = relevesSource[0];
  if (!projet || !r) return null;
  const annees = Object.entries(r.parAnnee).sort(([a], [b]) => a.localeCompare(b));
  if (annees.length === 0) return null;
  const total = annees.reduce((s, [, v]) => ({ budget: s.budget + v.budget, realise: s.realise + v.realise }), { budget: 0, realise: 0 });
  return (
    <Carte titre="Budget et réalisé par année" sousTitre="Valeurs du système source">
      <Tableau>
        <thead><tr><th>Année</th><th className="text-right">Budget</th><th className="text-right">Réalisé</th><th className="text-right">Reste</th><th className="w-40">Consommé</th></tr></thead>
        <tbody>
          {annees.map(([a, v]) => (
            <tr key={a}>
              <td className="font-medium num">{a}</td>
              <td className="text-right"><Montant v={v.budget} /></td>
              <td className="text-right"><Montant v={v.realise} /></td>
              <td className="text-right"><Montant v={v.budget - v.realise} /></td>
              <td><Progression valeur={v.budget ? (v.realise / v.budget) * 100 : 0} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="font-semibold"><td>Total</td><td className="text-right"><Montant v={total.budget} /></td><td className="text-right"><Montant v={total.realise} /></td><td className="text-right"><Montant v={total.budget - total.realise} /></td><td /></tr></tfoot>
      </Tableau>
    </Carte>
  );
}

export function FacturesSource() {
  const { facturesSource } = useProjet();
  const colonnes: Colonne<FactureSource>[] = [
    { id: "numero", titre: "N°", valeur: (f) => f.numero },
    { id: "fournisseur", titre: "Fournisseur", valeur: (f) => f.fournisseur, groupable: true },
    { id: "commande", titre: "Commande", valeur: (f) => f.commande ?? "", groupable: true },
    { id: "date", titre: "Date", valeur: (f) => f.date, type: "date" },
    { id: "echeance", titre: "Échéance", valeur: (f) => f.echeance ?? "", type: "date" },
    { id: "montant", titre: "Montant HT", valeur: (f) => f.montantHT, type: "montant", total: true },
    { id: "statut", titre: "Statut", valeur: (f) => f.statut, rendu: (f) => <BadgeStatut statut={f.statut} />, groupable: true },
    { id: "compte", titre: "Compte analytique", valeur: (f) => f.compteAnalytique ?? "", masquee: true },
  ];
  return (
    <Carte titre="Factures comptabilisées" sousTitre="Reçues du système comptable, en lecture seule">
      <TableDonnees id="factures-source" lignes={facturesSource} colonnes={colonnes} cle={(f) => f.id} triInitial={{ colonne: "date", sens: "desc" }}
        vide={<Vide icone={<Database size={22} />} titre="Aucune facture reçue" texte="Les factures arrivent à la synchronisation avec le système source." />} />
    </Carte>
  );
}

/** Onglet « Système source » : rapprochement, valeurs par année et factures */
export function OngletSource() {
  const { projet } = useProjet();
  const s = useSynthese(projet?.id ?? "");
  if (!projet) return null;
  const r = s.reference;
  const ecarts = rapprochement(s);
  if (!r) return <Carte><Vide icone={<Database size={22} />} titre="Projet non rattaché au système source" texte="Renseignez le numéro du projet dans la source (fiche du projet) pour recevoir ses valeurs de référence et ses factures." /></Carte>;
  return (
    <div className="space-y-6">
      <BandeauSimule>Les valeurs ci-dessous viennent d'une source simulée ({r.systeme}). <Fraicheur date={r.date} /></BandeauSimule>
      {ecarts.length > 0 && (
        <Carte titre="Rapprochement" sousTitre="Le calcul par position fait foi ; la source sert de contrôle">
          <Tableau>
            <thead><tr><th>Donnée</th><th className="text-right">PRISM (calcul)</th><th className="text-right">Source</th><th className="text-right">Écart</th></tr></thead>
            <tbody>{ecarts.map((e) => <tr key={e.champ}><td>{e.champ}</td><td className="text-right"><Montant v={e.prism} /></td><td className="text-right"><Montant v={e.source} /></td><td className="text-right"><Montant v={e.ecart} signe /></td></tr>)}</tbody>
          </Tableau>
        </Carte>
      )}
      <ParAnnee />
      <FacturesSource />
    </div>
  );
}
