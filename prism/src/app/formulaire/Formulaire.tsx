// Formulaire décrit par une liste de champs : sert aux fiches simples (référentiels, jalons,
// réserves…) et garantit partout les mêmes contrôles, libellés et pastilles d'origine.
import { useEffect, useState, type ReactNode } from "react";
import { useDonnees, useProjet } from "../../donnees/hooks";
import { lireNombre } from "../table/TableDonnees";
import { Bouton, Case, Champ, cx, Liste, Panneau, Saisie, Zone, type OrigineChamp } from "../ui";

export interface ChampSchema<T> {
  cle: keyof T & string;
  libelle: string;
  type: "texte" | "zone" | "nombre" | "date" | "liste" | "case" | "personne" | "entreprise" | "lot" | "direction";
  options?: readonly string[] | { valeur: string; libelle: string }[];
  obligatoire?: boolean;
  aide?: string;
  /** Le champ occupe toute la largeur */
  large?: boolean;
  origine?: OrigineChamp;
  lectureSeule?: boolean;
  visible?: (valeur: T) => boolean;
}

function OptionsReference({ type }: { type: "personne" | "entreprise" | "lot" | "direction" }) {
  const { personnes, entreprises, directions } = useDonnees();
  const { lots } = useProjet();
  const liste = type === "personne" ? personnes.map((p) => ({ id: p.id, nom: p.nom }))
    : type === "entreprise" ? entreprises.map((e) => ({ id: e.id, nom: e.nom }))
      : type === "direction" ? directions.map((d) => ({ id: d.id, nom: `${d.code} – ${d.nom}` }))
        : lots.map((l) => ({ id: l.id, nom: `${l.code} ${l.nom}` }));
  return <>{liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</>;
}

export function FormulaireSchema<T extends object>({ champs, valeur, onChange, manquants = [] }: { champs: ChampSchema<T>[]; valeur: T; onChange: (v: T) => void; manquants?: string[] }) {
  const v = valeur as Record<string, unknown>;
  const maj = (cle: string, x: unknown) => onChange({ ...valeur, [cle]: x });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {champs.filter((c) => !c.visible || c.visible(valeur)).map((c) => {
        const brut = v[c.cle];
        const texte = brut === undefined || brut === null ? "" : String(brut);
        const commun = { disabled: c.lectureSeule, "aria-invalid": manquants.includes(c.cle) || undefined };
        if (c.type === "case") {
          return <div key={c.cle} className={cx("self-end pb-2", c.large && "sm:col-span-2")}><Case libelle={c.libelle} checked={Boolean(brut)} onChange={(e) => maj(c.cle, e.target.checked)} {...commun} /></div>;
        }
        let controle: ReactNode;
        if (c.type === "zone") controle = <Zone rows={3} value={texte} onChange={(e) => maj(c.cle, e.target.value)} {...commun} />;
        else if (c.type === "liste") {
          controle = (
            <Liste value={texte} onChange={(e) => maj(c.cle, e.target.value)} {...commun}>
              {!c.obligatoire && <option value="">—</option>}
              {c.options?.map((o) => (typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.valeur} value={o.valeur}>{o.libelle}</option>))}
            </Liste>
          );
        } else if (c.type === "personne" || c.type === "entreprise" || c.type === "lot" || c.type === "direction") {
          controle = (
            <Liste value={texte} onChange={(e) => maj(c.cle, e.target.value || undefined)} {...commun}>
              <option value="">—</option>
              <OptionsReference type={c.type} />
            </Liste>
          );
        } else if (c.type === "nombre") {
          controle = <Saisie inputMode="decimal" className="text-right num" defaultValue={texte} key={`${c.cle}-${texte}`} onBlur={(e) => maj(c.cle, lireNombre(e.target.value))} {...commun} />;
        } else {
          controle = <Saisie type={c.type === "date" ? "date" : "text"} value={texte} onChange={(e) => maj(c.cle, e.target.value)} {...commun} />;
        }
        return (
          <Champ key={c.cle} libelle={c.libelle} aide={manquants.includes(c.cle) ? "Champ obligatoire" : c.aide} obligatoire={c.obligatoire} origine={c.origine}
            className={cx((c.large || c.type === "zone") && "sm:col-span-2", manquants.includes(c.cle) && "[&_span:last-child]:text-rose-600")}>
            {controle}
          </Champ>
        );
      })}
    </div>
  );
}

/** Champs obligatoires restés vides */
export function champsManquants<T extends object>(champs: ChampSchema<T>[], valeur: T): string[] {
  const v = valeur as Record<string, unknown>;
  return champs.filter((c) => c.obligatoire && (!c.visible || c.visible(valeur)) && (v[c.cle] === undefined || v[c.cle] === null || v[c.cle] === "")).map((c) => c.cle);
}

/** Fiche d'édition dans le panneau latéral : brouillon local, contrôle des champs obligatoires */
export function PanneauFiche<T extends object>({ titre, initial, champs, onEnregistrer, onFermer, onSupprimer, large, enfants }: {
  titre: string;
  /** Valeur à modifier ; `null` ferme le panneau */
  initial: T | null;
  champs: ChampSchema<T>[];
  onEnregistrer: (v: T) => void;
  onFermer: () => void;
  onSupprimer?: () => void;
  large?: boolean;
  /** Contenu ajouté sous le formulaire (historique, commentaires…) */
  enfants?: (valeur: T) => ReactNode;
}) {
  const [brouillon, setBrouillon] = useState<T | null>(initial);
  const [manquants, setManquants] = useState<string[]>([]);
  useEffect(() => { setBrouillon(initial); setManquants([]); }, [initial]);
  if (!initial || !brouillon) return null;
  const enregistrer = () => {
    const m = champsManquants(champs, brouillon);
    setManquants(m);
    if (m.length === 0) onEnregistrer(brouillon);
  };
  return (
    <Panneau ouverte onFermer={onFermer} titre={titre} large={large}
      pied={<>
        {onSupprimer && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={onSupprimer}>Supprimer</Bouton>}
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" onClick={enregistrer}>Enregistrer</Bouton>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
        <FormulaireSchema champs={champs} valeur={brouillon} onChange={setBrouillon} manquants={manquants} />
        <button type="submit" hidden />
      </form>
      {enfants?.(brouillon)}
    </Panneau>
  );
}
