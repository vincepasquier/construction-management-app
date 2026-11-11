/** Identifiant unique préfixé, ex. « ctr-3f9a1c0b7d2e » */
export const nouvelId = (prefixe: string) =>
  `${prefixe}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
