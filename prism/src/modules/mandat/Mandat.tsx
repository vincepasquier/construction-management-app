import { Commentaires } from "@/modules/collaboration/Commentaires";
// Mandat de projet : rédaction selon le modèle du groupe, soumission, signatures, versions.
import { Copy, Download, FilePlus2, Lock, PenLine, Plus, Printer, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { lireNombre } from "@/app/table/TableDonnees";
import { Alerte, Avatar, Badge, Bouton, Carte, Case, Champ, cx, Liste, Saisie, useLectureSeule, Vide, Zone, type CouleurBadge } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { estActif, score } from "@/domaine/lib/risques";
import { nouvelId } from "@/domaine/lib/id";
import { accesDe } from "@/domaine/socle/droits";
import { contenuInitial, creerMandat, integre, manques, MOTIFS, nouvelleVersion, PHASES_MANDAT, refuser, relancer, signer, soumettre } from "@/domaine/socle/mandat";
import type { ContenuMandat, Mandat as TypeMandat, RoleSignataire, StatutMandat } from "@/domaine/socle/types";
import { useActions, useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { useSynthese } from "@/donnees/lectures";
import { telechargerDocx } from "@/outils/telechargement";
import { blocsMandat } from "./exportMandat";

const COULEUR: Record<StatutMandat, CouleurBadge> = { Brouillon: "gris", Soumis: "orange", "Signé": "vert", "Refusé": "rouge", "Remplacé": "gris" };

export function Mandat() {
  const { projet, mandats, risques, partiesPrenantes } = useProjet();
  const { personnes, portefeuilles, entreprises } = useDonnees();
  const { ajouter, modifier, supprimer, grouper } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const s = useSynthese(projet?.id ?? "");
  const versions = [...mandats].sort((a, b) => b.version - a.version);
  const [choisi, setChoisi] = useState<string | null>(null);
  const mandat = versions.find((m) => m.id === choisi) ?? versions[0];
  const [brouillon, setBrouillon] = useState<ContenuMandat | null>(null);
  // Le brouillon suit la version affichée ; il est abandonné quand on en change
  useEffect(() => { setBrouillon(null); }, [mandat?.id]);
  if (!projet) return null;

  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom;
  const creer = () => {
    const parties = partiesPrenantes.map((p) => ({ ...p, nomAffiche: nom(p.personneId) ?? entreprises.find((e) => e.id === p.entrepriseId)?.nom ?? p.nom ?? "" })).filter((p) => p.nomAffiche);
    const contenu = contenuInitial(projet, {
      auteur: utilisateur, sponsor: personnes.find((p) => p.id === projet.sponsorId), chef: personnes.find((p) => p.id === projet.directeurId),
      portefeuille: portefeuilles.find((p) => p.id === projet.portefeuilleId)?.nom, budget: s.budgetApprouve,
      risques: risques.filter(estActif).sort((a, b) => score(b) - score(a)), parties,
    });
    const m = creerMandat(projet.id, contenu, { auteurId: utilisateur?.id, date: aujourdhui(), id: nouvelId("man") });
    ajouter("mandats", m);
    setChoisi(m.id);
  };

  if (!mandat) {
    return <Carte><Vide icone={<FilePlus2 size={22} />} titre="Aucun mandat de projet" texte="Le mandat formalise la demande : motifs, objectifs, périmètre, jalons, coûts, ressources et risques. Il est prérempli avec ce que la fiche du projet contient déjà."
      action={<Bouton variante="primaire" icone={<Plus size={15} />} onClick={creer}>Rédiger le mandat</Bouton>} /></Carte>;
  }

  const editable = !lecture && mandat.statut === "Brouillon";
  const c = brouillon ?? mandat.contenu;
  const modifie = brouillon !== null;
  const maj = (patch: Partial<ContenuMandat>) => setBrouillon({ ...c, ...patch });
  const manquants = manques(c);
  const enregistrer = () => { if (brouillon) { modifier("mandats", mandat.id, { contenu: brouillon }); setBrouillon(null); } };
  const appliquer = (suivant: () => TypeMandat, message: string) => {
    try {
      const m = suivant();
      grouper(message, () => {
        modifier("mandats", mandat.id, m);
        // À la signature d'une nouvelle version, la version signée précédente est remplacée
        if (m.statut === "Signé") for (const ancien of mandats.filter((x) => x.id !== m.id && x.statut === "Signé")) modifier("mandats", ancien.id, { statut: "Remplacé" });
      });
      notifier(message, "succes");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Opération impossible.", "erreur");
    }
  };
  const peutSigner = (role: RoleSignataire) => {
    const s2 = mandat.signatures.find((x) => x.role === role);
    return !!utilisateur && !s2?.date && (s2?.personneId === utilisateur.id || accesDe(utilisateur).profil === "Administrateur");
  };
  const exporter = () => void telechargerDocx(`Mandat ${projet.code} v${mandat.version}`, blocsMandat({ ...mandat, contenu: c }, projet.code), `Mandat de projet · ${projet.code} · version ${mandat.version}`);

  const texte = (cle: keyof ContenuMandat, libelle: string, o: { obligatoire?: boolean; aide?: string; lignes?: number; large?: boolean } = {}) => (
    <Champ libelle={libelle} obligatoire={o.obligatoire} aide={o.aide} className={o.large === false ? undefined : "sm:col-span-2"}>
      {o.lignes
        ? <Zone rows={o.lignes} disabled={!editable} value={String(c[cle] ?? "")} onChange={(e) => maj({ [cle]: e.target.value } as Partial<ContenuMandat>)} />
        : <Saisie disabled={!editable} value={String(c[cle] ?? "")} onChange={(e) => maj({ [cle]: e.target.value } as Partial<ContenuMandat>)} />}
    </Champ>
  );
  const rubrique = (titre: string, enfants: ReactNode, obligatoire = false) => (
    <Carte titre={<span>{titre}{obligatoire && <span className="text-rose-600" title="Rubrique obligatoire du modèle"> *</span>}</span>}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{enfants}</div>
    </Carte>
  );
  const retirer = (action: () => void) => editable && <button type="button" aria-label="Retirer la ligne" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={action}><Trash2 size={14} /></button>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6 zone-impression">
        <h2 className="hidden text-xl font-semibold print:block">Mandat de projet · {projet.code} · version {mandat.version}</h2>
        {mandat.statut === "Signé" && !integre(mandat) && <Alerte type="erreur">Le contenu de ce mandat ne correspond plus à l'empreinte enregistrée à sa signature.</Alerte>}
        {rubrique("Identification", <>
          {texte("nomProjet", "Nom du projet (n° si existant)", { obligatoire: true })}
          {texte("auteur", "Auteur du document", { obligatoire: true, large: false })}
          {texte("portefeuille", "Portefeuille de projet", { large: false })}
        </>, true)}
        {rubrique("Parties prenantes", <>
          {texte("commanditaire", "Commanditaire / sponsor", { obligatoire: true, large: false })}
          {texte("chefProjet", "Chef de projet", { obligatoire: true, large: false })}
          {texte("client", "Client", { large: false, aide: "S'il est désigné, il signe le mandat" })}
          {texte("autresParties", "Autres parties prenantes", { large: false })}
        </>, true)}
        {rubrique("Motif(s) du projet", <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">{MOTIFS.map((m) => <Case key={m.cle} libelle={m.libelle} disabled={!editable} checked={c.motifs[m.cle]} onChange={(e) => maj({ motifs: { ...c.motifs, [m.cle]: e.target.checked } })} />)}</div>, true)}
        {rubrique("Contexte et bénéfices", <>
          {texte("contexte", "Contexte", { obligatoire: true, lignes: 5 })}
          {texte("benefices", "Bénéfices attendus", { obligatoire: true, lignes: 5 })}
        </>, true)}
        {rubrique("Objectifs du projet", <div className="sm:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1.5 pr-2 font-medium">Objectif</th><th className="pb-1.5 pr-2 font-medium">Critère de succès</th><th className="w-48 pb-1.5 pr-2 font-medium">Responsabilité d'approbation</th><th className="w-8" /></tr></thead>
            <tbody>{c.objectifs.map((o) => {
              const majO = (patch: Partial<typeof o>) => maj({ objectifs: c.objectifs.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) });
              return (
                <tr key={o.id} className="align-top">
                  <td className="py-1 pr-2"><Zone rows={2} disabled={!editable} aria-label="Objectif" value={o.objectif} onChange={(e) => majO({ objectif: e.target.value })} /></td>
                  <td className="py-1 pr-2"><Zone rows={2} disabled={!editable} aria-label="Critère de succès" value={o.critere} onChange={(e) => majO({ critere: e.target.value })} /></td>
                  <td className="py-1 pr-2"><Saisie disabled={!editable} aria-label="Responsabilité d'approbation" value={o.approbateur} onChange={(e) => majO({ approbateur: e.target.value })} /></td>
                  <td className="py-2">{retirer(() => maj({ objectifs: c.objectifs.filter((x) => x.id !== o.id) }))}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {editable && <Bouton taille="sm" variante="fantome" icone={<Plus size={13} />} onClick={() => maj({ objectifs: [...c.objectifs, { id: nouvelId("obj"), objectif: "", critere: "", approbateur: "" }] })}>Objectif</Bouton>}
        </div>, true)}
        {rubrique("Périmètre", <>
          {texte("perimetre", "Dans le périmètre", { lignes: 3, large: false })}
          {texte("exclusions", "Hors périmètre", { lignes: 3, large: false })}
        </>)}
        {rubrique("Impacts environnementaux et sociétaux", <>
          {texte("impactsEnvironnementaux", "Impacts environnementaux", { obligatoire: true, lignes: 3, large: false, aide: "Indiquer « Aucun » le cas échéant" })}
          {texte("impactsSociaux", "Impacts sociaux", { obligatoire: true, lignes: 3, large: false })}
          {texte("projetsConnexes", "Projets connexes et lien avec le projet", { lignes: 2 })}
        </>, true)}
        {rubrique("Composante IT", <>
          <div className="sm:col-span-2"><Case libelle="Le projet a une composante informatique" disabled={!editable} checked={c.composanteIT} onChange={(e) => maj({ composanteIT: e.target.checked })} /></div>
          {c.composanteIT && <>
            {texte("descriptionIT", "Description, rôles et responsabilités", { obligatoire: true, lignes: 4, aide: "Responsable de projets IT, architecte, sécurité, responsable d'application, data owner" })}
            <Champ libelle="Validation en Archiboard reçue le"><Saisie type="date" disabled={!editable} value={c.dateArchiboard ?? ""} onChange={(e) => maj({ dateArchiboard: e.target.value || undefined })} /></Champ>
          </>}
        </>, true)}
        {rubrique("Jalons et livrables du projet", <div className="sm:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1.5 font-medium">Phase</th><th className="w-40 pb-1.5 font-medium">Début estimé</th><th className="w-40 pb-1.5 font-medium">Fin estimée</th><th className="pb-1.5 font-medium">Livrables</th></tr></thead>
            <tbody>{c.phases.map((p) => {
              const obligatoire = PHASES_MANDAT.find((x) => x.phase === p.phase)?.obligatoire;
              const majP = (patch: Partial<typeof p>) => maj({ phases: c.phases.map((x) => (x.phase === p.phase ? { ...x, ...patch } : x)) });
              return (
                <tr key={p.phase} className="align-top">
                  <td className="py-1.5 pr-3"><Case libelle={<span>{p.phase}{obligatoire && <span className="text-rose-600"> *</span>}</span>} disabled={!editable || obligatoire} checked={p.applicable} onChange={(e) => majP({ applicable: e.target.checked })} /></td>
                  <td className="py-1 pr-2"><Saisie type="date" aria-label={`Début ${p.phase}`} disabled={!editable || !p.applicable} value={p.debut ?? ""} onChange={(e) => majP({ debut: e.target.value || undefined })} /></td>
                  <td className="py-1 pr-2"><Saisie type="date" aria-label={`Fin ${p.phase}`} disabled={!editable || !p.applicable} value={p.fin ?? ""} onChange={(e) => majP({ fin: e.target.value || undefined })} /></td>
                  <td className="py-1"><Zone rows={1} aria-label={`Livrables ${p.phase}`} disabled={!editable || !p.applicable} value={p.livrables ?? ""} onChange={(e) => majP({ livrables: e.target.value })} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>, true)}
        {rubrique("Coûts estimés du projet", <>
          {texte("coutsTexte", "Commentaire sur l'estimation", { lignes: 3 })}
          <Champ libelle="Budget CHF" obligatoire><Saisie inputMode="decimal" className="text-right num" disabled={!editable} key={c.budget} defaultValue={c.budget ? c.budget.toLocaleString("fr-CH") : ""} onBlur={(e) => { const v = lireNombre(e.target.value); if (v !== c.budget) maj({ budget: v }); }} /></Champ>
          {texte("centreCout", "N° de centre de coût ou d'ordre", { large: false })}
        </>, true)}
        {rubrique("Estimation et disponibilité des ressources humaines", <div className="sm:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1.5 font-medium">Provenance des ressources</th><th className="w-32 pb-1.5 text-right font-medium">Jours-hommes</th><th className="w-52 pb-1.5 pl-4 font-medium">Disponibilité</th><th className="w-8" /></tr></thead>
            <tbody>{c.ressources.map((r) => {
              const majR = (patch: Partial<typeof r>) => maj({ ressources: c.ressources.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) });
              return (
                <tr key={r.id}>
                  <td className="py-1 pr-2"><Saisie disabled={!editable} aria-label="Provenance" value={r.provenance} onChange={(e) => majR({ provenance: e.target.value })} /></td>
                  <td className="py-1"><Saisie inputMode="decimal" className="text-right num" disabled={!editable} aria-label="Jours-hommes" value={r.joursHommes || ""} onChange={(e) => majR({ joursHommes: Number(e.target.value.replace(",", ".")) || 0 })} /></td>
                  <td className="py-1 pl-4"><Case libelle="confirmée par le responsable" disabled={!editable} checked={r.confirmee} onChange={(e) => majR({ confirmee: e.target.checked })} /></td>
                  <td>{retirer(() => maj({ ressources: c.ressources.filter((x) => x.id !== r.id) }))}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr className="font-semibold"><td className="pt-2">Total</td><td className="pt-2 pr-3 text-right num">{c.ressources.reduce((t, r) => t + r.joursHommes, 0)} J/H</td><td colSpan={2} /></tr></tfoot>
          </table>
          {editable && <Bouton taille="sm" variante="fantome" icone={<Plus size={13} />} onClick={() => maj({ ressources: [...c.ressources, { id: nouvelId("res"), provenance: "", joursHommes: 0, confirmee: false }] })}>Ressource</Bouton>}
        </div>, true)}
        {rubrique("Risques majeurs identifiés", <div className="sm:col-span-2">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="w-2/5 pb-1.5 font-medium">Risque</th><th className="pb-1.5 font-medium">Réponse envisagée</th><th className="w-8" /></tr></thead>
            <tbody>{c.risques.map((r) => {
              const majR = (patch: Partial<typeof r>) => maj({ risques: c.risques.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) });
              return (
                <tr key={r.id} className="align-top">
                  <td className="py-1 pr-2"><Zone rows={2} disabled={!editable} aria-label="Risque" value={r.risque} onChange={(e) => majR({ risque: e.target.value })} /></td>
                  <td className="py-1 pr-2"><Zone rows={2} disabled={!editable} aria-label="Réponse envisagée" value={r.reponse} onChange={(e) => majR({ reponse: e.target.value })} /></td>
                  <td className="py-2">{retirer(() => maj({ risques: c.risques.filter((x) => x.id !== r.id) }))}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {editable && <Bouton taille="sm" variante="fantome" icone={<Plus size={13} />} onClick={() => maj({ risques: [...c.risques, { id: nouvelId("rsq"), risque: "", reponse: "" }] })}>Risque</Bouton>}
        </div>)}
        {rubrique("Décision de démarrage et annexes", <>
          <div className="sm:col-span-2"><Case libelle="Un préavis du ComInv est nécessaire" disabled={!editable} checked={c.preavisComInv} onChange={(e) => maj({ preavisComInv: e.target.checked })} /></div>
          {texte("annexes", "Annexes", { lignes: 2 })}
        </>)}
        <Commentaires cible={{ collection: "mandats", id: mandat.id }} projetId={projet.id} titre="Échanges sur le mandat" />
      </div>

      <aside className="space-y-4 pas-impression xl:sticky xl:top-0 xl:self-start">
        <Carte>
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Liste libre aria-label="Version du mandat" value={mandat.id} onChange={(e) => setChoisi(e.target.value)}>{versions.map((m) => <option key={m.id} value={m.id}>Version {m.version} · {m.statut}</option>)}</Liste>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge couleur={COULEUR[mandat.statut]}>{mandat.statut === "Signé" && <Lock size={11} />}{mandat.statut}</Badge>
              <span>créé le {formatDate(mandat.dateCreation)}{nom(mandat.auteurId) ? ` par ${nom(mandat.auteurId)}` : ""}</span>
            </div>
            {mandat.decision && <p className="text-sm">Décision de démarrage : <span className="font-medium">{mandat.decision}</span></p>}
            {mandat.empreinte && <p className="break-all text-[11px] text-slate-400" title="Empreinte du contenu signé">Empreinte {mandat.empreinte}</p>}
            {editable && (
              <>
                <Bouton variante={modifie ? "primaire" : "secondaire"} className="w-full" icone={<Save size={15} />} disabled={!modifie} onClick={enregistrer}>{modifie ? "Enregistrer le brouillon" : "Brouillon enregistré"}</Bouton>
                <Bouton variante="primaire" className="w-full" icone={<Send size={15} />} disabled={modifie || manquants.length > 0}
                  title={modifie ? "Enregistrez d'abord le brouillon" : undefined} onClick={() => appliquer(() => soumettre(mandat, personnes, aujourdhui()), "Mandat soumis à signature")}>Soumettre à signature</Bouton>
              </>
            )}
            <div className="flex gap-2">
              <Bouton libre className="flex-1" icone={<Download size={15} />} onClick={exporter}>Word</Bouton>
              <Bouton libre className="flex-1" icone={<Printer size={15} />} onClick={() => window.print()}>PDF</Bouton>
            </div>
            {(mandat.statut === "Signé" || mandat.statut === "Refusé" || mandat.statut === "Remplacé") && !lecture && versions[0].id === mandat.id && (
              <Bouton className="w-full" icone={<Copy size={15} />} onClick={() => { const v = nouvelleVersion(mandat, mandats, { auteurId: utilisateur?.id, date: aujourdhui() }); ajouter("mandats", { ...v, id: nouvelId("man") }); setChoisi(null); notifier(`Version ${v.version} créée en brouillon.`, "succes"); }}>Nouvelle version</Bouton>
            )}
            {editable && mandats.length > 0 && (
              <Bouton variante="fantome" className="w-full text-rose-600" icone={<Trash2 size={14} />} onClick={async () => {
                const r = await confirmer({ titre: `Supprimer le brouillon (version ${mandat.version})`, message: "Le brouillon sera supprimé. Les versions signées sont conservées.", action: "Supprimer", danger: true, motif: true });
                if (r) { supprimer("mandats", mandat.id, { motif: r.motif }); setChoisi(null); }
              }}>Supprimer ce brouillon</Bouton>
            )}
          </div>
        </Carte>

        {editable && manquants.length > 0 && (
          <Carte titre="À compléter avant la soumission">
            <ul className="space-y-1 px-4 pb-4 text-sm text-slate-600 dark:text-slate-300">{manquants.map((m) => <li key={m.cle} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" />{m.libelle}</li>)}</ul>
          </Carte>
        )}

        {mandat.signatures.length > 0 && (
          <Carte titre="Signatures" sousTitre="Signature simulée : l'utilisateur choisi dans la barre du haut signe pour son rôle">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {mandat.signatures.map((sg) => (
                <li key={sg.role} className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {sg.nom && <Avatar nom={sg.nom} taille={26} />}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{sg.nom || "À désigner"}</p><p className="text-xs text-slate-500">{sg.role}</p></div>
                    {sg.date ? <Badge couleur="vert">Signé le {formatDate(sg.date)}</Badge> : <Badge couleur="orange">Attendue</Badge>}
                  </div>
                  {!sg.date && mandat.statut === "Soumis" && (
                    <div className="flex flex-wrap gap-2">
                      {peutSigner(sg.role) && <Bouton libre taille="sm" variante="primaire" icone={<PenLine size={13} />} onClick={() => appliquer(() => signer(mandat, sg.role, aujourdhui(), sg.personneId ? undefined : utilisateur && { id: utilisateur.id, nom: utilisateur.nom }), `Mandat signé (${sg.role.toLowerCase()})`)}>Signer</Bouton>}
                      {!lecture && <Bouton taille="sm" variante="fantome" onClick={() => appliquer(() => relancer(mandat, sg.role, aujourdhui()), `Relance envoyée (${sg.role.toLowerCase()})`)}>Relancer{sg.relances?.length ? ` (${sg.relances.length})` : ""}</Bouton>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {mandat.statut === "Soumis" && mandat.signatures.some((sg) => peutSigner(sg.role)) && (
              <div className={cx("flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800")}>
                <Bouton libre taille="sm" onClick={() => appliquer(() => refuser(mandat, "Complément demandé"), "Complément d'information demandé")}>Demander un complément</Bouton>
                <Bouton libre taille="sm" variante="fantome" className="text-rose-600" onClick={() => appliquer(() => refuser(mandat, "Refusé"), "Mandat refusé")}>Refuser</Bouton>
              </div>
            )}
          </Carte>
        )}
      </aside>
    </div>
  );
}
