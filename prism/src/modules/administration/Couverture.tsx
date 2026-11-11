// Couverture du cahier des charges PRISM : ce que cette preuve de concept réalise, simule, couvre en
// partie ou laisse à l'infrastructure du groupe — exigence par exigence, sans arrondir.
import { Download } from "lucide-react";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, Indicateur, type CouleurBadge } from "@/app/ui";
import { bilanExigences, ETATS, EXIGENCES, familleDe, FAMILLES, type EtatExigence, type Exigence } from "@/domaine/socle/exigences";
import { telechargerXlsx } from "@/outils/telechargement";
import { NOTES_DE_VERSION } from "./versions";

const COULEUR: Record<EtatExigence, CouleurBadge> = { "Réalisé": "vert", Partiel: "orange", "Simulé": "bleu", "Hors preuve de concept": "gris" };
const SENS: Record<EtatExigence, string> = {
  "Réalisé": "la fonction existe et s'utilise", Partiel: "une partie seulement est couverte", "Simulé": "interface en place, source ou canal factice", "Hors preuve de concept": "demande une infrastructure du groupe",
};

export function Couverture() {
  const b = bilanExigences();
  const colonnes: Colonne<Exigence>[] = [
    { id: "code", titre: "Code", valeur: (e) => e.code, largeur: "6rem" },
    { id: "famille", titre: "Famille", valeur: (e) => FAMILLES[familleDe(e.code)], groupable: true },
    { id: "titre", titre: "Exigence", valeur: (e) => e.titre },
    { id: "etat", titre: "État", valeur: (e) => e.etat, rendu: (e) => <Badge couleur={COULEUR[e.etat]}>{e.etat}</Badge>, groupable: true },
    { id: "remarque", titre: "Où, ou pourquoi", valeur: (e) => e.remarque },
  ];
  const exporter = () => telechargerXlsx("PRISM-couverture-des-exigences", [{
    nom: "Couverture", largeurs: [9, 30, 60, 22, 70],
    lignes: [["Code", "Famille", "Exigence (intitulé reformulé)", "État", "Où, ou pourquoi"], ...EXIGENCES.map((e) => [e.code, FAMILLES[familleDe(e.code)], e.titre, e.etat, e.remarque])],
  }]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ETATS.map((e) => <Indicateur key={e} libelle={e} valeur={b[e]} detail={`${Math.round((b[e] / b.total) * 100)} % · ${SENS[e]}`} />)}
      </div>
      <Carte>
        <TableDonnees id="couverture" lignes={EXIGENCES} colonnes={colonnes} cle={(e) => e.code} grouperPar="famille"
          barre={<Bouton libre icone={<Download size={15} />} onClick={exporter}>Exporter pour le PMO</Bouton>} />
      </Carte>
      <Carte titre="Notes de version">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {NOTES_DE_VERSION.map((n) => (
            <li key={n.version} className="px-5 py-3">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{n.version} <span className="font-normal text-slate-500">· {n.titre}</span></p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600 dark:text-slate-300">{n.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </li>
          ))}
        </ul>
      </Carte>
    </div>
  );
}
