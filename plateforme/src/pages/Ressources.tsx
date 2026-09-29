import { useState } from "react";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useProjetActif, useStore } from "../store/useStore";
import { aujourdhui, formatDate } from "../lib/format";
import { nouvelId } from "../lib/id";
import { libelleCFC } from "../data/cfc";
import { Avatar, Badge, Bouton, Carte, Champ, cx, EnTetePage, Liste, Modale, Saisie, Tableau } from "../components/ui";
import type { Affectation, Lot, Personne, Role } from "../types";

const ROLES: Role[] = ["Directeur de projet", "Responsable de lot", "Conducteur de travaux", "Ingénieur", "Architecte", "Assistant(e) de projet", "Maître d'ouvrage"];

/** Charge d'une personne (en % d'un plein temps) pour un mois donné */
function charge(affectations: Affectation[], personneId: string, mois: string) {
  const debut = `${mois}-01`;
  const fin = `${mois}-28`;
  return affectations.filter((a) => a.personneId === personneId && a.debut <= fin && a.fin >= debut).reduce((s, a) => s + a.pourcentage, 0);
}

export function Ressources() {
  const { personnes, affectations, projets, lots, ajouter, modifier, supprimer } = useStore();
  const d = useProjetActif();
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [affectation, setAffectation] = useState<Affectation | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);

  const mois: string[] = [];
  const d0 = new Date(aujourdhui().slice(0, 7) + "-01");
  for (let i = 0; i < 12; i++) { const m = new Date(d0); m.setMonth(m.getMonth() + i); mois.push(m.toISOString().slice(0, 7)); }
  const nomProjet = (id: string) => projets.find((p) => p.id === id)?.code ?? "?";

  return (
    <>
      <EnTetePage titre="Ressources" description="Équipe, rôles, organisation des lots et charge de travail"
        actions={<>
          <Bouton icone={<Plus size={15} />} onClick={() => setAffectation({ id: nouvelId("aff"), personneId: personnes[0]?.id ?? "", projetId: d.projet?.id ?? projets[0]?.id ?? "", pourcentage: 50, debut: aujourdhui(), fin: d.projet?.dateFin ?? aujourdhui() })}>Affectation</Bouton>
          <Bouton variante="primaire" icone={<UserPlus size={15} />} onClick={() => setPersonne({ id: nouvelId("per"), nom: "", role: "Responsable de lot", email: "", organisation: "", capacite: 100 })}>Personne</Bouton>
        </>} />

      <Carte titre="Plan de charge" sousTitre="Somme des affectations tous projets confondus, rapportée à la capacité de chacun (12 prochains mois)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="px-4 py-2 text-left font-medium">Personne</th>
                {mois.map((m) => <th key={m} className="px-1 py-2 text-center font-medium">{new Date(`${m}-01`).toLocaleDateString("fr-CH", { month: "short" })}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {personnes.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar nom={p.nom} />
                      <div><p className="font-medium">{p.nom}</p><p className="text-xs text-slate-500">{p.role} · {p.capacite} %</p></div>
                    </div>
                  </td>
                  {mois.map((m) => {
                    const c = charge(affectations, p.id, m);
                    const ratio = p.capacite ? c / p.capacite : 0;
                    return (
                      <td key={m} className="px-0.5 py-2">
                        <div className={cx("num mx-auto flex h-8 w-11 items-center justify-center rounded-md text-xs font-medium",
                          c === 0 && "text-slate-300",
                          ratio > 0 && ratio <= 0.7 && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                          ratio > 0.7 && ratio <= 1 && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                          ratio > 1 && "bg-rose-500 text-white")} title={`${c} % affecté pour ${p.capacite} % de capacité`}>
                          {c || "·"}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2"><button onClick={() => setPersonne(p)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 border-t border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100" />≤ 70 %</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100" />70–100 %</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-rose-500" />surcharge</span>
        </div>
      </Carte>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {d.projet && (
          <Carte titre={`Organisation des lots · ${d.projet.code}`} sousTitre="Chaque responsable de lot peut filtrer l'application sur son périmètre"
            action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => setLot({ id: nouvelId("lot"), projetId: d.projet!.id, code: `L${d.lots.length + 1}`, nom: "", cfc: [] })}>Lot</Bouton>}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {lots.filter((l) => l.projetId === d.projet!.id).map((l) => {
                const resp = personnes.find((p) => p.id === l.responsableId);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <Badge couleur="violet">{l.code}</Badge>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{l.nom}</p><p className="truncate text-xs text-slate-500">{l.cfc.map((c) => `${c} ${libelleCFC(c)}`).join(" · ") || "Aucun CFC"}</p></div>
                    {resp ? <span className="flex items-center gap-1.5 text-xs text-slate-600"><Avatar nom={resp.nom} taille={22} />{resp.nom}</span> : <span className="text-xs text-slate-400">Non attribué</span>}
                    <button onClick={() => setLot(l)} className="text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>
                  </li>
                );
              })}
            </ul>
          </Carte>
        )}

        <Carte titre="Affectations" sousTitre="Tous projets">
          <Tableau>
            <thead><tr><th>Personne</th><th>Projet</th><th className="!text-right">Taux</th><th>Période</th><th /></tr></thead>
            <tbody>
              {affectations.map((a) => (
                <tr key={a.id}>
                  <td>{personnes.find((p) => p.id === a.personneId)?.nom}</td>
                  <td><Badge>{nomProjet(a.projetId)}</Badge></td>
                  <td className="num text-right">{a.pourcentage} %</td>
                  <td className="text-xs text-slate-500">{formatDate(a.debut)} → {formatDate(a.fin)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setAffectation(a)} className="p-1 text-slate-300 hover:text-slate-600"><Pencil size={14} /></button>
                    <button onClick={() => supprimer("affectations", a.id)} className="p-1 text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Carte>
      </div>

      {personne && (
        <Modale ouverte onFermer={() => setPersonne(null)} titre="Personne"
          pied={<>
            {personnes.some((p) => p.id === personne.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("personnes", personne.id); setPersonne(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setPersonne(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!personne.nom} onClick={() => { if (personnes.some((p) => p.id === personne.id)) modifier("personnes", personne.id, personne); else ajouter("personnes", personne); setPersonne(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Nom" className="col-span-2"><Saisie value={personne.nom} onChange={(e) => setPersonne({ ...personne, nom: e.target.value })} /></Champ>
            <Champ libelle="Rôle"><Liste value={personne.role} onChange={(e) => setPersonne({ ...personne, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Liste></Champ>
            <Champ libelle="Capacité (%)"><Saisie type="number" value={personne.capacite} onChange={(e) => setPersonne({ ...personne, capacite: Number(e.target.value) })} /></Champ>
            <Champ libelle="E-mail"><Saisie type="email" value={personne.email} onChange={(e) => setPersonne({ ...personne, email: e.target.value })} /></Champ>
            <Champ libelle="Organisation"><Saisie value={personne.organisation} onChange={(e) => setPersonne({ ...personne, organisation: e.target.value })} /></Champ>
          </div>
        </Modale>
      )}

      {affectation && (
        <Modale ouverte onFermer={() => setAffectation(null)} titre="Affectation"
          pied={<><Bouton libre onClick={() => setAffectation(null)}>Annuler</Bouton><Bouton variante="primaire" onClick={() => { if (affectations.some((a) => a.id === affectation.id)) modifier("affectations", affectation.id, affectation); else ajouter("affectations", affectation); setAffectation(null); }}>Enregistrer</Bouton></>}>
          <div className="grid grid-cols-2 gap-4">
            <Champ libelle="Personne"><Liste value={affectation.personneId} onChange={(e) => setAffectation({ ...affectation, personneId: e.target.value })}>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste></Champ>
            <Champ libelle="Projet"><Liste value={affectation.projetId} onChange={(e) => setAffectation({ ...affectation, projetId: e.target.value })}>{projets.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</Liste></Champ>
            <Champ libelle="Taux d'occupation (%)"><Saisie type="number" value={affectation.pourcentage} onChange={(e) => setAffectation({ ...affectation, pourcentage: Number(e.target.value) })} /></Champ>
            <div />
            <Champ libelle="Début"><Saisie type="date" value={affectation.debut} onChange={(e) => setAffectation({ ...affectation, debut: e.target.value })} /></Champ>
            <Champ libelle="Fin"><Saisie type="date" value={affectation.fin} onChange={(e) => setAffectation({ ...affectation, fin: e.target.value })} /></Champ>
          </div>
        </Modale>
      )}

      {lot && (
        <Modale ouverte onFermer={() => setLot(null)} titre="Lot"
          pied={<>
            {lots.some((l) => l.id === lot.id) && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("lots", lot.id); setLot(null); }}>Supprimer</Bouton>}
            <Bouton libre onClick={() => setLot(null)}>Annuler</Bouton>
            <Bouton variante="primaire" disabled={!lot.nom} onClick={() => { if (lots.some((l) => l.id === lot.id)) modifier("lots", lot.id, lot); else ajouter("lots", lot); setLot(null); }}>Enregistrer</Bouton>
          </>}>
          <div className="grid grid-cols-3 gap-4">
            <Champ libelle="Code"><Saisie value={lot.code} onChange={(e) => setLot({ ...lot, code: e.target.value })} /></Champ>
            <Champ libelle="Nom" className="col-span-2"><Saisie value={lot.nom} onChange={(e) => setLot({ ...lot, nom: e.target.value })} /></Champ>
            <Champ libelle="Codes CFC couverts" aide="Séparés par des virgules. Un préfixe couvre ses sous-codes (21 → 211, 212…)" className="col-span-3">
              <Saisie value={lot.cfc.join(", ")} onChange={(e) => setLot({ ...lot, cfc: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </Champ>
            <Champ libelle="Responsable de lot" className="col-span-3">
              <Liste value={lot.responsableId ?? ""} onChange={(e) => setLot({ ...lot, responsableId: e.target.value || undefined })}>
                <option value="">—</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom} – {p.role}</option>)}
              </Liste>
            </Champ>
          </div>
        </Modale>
      )}
    </>
  );
}
