// Notifications de l'utilisateur : ce qui l'attend, ses préférences par type d'événement, et ses
// délégations en cas d'absence. Les canaux Teams et courriel sont simulés : on voit ce qui partirait.
import { Bell, BellOff, CheckCheck, Mail, MessageCircle, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Bouton, Case, Champ, cx, Liste, Onglets, Saisie } from "@/app/ui";
import { anciennete } from "@/app/ui/metier";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { CANAUX, canauxDe, TYPES_NOTIFICATION, type Preferences } from "@/domaine/socle/collaboration";
import type { CanalNotification } from "@/domaine/socle/types";
import { useActions, useDonnees, useMeta, useUtilisateur } from "@/donnees/hooks";
import { clePreferences } from "@/donnees/notifications";

type Onglet = "recues" | "envois" | "reglages";

export function Cloche() {
  const utilisateur = useUtilisateur();
  const { notifications, delegations, personnes } = useDonnees();
  const { modifier, supprimer, ajouter, grouper } = useActions();
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("recues");
  const [preferences, setPreferences] = useMeta<Preferences>(clePreferences(utilisateur?.id ?? ""), {});
  const [delegation, setDelegation] = useState({ aId: "", debut: aujourdhui(), fin: aujourdhui(), motif: "" });
  if (!utilisateur) return null;

  const miennes = notifications.filter((n) => n.destinataireId === utilisateur.id).sort((a, b) => b.date.localeCompare(a.date));
  const recues = miennes.filter((n) => n.canal === "Application");
  const envois = miennes.filter((n) => n.canal !== "Application");
  const nonLues = recues.filter((n) => !n.lu).length;
  const mesDelegations = delegations.filter((d) => d.deId === utilisateur.id || d.aId === utilisateur.id).sort((a, b) => b.debut.localeCompare(a.debut));
  const nom = (id: string) => personnes.find((p) => p.id === id)?.nom ?? "";

  const basculer = (type: (typeof TYPES_NOTIFICATION)[number], canal: CanalNotification) => {
    const actuels = canauxDe(preferences, type);
    setPreferences({ ...preferences, [type]: actuels.includes(canal) ? actuels.filter((c) => c !== canal) : [...actuels, canal] });
  };
  const toutLire = () => grouper("Notifications lues", () => recues.filter((n) => !n.lu).forEach((n) => modifier("notifications", n.id, { lu: true })), { irreversible: true });

  return (
    <div className="relative">
      <button type="button" onClick={() => setOuvert(!ouvert)} aria-label={`Notifications${nonLues ? ` (${nonLues} non lues)` : ""}`} aria-expanded={ouvert}
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Bell size={17} />
        {nonLues > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">{nonLues > 9 ? "9+" : nonLues}</span>}
      </button>
      {ouvert && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOuvert(false)} />
          <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-40 mt-2 flex max-h-[75vh] w-[26rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "recues", libelle: "Reçues", compte: nonLues || undefined }, { id: "envois", libelle: "Envois simulés", compte: envois.length || undefined }, { id: "reglages", libelle: "Réglages" }]} />
              {onglet === "recues" && nonLues > 0 && <button type="button" title="Tout marquer comme lu" aria-label="Tout marquer comme lu" className="rounded p-1 text-slate-400 hover:text-slate-700" onClick={toutLire}><CheckCheck size={16} /></button>}
            </div>
            <div className="flex-1 overflow-y-auto">
              {onglet === "recues" && (recues.length === 0 ? <p className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-slate-500"><BellOff size={20} className="text-slate-300" />Aucune notification.</p> : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recues.slice(0, 60).map((n) => (
                    <li key={n.id} className={cx("group flex gap-2 px-3 py-2.5", !n.lu && "bg-brand-50/50 dark:bg-sky-950/30")}>
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { if (!n.lu) modifier("notifications", n.id, { lu: true }, { irreversible: true }); if (n.lien) { setOuvert(false); navigate(n.lien); } }}>
                        <p className="flex items-center gap-2 text-xs text-slate-500"><Badge couleur={n.type === "Validation" || n.type === "Signature" ? "orange" : n.type === "Mention" ? "bleu" : "gris"}>{n.type}</Badge>{anciennete(n.date)}</p>
                        <p className={cx("mt-0.5 text-sm", n.lu ? "text-slate-600 dark:text-slate-300" : "font-medium text-slate-900 dark:text-white")}>{n.titre}</p>
                        {n.texte && <p className="truncate text-xs text-slate-500">{n.texte}</p>}
                      </button>
                      <button type="button" aria-label="Supprimer la notification" className="self-start rounded p-1 text-slate-300 opacity-0 hover:text-rose-600 group-hover:opacity-100" onClick={() => supprimer("notifications", n.id, { irreversible: true })}><Trash2 size={13} /></button>
                    </li>
                  ))}
                </ul>
              ))}
              {onglet === "envois" && (
                <div>
                  <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">Ce qui partirait par Teams ou par courriel, si ces canaux étaient raccordés. Le message ne contient que l'objet et le lien : ni montant ni contenu.</p>
                  {envois.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Aucun envoi.</p> : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {envois.slice(0, 60).map((n) => <li key={n.id} className="flex items-center gap-2 px-3 py-2 text-sm">{n.canal.startsWith("Teams") ? <MessageCircle size={14} className="shrink-0 text-violet-500" /> : <Mail size={14} className="shrink-0 text-sky-500" />}<span className="min-w-0 flex-1 truncate">{n.titre}</span><span className="shrink-0 text-xs text-slate-400">{anciennete(n.date)}</span></li>)}
                    </ul>
                  )}
                </div>
              )}
              {onglet === "reglages" && (
                <div className="space-y-5 p-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Settings2 size={13} /> Canaux par type d'événement</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1 font-medium">Événement</th>{CANAUX.map((c) => <th key={c} className="pb-1 text-center font-medium">{c.replace(" (simulé)", "")}</th>)}</tr></thead>
                      <tbody>{TYPES_NOTIFICATION.map((t) => <tr key={t} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5">{t}</td>{CANAUX.map((c) => <td key={c} className="text-center"><input type="checkbox" aria-label={`${t} par ${c}`} className="size-4 rounded border-slate-300 text-brand-600" checked={canauxDe(preferences, t).includes(c)} onChange={() => basculer(t, c)} /></td>)}</tr>)}</tbody>
                    </table>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Délégation en cas d'absence</p>
                    <p className="mb-2 text-xs text-slate-500">Pendant la période, la personne choisie peut valider à votre place ; chaque décision prise ainsi est marquée « par délégation ».</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Champ libelle="Confier mes validations à" className="col-span-2"><Liste libre value={delegation.aId} onChange={(e) => setDelegation({ ...delegation, aId: e.target.value })}><option value="">—</option>{personnes.filter((p) => p.id !== utilisateur.id).sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste></Champ>
                      <Champ libelle="Du"><Saisie libre type="date" value={delegation.debut} onChange={(e) => setDelegation({ ...delegation, debut: e.target.value })} /></Champ>
                      <Champ libelle="Au"><Saisie libre type="date" value={delegation.fin} onChange={(e) => setDelegation({ ...delegation, fin: e.target.value })} /></Champ>
                    </div>
                    <Bouton libre taille="sm" variante="primaire" className="mt-2" disabled={!delegation.aId || delegation.fin < delegation.debut}
                      onClick={() => { ajouter("delegations", { id: nouvelId("del"), deId: utilisateur.id, aId: delegation.aId, debut: delegation.debut, fin: delegation.fin, motif: delegation.motif || undefined }); setDelegation({ ...delegation, aId: "" }); }}>Déléguer</Bouton>
                    {mesDelegations.length > 0 && (
                      <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                        {mesDelegations.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 py-1.5">
                            <span className="min-w-0 flex-1">{d.deId === utilisateur.id ? <>à <span className="font-medium">{nom(d.aId)}</span></> : <>de <span className="font-medium">{nom(d.deId)}</span></>}<span className="block text-xs text-slate-500">du {formatDate(d.debut)} au {formatDate(d.fin)}{d.fin < aujourdhui() ? " · terminée" : d.debut <= aujourdhui() ? " · en cours" : ""}</span></span>
                            {d.deId === utilisateur.id && <button type="button" aria-label="Retirer la délégation" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => supprimer("delegations", d.id)}><Trash2 size={13} /></button>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Case libre libelle="Ne plus rien recevoir dans l'application (déconseillé)" checked={TYPES_NOTIFICATION.every((t) => !canauxDe(preferences, t).includes("Application"))}
                    onChange={(e) => setPreferences(Object.fromEntries(TYPES_NOTIFICATION.map((t) => [t, e.target.checked ? canauxDe(preferences, t).filter((c) => c !== "Application") : [...new Set([...canauxDe(preferences, t), "Application" as const])]])) as Preferences)} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
