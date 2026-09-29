export const nouvelId = (prefixe: string) =>
  `${prefixe}-${crypto.randomUUID().slice(0, 8)}`;
