// GET direct protégé contre le SSRF : chaque saut est résolu et validé une fois, puis la connexion est épinglée
// sur l'adresse validée (aucune seconde résolution DNS, donc pas de DNS rebinding). Redirections suivies à la main.
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { resolvePublicTarget } from "./url.ts";

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const USER_AGENT = "ReachBot/1.0 (+B2B research agent)";

export interface DirectResponse {
  contentType: string;
  body: string;
}

interface RawResponse extends DirectResponse {
  status: number;
  location: string | null;
}

function pinnedLookup(address: string, family: 4 | 6): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
}

async function getOnce(raw: string, signal: AbortSignal): Promise<RawResponse> {
  const { url, address, family } = await resolvePublicTarget(raw);
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  const { promise, resolve, reject } = Promise.withResolvers<RawResponse>();
  const outgoing = send(
    url,
    { method: "GET", lookup: pinnedLookup(address, family), signal, headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain;q=0.9,*/*;q=0.5" } },
    (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) response.destroy(new Error("response too large"));
        else chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () =>
        resolve({
          status: response.statusCode ?? 0,
          location: response.headers.location ?? null,
          contentType: response.headers["content-type"] ?? "",
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    },
  );
  outgoing.on("error", reject);
  outgoing.end();
  return promise;
}

export async function fetchPublic(url: string, signal: AbortSignal): Promise<DirectResponse> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await getOnce(current, signal);
    if (response.status >= 300 && response.status < 400 && response.location) {
      current = new URL(response.location, current).toString();
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
    return { contentType: response.contentType, body: response.body };
  }
  throw new Error("too many redirects");
}
