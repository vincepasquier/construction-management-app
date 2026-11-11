/**
 * Identifiant unique préfixé, ex. « ctr-3f9a1c0b7d2e ». `getRandomValues` plutôt que `randomUUID` :
 * ce dernier n'existe pas quand la page est servie en HTTP à un autre appareil du réseau local.
 */
export const nouvelId = (prefixe: string) => {
  const octets = crypto.getRandomValues(new Uint8Array(6));
  return `${prefixe}-${[...octets].map((o) => o.toString(16).padStart(2, "0")).join("")}`;
};
