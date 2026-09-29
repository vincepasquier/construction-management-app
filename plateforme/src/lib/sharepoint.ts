// Intégration SharePoint via Microsoft Graph (authentification Entra ID / MSAL, flux SPA).
//
// Prérequis côté Azure : inscrire une application « Single-page application » avec l'URL de
// redirection de la plateforme, et les permissions déléguées Graph « Sites.ReadWrite.All »
// (ou « Sites.Selected ») et « Files.ReadWrite.All ».
import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from "@azure/msal-browser";
import type { ParametresSharePoint } from "../types";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = ["Sites.ReadWrite.All", "Files.ReadWrite.All"];

export interface ElementSharePoint {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  lastModifiedDateTime: string;
  lastModifiedBy?: { user?: { displayName?: string } };
  folder?: { childCount: number };
  file?: { mimeType: string };
}

let msal: PublicClientApplication | null = null;
let cleMsal = "";

export function estConfigure(p: ParametresSharePoint) {
  return Boolean(p.clientId && p.tenantId && p.hostname && p.sitePath);
}

async function instance(p: ParametresSharePoint) {
  const cle = `${p.clientId}|${p.tenantId}`;
  if (!msal || cleMsal !== cle) {
    msal = new PublicClientApplication({
      auth: {
        clientId: p.clientId,
        authority: `https://login.microsoftonline.com/${p.tenantId}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: "localStorage" },
    });
    await msal.initialize();
    cleMsal = cle;
  }
  return msal;
}

export async function compteConnecte(p: ParametresSharePoint): Promise<AccountInfo | null> {
  if (!estConfigure(p)) return null;
  const m = await instance(p);
  return m.getAllAccounts()[0] ?? null;
}

export async function connecter(p: ParametresSharePoint): Promise<AccountInfo> {
  const m = await instance(p);
  const r = await m.loginPopup({ scopes: SCOPES });
  return r.account;
}

export async function deconnecter(p: ParametresSharePoint) {
  const m = await instance(p);
  const compte = m.getAllAccounts()[0];
  if (compte) await m.logoutPopup({ account: compte });
}

async function jeton(p: ParametresSharePoint): Promise<string> {
  const m = await instance(p);
  const compte = m.getAllAccounts()[0];
  if (!compte) throw new Error("Non connecté à Microsoft 365.");
  try {
    return (await m.acquireTokenSilent({ scopes: SCOPES, account: compte })).accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) return (await m.acquireTokenPopup({ scopes: SCOPES })).accessToken;
    throw e;
  }
}

async function graph<T>(p: ParametresSharePoint, chemin: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${GRAPH}${chemin}`, {
    ...init,
    headers: { Authorization: `Bearer ${await jeton(p)}`, ...(init?.headers ?? {}) },
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Graph ${r.status} : ${detail.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

const cacheSite = new Map<string, string>();
async function siteId(p: ParametresSharePoint): Promise<string> {
  const cle = `${p.hostname}${p.sitePath}`;
  if (!cacheSite.has(cle)) {
    const site = await graph<{ id: string }>(p, `/sites/${p.hostname}:${p.sitePath}`);
    cacheSite.set(cle, site.id);
  }
  return cacheSite.get(cle)!;
}

const encoderChemin = (chemin: string) =>
  chemin.split("/").filter(Boolean).map(encodeURIComponent).join("/");

/** Liste le contenu d'un dossier de la bibliothèque « Documents » du site */
export async function listerDossier(p: ParametresSharePoint, chemin: string): Promise<ElementSharePoint[]> {
  const id = await siteId(p);
  const c = encoderChemin(chemin);
  const url = c ? `/sites/${id}/drive/root:/${c}:/children` : `/sites/${id}/drive/root/children`;
  const r = await graph<{ value: ElementSharePoint[] }>(p, `${url}?$top=200&$orderby=name`);
  return r.value;
}

export async function rechercher(p: ParametresSharePoint, requete: string): Promise<ElementSharePoint[]> {
  const id = await siteId(p);
  const r = await graph<{ value: ElementSharePoint[] }>(p, `/sites/${id}/drive/root/search(q='${encodeURIComponent(requete.replace(/'/g, "''"))}')`);
  return r.value;
}

/** Téléverse un fichier (jusqu'à 4 Mo par cette méthode simple) */
export async function televerser(p: ParametresSharePoint, chemin: string, fichier: File): Promise<ElementSharePoint> {
  if (fichier.size > 4 * 1024 * 1024) throw new Error("Fichier > 4 Mo : utilisez directement SharePoint pour les gros fichiers.");
  const id = await siteId(p);
  const c = encoderChemin(`${chemin}/${fichier.name}`);
  return graph<ElementSharePoint>(p, `/sites/${id}/drive/root:/${c}:/content`, {
    method: "PUT",
    headers: { "Content-Type": fichier.type || "application/octet-stream" },
    body: fichier,
  });
}

export async function creerDossier(p: ParametresSharePoint, parent: string, nom: string): Promise<ElementSharePoint> {
  const id = await siteId(p);
  const c = encoderChemin(parent);
  const url = c ? `/sites/${id}/drive/root:/${c}:/children` : `/sites/${id}/drive/root/children`;
  return graph<ElementSharePoint>(p, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: nom, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  });
}
