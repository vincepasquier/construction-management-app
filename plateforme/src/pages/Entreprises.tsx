import { useState } from "react";
import { Building2, Mail, Pencil, Phone, Plus, Search } from "lucide-react";
import { useStore } from "../store/useStore";
import { montantContrat } from "../lib/finance";
import { formatCompact } from "../lib/format";
import { nouvelId } from "../lib/id";
import { libelleCFC } from "../data/cfc";
import { Badge, Bouton, Carte, Champ, EnTetePage, Modale, Saisie, Vide } from "../components/ui";
import type { Entreprise } from "../types";

export function Entreprises() {
  const { entreprises, contrats, appelsOffres, ajouter, modifier, supprimer } = useStore();
  const [q, setQ] = useState("");
  const [edition, setEdition] = useState<Entreprise | null>(null);
  const liste = entreprises.filter((e) => `${e.nom} ${e.localite} ${e.specialites.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <EnTetePage titre="Entreprises & mandataires" description="Carnet d'adresses, spécialités CFC et historique des marchés"
        actions={<Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setEdition({ id: nouvelId("ent"), nom: "", localite: "", contact: "", email: "", telephone: "", specialites: [] })}>Entreprise</Bouton>} />
      <div className="relative mb-4 max-w-md">
        <Search size={15} className="absolute top-2.5 left-3 text-slate-400" />
        <Saisie value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, localité ou code CFC…" className="pl-9" />
      </div>
      {liste.length === 0 ? <Carte><Vide icone={<Building2 size={22} />} titre="Aucune entreprise" /></Carte> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((e) => {
            const ctr = contrats.filter((c) => c.entrepriseId === e.id);
            const offres = appelsOffres.filter((a) => a.soumissions.some((s) => s.entrepriseId === e.id)).length;
            return (
              <Carte key={e.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{e.nom}</h3>
                    <p className="text-sm text-slate-500">{e.localite}{e.ide && ` · ${e.ide}`}</p>
                  </div>
                  <button onClick={() => setEdition(e)} className="text-slate-300 hover:text-slate-600"><Pencil size={15} /></button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">{e.specialites.map((s) => <Badge key={s} couleur="violet">{s} {libelleCFC(s)}</Badge>)}</div>
                <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {e.contact && <p>{e.contact}</p>}
                  {e.email && <a href={`mailto:${e.email}`} className="flex items-center gap-2 hover:text-brand-600"><Mail size={13} />{e.email}</a>}
                  {e.telephone && <a href={`tel:${e.telephone}`} className="flex items-center gap-2 hover:text-brand-600"><Phone size={13} />{e.telephone}</a>}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
                  <div><p className="num text-lg font-semibold">{ctr.length}</p><p className="text-xs text-slate-500">contrats</p></div>
                  <div><p className="num text-lg font-semibold">{formatCompact(ctr.reduce((s, c) => s + montantContrat(c), 0))}</p><p className="text-xs text-slate-500">CHF engagés</p></div>
                  <div><p className="num text-lg font-semibold">{offres}</p><p className="text-xs text-slate-500">offres</p></div>
                </div>
              </Carte>
            );
          })}
        </div>
      )}
      {edition && (
        <Modale ouverte onFermer={() => setEdition(null)} titre="Entreprise"
          pied={<>
            {entreprises.some((e) => e.id === edition.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => {
              if (contrats.some((c) => c.entrepriseId === edition.id)) { alert("Cette entreprise est liée à des contrats."); return; }
              supprimer("entreprises", edition.id); setEdition(null);
            }}>Supprimer</Bouton>}
            <Bouton onClick={() => setEdition(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!edition.nom} onClick={() => { if (entreprises.some((e) => e.id === edition.id)) modifier("entreprises", edition.id, edition); else ajouter("entreprises", edition); setEdition(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Raison sociale" className="col-span-2"><Saisie value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} /></Champ>
            <Champ libelle="Localité"><Saisie value={edition.localite} onChange={(e) => setEdition({ ...edition, localite: e.target.value })} /></Champ>
            <Champ libelle="N° IDE"><Saisie value={edition.ide ?? ""} onChange={(e) => setEdition({ ...edition, ide: e.target.value })} placeholder="CHE-123.456.789" /></Champ>
            <Champ libelle="Personne de contact"><Saisie value={edition.contact} onChange={(e) => setEdition({ ...edition, contact: e.target.value })} /></Champ>
            <Champ libelle="Téléphone"><Saisie value={edition.telephone} onChange={(e) => setEdition({ ...edition, telephone: e.target.value })} /></Champ>
            <Champ libelle="E-mail" className="col-span-2"><Saisie type="email" value={edition.email} onChange={(e) => setEdition({ ...edition, email: e.target.value })} /></Champ>
            <Champ libelle="Spécialités (codes CFC)" aide="Séparés par des virgules – sert aux suggestions lors des appels d'offres" className="col-span-2">
              <Saisie value={edition.specialites.join(", ")} onChange={(e) => setEdition({ ...edition, specialites: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </Champ>
          </div>
        </Modale>
      )}
    </>
  );
}
