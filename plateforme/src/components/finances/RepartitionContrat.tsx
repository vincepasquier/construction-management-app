import { useState } from "react";
import { Split } from "lucide-react";
import { useStore } from "../../store/useStore";
import { sommeRepartition } from "../../lib/budget";
import { formatCHF } from "../../lib/format";
import type { Contrat } from "../../types";
import { Bouton, Carte, Tableau } from "../ui";
import { ModaleRepartition } from "./OngletEngagements";
import { useBudget } from "./useBudget";

/** Répartition d'un contrat sur les positions budgétaires (fiche contrat) */
export function RepartitionContrat({ c }: { c: Contrat }) {
  const b = useBudget();
  const { modifier } = useStore();
  const [edition, setEdition] = useState(false);
  if (b.d.projet?.id !== c.projetId) return null;
  const rep = c.repartition ?? [];
  const ecart = c.montantInitial - sommeRepartition(rep);
  return (
    <Carte className="mt-6" titre="Répartition budgétaire" sousTitre={rep.length ? "Le montant, les avenants et les factures sont imputés selon ces proportions" : c.cfc ? `Imputé automatiquement sur le CFC ${c.cfc}` : "Non répartie : le montant apparaît hors budget"}
      action={<Bouton taille="sm" icone={<Split size={14} />} onClick={() => setEdition(true)}>Répartir</Bouton>}>
      {rep.length > 0 && (
        <Tableau>
          <tbody>
            {rep.map((r) => (
              <tr key={r.budgetId}><td>{b.libelle(r.budgetId)}</td><td className="num text-right">{formatCHF(r.montant)}</td><td className="num w-20 text-right text-xs text-slate-500">{c.montantInitial ? ((r.montant / c.montantInitial) * 100).toFixed(1) : "—"} %</td></tr>
            ))}
            {Math.abs(ecart) > 1 && <tr><td className="text-amber-600">Non réparti</td><td className="num text-right text-amber-600">{formatCHF(ecart)}</td><td /></tr>}
          </tbody>
        </Tableau>
      )}
      {edition && (
        <ModaleRepartition b={b} titre={`Répartition du contrat ${c.numero}`} total={c.montantInitial} initial={rep}
          aide="Répartissez le montant initial ; avenants et factures suivent les mêmes proportions." onFermer={() => setEdition(false)}
          onEnregistrer={(r) => modifier("contrats", c.id, { repartition: r })} />
      )}
    </Carte>
  );
}
