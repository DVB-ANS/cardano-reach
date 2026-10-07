// Gravatar : une image existe pour le SHA-256 d'une adresse ⇒ l'adresse existe (quelqu'un l'a enregistrée).
// Signal positif seulement : un 404 ne prouve rien (la plupart des adresses pro n'ont pas de Gravatar). Aucun SMTP.
import { createHash } from "node:crypto";

export function gravatarUrl(address: string): string {
  return `https://gravatar.com/avatar/${createHash("sha256").update(address.trim().toLowerCase()).digest("hex")}?d=404&s=1`;
}

export async function gravatarExists(address: string, signal: AbortSignal): Promise<boolean> {
  const response = await fetch(gravatarUrl(address), { method: "HEAD", signal, redirect: "follow" });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Gravatar HTTP ${response.status}`);
  return true;
}
