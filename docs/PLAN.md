# Plan d'implémentation — Reach (cardano-reach)

## Context

Implémenter le Coworker Sokosumi « Reach » décrit dans `BRIEF.md` (repo `DVB-ANS/cardano-reach`, branche actuelle
`feat/masumi-setup`, dossier local `/Users/armandsechon/dev/agent-reach`). Reach :
1. pose ses questions de départ en `INPUT_REQUIRED` ;
2. se fait payer 1 test USDM via Masumi sur Cardano Preprod ;
3. cherche vite sur le web, LinkedIn, GitHub, YouTube, X et Reddit ;
4. rend une shortlist sourcée et datée.

Deux développeurs travaillent en parallèle sans collision :
- **Armand** : recherche + agent ;
- **le coéquipier** : paiement + worker + infra.

Le front vitrine est fait par le premier qui a fini son lot, après le chemin payé.
Tout est en TypeScript, sans `any`, et tout le serveur tourne sur le VPS Linux d'Armand (Docker + SSH).

## Organisation : ne pas se marcher dessus

### Arborescence et propriétaires

| Chemin | Propriétaire | Contenu |
| --- | --- | --- |
| `apps/reach-agent/**` | Armand | projet eve : `agent/`, moteur `src/search/`, scripts de bench et golden |
| `apps/worker/**` | Coéquipier | worker Sokosumi + paiement Masumi, portage TS de la référence |
| `infra/**` | Armand (réaffecté, voir `docs/TASKS.md`) | `docker-compose.yml`, Dockerfiles, Caddyfile, runbook serveur |
| `packages/contract/**`, `docs/CONTRACT.md` | **partagé, gelé** | types et protocole entre worker et agent |
| `front/**` | le premier libre | vitrine |
| `docs/state/agent.md` / `docs/state/worker.md` | chacun le sien | IDs, ports, checkpoints prouvés, blocages |
| `BRIEF.md`, `CLAUDE.md`, `docs/DEVLOG.md` | partagé | modifiés seulement dans une PR dédiée « docs » |

Règles :
- **Un `package.json` et un lockfile par app** (`apps/reach-agent`, `apps/worker`, `front`), **pas de workspaces npm**.
  Personne ne touche le lockfile de l'autre. C'est la première source de conflits Git qu'on supprime.
- `packages/contract` n'a **aucune dépendance** (TS pur), importé par chemin relatif ; donc pas de résolution de modules
  croisée et pas de `package.json` dans ce dossier.
- Toute modification de `packages/contract/**` ou `docs/CONTRACT.md` passe par une PR **contenant uniquement ces fichiers**,
  relue par l'autre avant le merge.
- Git :
  - `main` est la branche par défaut ; personne ne pousse dessus directement ;
  - branches `feat/agent-<sujet>` (Armand) et `feat/worker-<sujet>` (coéquipier) ;
  - petites PR squash-mergées, rebase sur `main` avant de merger ;
  - aucune ligne `Co-Authored-By` ni mention de génération dans les commits ou les PR.
- **Sessions Claude** : au plus deux par développeur, chacune cantonnée à un sous-dossier du lot de son développeur.
  Chaque session lit `CLAUDE.md`, `BRIEF.md`, `docs/CONTRACT.md` et ce plan.
- **Sokosumi** :
  - un seul Coworker, créé sur le compte du coéquipier ;
  - **un seul exécuteur de Tasks** à la fois : le worker local du coéquipier jusqu'au déploiement, puis celui du serveur ;
  - Armand ne lance jamais de worker : il teste l'agent avec `apps/reach-agent/scripts/research.ts`, sans Sokosumi.
- **Masumi** : un seul MPS, une seule base, un seul jeu de wallets, **directement sur le VPS** dès le départ.
  En local, on y accède par tunnel SSH ; on ne migre jamais de wallets.
- **Secrets** :
  - en local, chaque dev a son `.env.local` dans son app ;
  - sur le serveur, `infra/.env` n'existe que sur le serveur, jamais dans Git ;
  - chaque app versionne un `.env.example` qui ne contient que des noms de variables.

### Ce que chacun peut faire sans l'autre

- Armand travaille sur l'agent avec `scripts/research.ts`, qui joue le rôle du worker (intake + recherche) contre un eve local.
- Le coéquipier intègre contre l'agent minimal livré à l'étape 0, qui respecte déjà le contrat (questions + brief JSON + rapport factice).
  Ensuite il tire `main` quand Armand merge, sans dépendre de l'état de la branche d'Armand.

## Contrat worker ↔ agent (`docs/CONTRACT.md` + `packages/contract/src/index.ts`)

Le worker ne parle à l'agent **que** via `eve/client` (`Client`, `sessions.create`, `send`, `respond`, `result`).
Une Task correspond à une session eve, qui sert pour l'intake puis pour la recherche.

### Messages envoyés par le worker (préfixe littéral sur la première ligne)

1. `PHASE: INTAKE` + ligne vide + texte de la Task. Les commentaires humains déjà présents sont ajoutés en dessous,
   sous la forme `Commentaire: <texte>`.
2. `PHASE: RESEARCH` + ligne vide + bloc ```` ```json ```` contenant le `Brief`.
3. `PHASE: FOLLOWUP` + ligne vide + commentaire humain reçu après la complétion.

### Résultats attendus

- **INTAKE**, deux issues :
  - `result.status === "waiting"` avec un `inputRequests[i].kind === "question"`, produit par l'outil eve `ask_question` ;
  - un message dont **le dernier bloc** ```` ```json ```` est un `Brief` valide.
- **RESEARCH** : `result.message` est le rapport Markdown. Il commence par `# ` et fait au plus 900 000 octets UTF-8.
- **FOLLOWUP** : `result.message` est une réponse Markdown courte.

### `packages/contract/src/index.ts`

TS pur, sans dépendance, avec `erasableSyntaxOnly` : pas d'`enum`, des unions de littéraux.

```ts
export const PHASES = ["INTAKE", "RESEARCH", "FOLLOWUP"] as const;
export type Phase = (typeof PHASES)[number];
export const MODES = ["sourcing", "leads"] as const;
export type Mode = (typeof MODES)[number];
export const NICHES = ["crypto-defi", "automobile", "aero-spatial", "saas-tech-b2b", "other"] as const;
export type Niche = (typeof NICHES)[number];
export interface Brief {
  mode: Mode; niche: Niche; need: string; zone: string | null; volume: string | null;
  constraints: string[]; language: "fr" | "en"; assumptions: string[];
}
export function phaseMessage(phase: Phase, body: string): string; // `PHASE: ${phase}\n\n${body}`
export function parseBrief(value: unknown): Brief;                   // lève Error("Invalid brief: <champ>")
export function extractBrief(message: string): Brief;                // dernier bloc ```json``` puis parseBrief ; lève Error("No brief block")
export const MAX_REPORT_BYTES = 900_000;
```

`parseBrief` vérifie chaque champ :
- `need` est non vide, 2000 caractères au plus ;
- `mode` et `niche` font partie des listes ;
- `zone` et `volume` sont une chaîne ou `null` ;
- les tableaux ne contiennent que des chaînes ;
- `language` vaut `"fr"` ou `"en"`.

## Approach

### Étape 0 — Socle commun (Armand, ~1 h, bloque tout le reste)

1. Depuis `feat/masumi-setup`, créer `main` et la pousser, puis `gh repo edit DVB-ANS/cardano-reach --default-branch main`.
   La suite se fait sur la branche `feat/agent-scaffold`.
2. Créer l'arborescence du tableau, `packages/contract/src/index.ts` (spec ci-dessus) et `docs/CONTRACT.md`
   (sections « Messages » et « Résultats » ci-dessus, recopiées).
3. Mettre un `tsconfig.base.json` à la racine :
   - `strict`, `noUncheckedIndexedAccess`, `module`/`moduleResolution` `nodenext`, `target` `es2024` ;
   - `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`.
   Le worker tourne en TS natif Node 24 (`node src/main.ts`, suppression des types intégrée) ; seule l'app eve passe par `eve build`.
4. Scaffold `apps/reach-agent` :
   - `npx eve@0.71.0 init reach-agent` dans `apps/` ;
   - épingler `eve 0.71.0`, `ai 7.0.127` et `zod 4.6.5` (versions vérifiées dans la démo Masumi) ;
   - `agent/agent.ts` :
     `defineAgent({ model: openai(process.env.REACH_MODEL ?? "gpt-6-luna"), reasoning: "medium", defaultTools: false, limits: { maxInputTokensPerSession: 3_000_000, maxOutputTokensPerSession: 200_000 } })`,
     avec `import { openai } from "eve/models/openai"`.
     Si cet import n'existe pas dans 0.71.0, installer `@ai-sdk/openai` et utiliser `createOpenAI({ apiKey: process.env.OPENAI_API_KEY }).responses(id)`.
   - `agent/tools/ask_question.ts` :
     `import { askQuestion } from "eve/tools/ask_question"; export default askQuestion();`
5. Écrire une première version de `agent/instructions.md`, suffisante pour le contrat :
   - en `INTAKE`, `ask_question` si `mode`, `niche` ou `need` manque, sinon un bloc JSON `Brief` ;
   - en `RESEARCH`, un rapport `# Reach — …`, encore sans outil de recherche.
6. Écrire `apps/reach-agent/scripts/research.ts`, le simulateur de worker :
   - arguments : `--text "<task>"`, `--answer "<réponse>"` (répétable), `--out <fichier>` ;
   - crée une session et envoie `PHASE: INTAKE` ;
   - à chaque `waiting`, fait `respond([{ requestId, text: <réponse suivante> }])`, ou à défaut le texte
     `Pas de réponse : continue avec des hypothèses explicites.` ;
   - fait `extractBrief`, puis envoie `PHASE: RESEARCH` ;
   - écrit le rapport et affiche les durées `intakeMs` et `researchMs`.
7. Lancement local :
   - `npm run dev` dans `apps/reach-agent` lance `eve dev --no-ui --no-default-extensions --host 127.0.0.1 --port 21949`,
     comme `start.mjs` de la référence ;
   - `EVE_URL=http://127.0.0.1:21949`.
8. Merger dans `main`. Le coéquipier peut alors intégrer.

### Lot Armand — moteur de recherche rapide et agent

**Principe de vitesse.** Le modèle ne fait pas une recherche par appel d'outil. Il planifie **un lot** de requêtes, et le
code exécute **tout en parallèle** avec un budget de temps strict. Il renvoie ce qui a fini, normalisé, dédoublonné, daté
et mis en cache. Un rapport doit tenir en **3 à 5 allers-retours modèle** :
1. un plan de requêtes ;
2. `reach_search` (≤ 25 s) ;
3. `read_pages` (≤ 20 s) ;
4. un `reach_search` ciblé, optionnel ;
5. la rédaction.

On n'utilise pas de sous-agents eve : chaque enfant ajoute ses propres allers-retours modèle. Le parallélisme est dans le code.

#### A1. Installer les canaux et capturer leurs sorties réelles (avant tout parseur)

1. En local, installer Agent-Reach :
   - `pipx install https://github.com/Panniantong/agent-reach/archive/main.zip`, puis `agent-reach install --env=auto` ;
   - ne jamais installer le paquet PyPI du même nom ;
   - `npm i -g mcporter`, puis `mcporter config add exa https://mcp.exa.ai/mcp` ;
   - `gh`, `yt-dlp` ;
   - `twitter-cli` et `rdt-cli` seulement quand les comptes dédiés existent.
2. Lancer chaque commande une fois et enregistrer la sortie brute dans `apps/reach-agent/src/search/__fixtures__/<canal>.txt` :

   | Canal | Commande |
   | --- | --- |
   | `web` | `mcporter call exa.web_search_exa query="titanium fasteners EN 9100 Europe" numResults=8` |
   | `linkedin` | même commande avec `query="<q> site:linkedin.com/company"` |
   | `github` | `gh search repos "<q>" --limit 8 --json fullName,url,description,updatedAt,stargazersCount` |
   | `youtube` | `yt-dlp "ytsearch5:<q>" -j --skip-download --no-warnings` (une ligne JSON par vidéo : `title`, `webpage_url`, `upload_date`, `channel`) |
   | `twitter` | `twitter search "<q>" -n 10` avec l'option de sortie JSON si `twitter search --help` en propose une |
   | `reddit` | `rdt search "<q>" --limit 10`, idem |
   | pages | `curl -s https://r.jina.ai/<url>` (en-têtes `Title:`, `URL Source:`, `Published Time:`, puis `Markdown Content:`) |

3. Si Exa propose `web_search_advanced_exa` avec un filtre de date (`mcporter list exa` pour voir les outils et leurs
   paramètres), capturer aussi sa sortie : c'est lui qu'on utilise quand une requête a `freshnessDays`.
4. Un canal qui ne marche pas sur la machine est **désactivé** et noté dans `docs/state/agent.md`. On ne le contourne pas pendant le hack.

#### A2. Moteur `apps/reach-agent/src/search/`

Fichiers :
- `types.ts` :
  - `Channel = "web" | "linkedin" | "github" | "youtube" | "twitter" | "reddit"` ;
  - `SearchQuery { channel: Channel; query: string; freshnessDays?: number }` ;
  - `SearchHit { channel; title; url; snippet; publishedAt: string | null; source: string }`, avec `publishedAt` en ISO 8601 ou `null` ;
  - `SearchFailure { channel; query; reason }` ;
  - `SearchBatchResult { hits; failures; elapsedMs; fromCache: number }`.
- `run-command.ts` : `runCommand(cmd, args, { timeoutMs, signal }): Promise<string>`.
  Utilise `execFile` promisifié, `maxBuffer` 8 MiB et `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])` ;
  lève `Error("<cmd> failed: <stderr tronqué à 300>")`.
- `channels/<canal>.ts` (un par canal) : `search(q: SearchQuery, signal: AbortSignal): Promise<SearchHit[]>`.
  - Chaque canal parse sa fixture A1 : JSON si la sortie est JSON, sinon les blocs `Title:` / `URL:` / `Published…:`.
  - `youtube` convertit `upload_date` (`YYYYMMDD`) en ISO.
  - `github` utilise `updatedAt` comme date.
  - `twitter` ajoute `since:YYYY-MM-DD` à la requête quand `freshnessDays` est fourni.
  - Les autres canaux filtrent après coup : on garde les hits sans date, on retire ceux plus vieux que `freshnessDays`.
  - Un parseur n'invente jamais de date : sans champ de date, `publishedAt: null`.
- `cache.ts` : cache disque `${REACH_CACHE_DIR ?? ".local/cache"}/<sha256>.json`.
  - Clé : `channel|query|freshnessDays` pour la recherche, l'URL pour les pages.
  - TTL : 6 h pour la recherche, 24 h pour les pages.
  - Écriture atomique (fichier tmp + `rename`).
  - Un fichier illisible est ignoré et réécrit, avec un `console.warn` sur stderr qui donne la clé, jamais le contenu.
- `engine.ts` : `searchBatch(queries: SearchQuery[], opts: { deadlineMs: number; signal: AbortSignal }): Promise<SearchBatchResult>`.
  - Filtre les canaux absents de `REACH_CHANNELS`.
    Valeur par défaut : `web,linkedin,github,youtube` ; `twitter` et `reddit` s'ajoutent quand les cookies sont configurés.
    Une requête vers un canal désactivé devient une `SearchFailure` avec `reason: "channel disabled"`.
  - Lance toutes les requêtes en même temps avec un plafond de concurrence **par canal** :
    web 6, linkedin 3, github 3, youtube 2, twitter 2, reddit 2.
    Le limiteur est un petit sémaphore local de moins de 20 lignes dans `limit.ts` ; aucune dépendance n'existe déjà dans le repo.
  - Timeout par requête : web/linkedin 12 s, github 10 s, youtube 20 s, twitter/reddit 15 s.
    Le budget global `deadlineMs` vaut 25 000 par défaut : à l'échéance, on renvoie les hits déjà obtenus et chaque requête
    encore en cours devient une `SearchFailure` avec `reason: "timeout"`.
  - Dédoublonne par URL normalisée : minuscules sur l'hôte, sans `www.`, sans fragment, sans paramètres `utm_*`,
    sans `/` final. On garde le hit le plus daté.
  - Coupe les snippets à 300 caractères et garde au plus 60 hits, triés en round-robin par canal pour garder de la diversité.
- `pages.ts` : `readPages(urls: string[], opts): Promise<PageResult[]>`.
  - `PageResult { url; ok; title; publishedAt; text; error? }`.
  - Concurrence 8, timeout 15 s par page, budget global 20 s.
  - Passe par Jina Reader `https://r.jina.ai/<url>`, avec `Authorization: Bearer ${JINA_API_KEY}` si la variable existe.
  - Extrait `Title:` et `Published Time:`, puis tronque `text` à 6 000 caractères.
  - Si Jina échoue, `fetch` direct (timeout 10 s, `redirect: "follow"`), suppression des balises et des scripts.
  - Refuse les schémas non http(s) et les hôtes `localhost`, `*.local`, IP privées ou loopback
    (`error: "blocked host"`), pour éviter le SSRF via le fallback.

#### A3. Outils eve (`apps/reach-agent/agent/tools/`)

Le modèle `defineTool` vient de la branche `feat/token2049-event-guide` de la démo Masumi : le nom du fichier est le nom de
l'outil, `inputSchema` est en zod.
- `reach_search.ts` :
  - entrée `{ queries: z.array(z.object({ channel: z.enum([...]), query: z.string().min(3).max(200), freshnessDays: z.number().int().min(1).max(3650).optional() })).min(1).max(12) }` ;
  - `execute` appelle `searchBatch(queries, { deadlineMs: 25_000, signal: ctx.abortSignal })` ;
  - la description dit : « Lance TOUTES tes recherches d'un coup (6 à 12 requêtes, plusieurs canaux). Les résultats sans date ne sont pas des signaux récents. »
- `read_pages.ts` : entrée `{ urls: z.array(z.string().url()).min(1).max(12) }`, appelle `readPages`.
- `web_search.ts` : `export { default } from "eve/tools/web_search";`.
  C'est la recherche native OpenAI, en secours ; les instructions la limitent à 2 appels par rapport.
- Ne pas réactiver `bash`, `agent`, `read_file`, `write_file` ni `load_skill` : ils ne servent à rien ici et rallongent les tours.

#### A4. Instructions, personnalité, niches

- `agent/instructions.md` : la version finale reprend les sections 3.3 (personnalité), 3.4 (garde-fous), 5.1, 5.3 et 6.4
  (format du rapport) de `BRIEF.md`. Elle ajoute ces règles de procédure :
  - **INTAKE**.
    - Au plus une question par tour, via `ask_question`, avec 2 ou 3 options et des libellés de 4 mots maximum.
      Premières questions : « Tu achètes ou tu vends ? » (Je cherche un fournisseur / Je cherche des clients),
      puis la niche si elle est ambiguë.
    - Au maximum deux questions au total, puis un `Brief` JSON avec des `assumptions`.
    - Aucun outil de recherche pendant l'intake.
  - **RESEARCH**.
    - Tour 1 : un seul `reach_search` de 6 à 12 requêtes réparties sur au moins 3 canaux, selon la fiche de niche.
      `freshnessDays: 365` pour les signaux « why now », sans filtre pour les fournisseurs.
    - Tour 2 : un seul `read_pages` sur les 8 à 12 URL les plus prometteuses.
    - Tour 3, optionnel : un `reach_search` ciblé, uniquement s'il y a moins de 5 candidats confirmés.
    - Puis rédaction. Jamais d'`ask_question`.
    - Chaque ligne du tableau a une URL lue ou trouvée et une date ou la mention `non daté`.
      🟢 si la date a moins de 6 mois, 🟡 entre 6 et 12 mois, 🔴 au-delà de 12 mois.
  - **FOLLOWUP** : répondre au commentaire sans régénérer le rapport. Une nouvelle recherche est permise, limitée à un `reach_search`.
- `agent/instructions/niche-<slug>.md`, une par niche (crypto-defi, automobile, aero-spatial, saas-tech-b2b), 900 mots au plus chacune.
  Elles sont toujours chargées : eve inclut `agent/instructions/` dans le prompt système, ce qui est stable et bien caché,
  et évite l'aller-retour supplémentaire qu'imposerait `load_skill`.
  Chaque fiche contient :
  - vocabulaire et segments ;
  - modèles de requêtes par canal (ex. aéro : `"<pièce> EN 9100 supplier"` sur web, `site:linkedin.com/company <pièce> aerospace` sur linkedin) ;
  - critères de score ;
  - signaux « why now » ;
  - certifications ;
  - red flags.

#### A5. Bench et jeu de référence

- `scripts/bench-search.ts "<requête>"` exécute `searchBatch` sur tous les canaux actifs et affiche pour chacun la durée,
  le nombre de hits, la part de hits datés et les erreurs.
- `tests/golden/cases.json` : les 9 cas de la section 4 de `BRIEF.md`, au format
  `{ id, text, answers: string[], expect: { mode, niche, minRows: 5 } }`.
  Pour les cas 8 et 9, `minRows: 0` et `expect.mustAsk: true` pour le cas 8.
- `scripts/golden.ts` joue chaque cas via la logique de `research.ts` et écrit `tests/golden/out/<id>.md` et `tests/golden/out/timings.json`.
  Il échoue (exit 1) si :
  - le `Brief` ne correspond pas à `expect` ;
  - le rapport ne commence pas par `# ` ;
  - une ligne de tableau n'a pas de lien `http` ;
  - le cas 8 n'a posé aucune question.
  `tests/golden/out/` est ignoré par Git.

#### A6. Image Docker de l'agent (`apps/reach-agent/Dockerfile`, écrit par Armand, branché par le coéquipier dans `infra/`)

- Image `node:24-bookworm`.
- Paquets : `python3`, `pipx`, `gh`, `yt-dlp` (via pipx), Agent-Reach, `mcporter` (npm global, `mcporter config add exa …` au build).
- Copie de `packages/contract` en `/packages/contract` pour garder l'import relatif.
- `npm ci`, puis `npx eve build`, puis `CMD ["npx","eve","start","--host","0.0.0.0","--port","3000"]`.
- Ajouter `agent/channels/eve.ts` :
  `eveChannel({ auth: [httpBasic({ username: process.env.ROUTE_AUTH_BASIC_USER!, password: process.env.ROUTE_AUTH_BASIC_PASSWORD! }), localDev()] })`.
  Sans ce fichier, `eve start` rejette tout le trafic.
  Ces deux variables sont obligatoires : l'app vérifie leur présence au démarrage et lève `Error("Missing ROUTE_AUTH_BASIC_USER/PASSWORD")`.
- Volumes : `/app/.eve/.workflow-data`, `/app/.local/cache`, plus `~/.config/rdt-cli` et le fichier d'environnement
  Twitter quand ils sont configurés.

### Lot coéquipier — paiement, worker, infra

#### B1. Compte et serveur (en parallèle de l'étape 0)

- Étapes 1 et 2 de `docs/masumi/agent-guide.md` : compte Preprod, organisation démo, Vendor, Coworker
  (`--capability tasks --personal`), clé runtime dans `apps/worker/.env.local` (`SOKOSUMI_COWORKER_API_KEY`) et dans le coffre du CLI.
- Sur le VPS, `infra/docker-compose.yml`, premier jet avec deux services :
  - `postgres:16` (volume `pgdata`, base `mps_hackathon`) ;
  - `mps`, construit depuis un clone de `masumi-payment-service` selon son `docs/deployment.md`, port 3012 exposé
    **uniquement sur 127.0.0.1**.
- Migrations, puis seed **avec sortie supprimée** (`>/dev/null 2>&1`, contrôle du code de sortie), puis le selling wallet
  est financé via dispenser.masumi.network.
- Depuis le poste local : tunnel `ssh -N -L 3012:127.0.0.1:3012 <vps>`, et `MPS_URL=http://127.0.0.1:3012`.

#### B2. Portage TypeScript du worker de référence (`apps/worker/src/`)

Source : `~/dev/demo-agent-token2049/live-team-names-20261006/`, à cloner depuis
`github.com/masumi-network/demo-agent-token2049` (branche `live-demo-name-finder`) s'il est absent.
On porte 1:1 en TS strict, sans changer le comportement à cette étape :

| Fichier cible | Origine |
| --- | --- |
| `sokosumi.ts` | `sokosumi-runtime.mjs` + la fonction `cli()` de `worker.mjs` |
| `lock.ts` | `worker-lock.mjs` |
| `store.ts` | `atomicWrite` / `createStore` de `scripts/worker-state.mjs` (branche `feat/token2049-event-guide`) : tmp + rename + fsync |
| `payment.ts` | `paid-task.mjs` |
| `settlement.ts` | `settlement.mjs` |
| `registration.ts` | `payment-registration.mjs` + `registration-config.mjs` |
| `agent-api.ts` | `agent-api.mjs` |
| `eve.ts` | `client.mjs` |
| `main.ts` | `worker.mjs` |

Adaptations obligatoires pendant le portage :
- **Portée du workspace** :
  - variable `SOKOSUMI_SCOPE` = `personal` (défaut) ou `org` ;
  - si `org`, `SOKOSUMI_ORG_ID` et `SOKOSUMI_ORG_SLUG` sont requis ;
  - les commandes `runtime` utilisent `--personal` ou `--organization-id <id>` ;
  - les commandes `tasks` utilisent `--personal` ou `--organization-slug <slug>` ;
  - il n'y a plus de `--personal` en dur.
- **Clé runtime** :
  - lue depuis `SOKOSUMI_COWORKER_API_KEY` ;
  - passée au CLI par `--api-key-stdin` (sur le serveur, pas de coffre OS) ;
  - passée à `createCoworkerHttpClient({ apiKey })`.
- **Délais de paiement** : `submitResultTime` à +30 min (au lieu de +20), `unlockTime` à +46 min,
  `externalDisputeUnlockTime` à +62 min, `payByTime` à +5 min.
  Les écarts de 15 minutes minimum imposés par MPS sont respectés.
- `inputHash` reste `taskHash(task.description)`, comme dans la référence : ce chemin a été vérifié bout à bout.
- **Étapes `*-pending` au redémarrage** :
  - `model-pending` est relancé, car il n'y a pas d'effet externe ;
  - les autres passent en `inspection-required`, avec le log `Task <id> requires inspection at <stage>`, et le worker les ignore ensuite.
  La procédure de résolution manuelle va dans `infra/RUNBOOK.md`.

#### B3. Intake `INPUT_REQUIRED` avant paiement

Nouvelle machine de phases dans `main.ts`, journal `.local/tasks/<taskId>.json` :

```
(aucune) → starting → started → intake-sent
intake-sent  → (eve waiting + question) → question-post-pending → awaiting-human
intake-sent  → (brief JSON valide)      → brief-ready
awaiting-human → (commentaire humain)   → answer-sent → (même aiguillage qu'intake-sent)
brief-ready  → [PAID_TASKS_ENABLED=true] paiement de la référence, inchangé jusqu'à awaiting-escrow
             → au FundsLocked : research-sent (au lieu de l'appel unique de la référence) → result-saved → …
brief-ready  → [PAID_TASKS_ENABLED=false] research-sent → result-saved → complete-pending → completed
```

- **Envoi** : `phaseMessage("INTAKE", task.description)`.
  On sauvegarde `{ sessionId, streamIndex }` après chaque échange, pour pouvoir reprendre avec `client.sessions.attach(sessionId, { streamIndex })`.
- **Question** :
  - prendre `r.inputRequests.find(x => x.kind === "question")` ;
  - poster `createTaskEvent(core, taskId, { status: "INPUT_REQUIRED", comment })` ;
  - `comment` est construit par `formatQuestion(prompt, options)`, au format exact :
    `**🎯 Reach** — <prompt>\n\n1️⃣ **<label>** — <description>\n2️⃣ …\n\n_Réponds juste \`1\`, \`2\` ou en texte libre._`
  - on sauvegarde `requestId`, `options` et l'`eventId` posté ;
  - si on redémarre en `question-post-pending`, on lit les événements de la Task : un événement du Coworker avec le même
    commentaire fait passer en `awaiting-human` sans reposter.
- **Réponse** :
  - premier événement avec `actor.type === "user"` et un commentaire non vide, **postérieur** à l'`eventId` sauvegardé ;
  - si la réponse est `^\s*[1-3]\s*$` et correspond à une option : `respond([{ requestId, optionId: options[n-1].id }])` ;
  - sinon : `respond([{ requestId, text: <commentaire tronqué à 2000> }])` ;
  - ensuite, `createTaskEvent(core, taskId, { status: "RUNNING" })`.
- **Pas de réponse humaine** : au-delà de `INTAKE_TIMEOUT_MS` (défaut 1 800 000) après la question,
  `respond([{ requestId, text: "Pas de réponse : continue avec des hypothèses explicites." }])`.
- **Brief** :
  - `extractBrief(r.message)` ;
  - en cas d'échec, une seule relance : `session.send("Réponds uniquement avec le bloc JSON Brief.")` ;
  - deuxième échec : `createTaskEvent(..., { status: "FAILED", comment: "Reach n'a pas pu cadrer la demande : reformule ton besoin." })`
    et phase `failed`. Lire le statut d'échec exact dans l'enum `TaskStatus` de Sokosumi
    (`packages/database/prisma/schema.prisma`, non vérifié, à confirmer d'abord) ; s'il n'existe pas de `FAILED`,
    utiliser le statut d'échec présent dans l'enum.
- **Recherche** : `phaseMessage("RESEARCH", "```json\n" + JSON.stringify(brief, null, 2) + "\n```")`.
  - En mode payé, elle n'est envoyée qu'après `FundsLocked`, et seulement s'il reste plus de 8 min avant `submitResultTime`.
    Sinon on n'envoie rien et le paiement suit le chemin d'échéance de la référence.
  - Si la recherche renvoie une question malgré les instructions, réponse automatique `text: "Pas de réponse : continue avec des hypothèses explicites."`.
  - Une `kind: "session-limit"` est répondue avec l'option dont le `label` correspond à `/stop/i`, puis phase `failed`.
  - Un rapport de plus de `MAX_REPORT_BYTES` est tronqué à la dernière ligne complète, suivi d'une ligne `_Rapport tronqué._`.
- **FOLLOWUP** : on garde `comments.mjs` de la référence (réponse aux commentaires après complétion), avec un message
  `phaseMessage("FOLLOWUP", comment)` et la reprise de session par `streamIndex`, comme dans `scripts/task-comments.mjs` de la branche.
- **Masumi Standard API** : on porte `agent-api.ts` sans intake. MIP-003 envoie directement `input_data.prompt`, sur lequel
  on enchaîne INTAKE puis RESEARCH, avec la réponse automatique « hypothèses » à toute question.

#### B4. Enregistrement Masumi (une seule fois, avec l'URL définitive)

- Caddy dans `infra/` (`Caddyfile`), TLS automatique, sur le domaine `REACH_DOMAIN` pointant vers le VPS.
  Il ne publie que `https://REACH_DOMAIN/agent-api/` vers `agent-api:21950`, en supprimant le préfixe.
  eve et MPS ne sont jamais publics.
- Enregistrement avec la commande `register` de `registration.ts` :
  - `apiBaseUrl: https://REACH_DOMAIN/agent-api` ;
  - `name: "Reach"`, `Tags: ["sourcing","leads","b2b","research"]`, `pricing { pricingType: "Dynamic" }` ;
  - `Capability { name: REACH_MODEL, version: "1" }`, `Author { name: "Cardano Reach" }`.
- Attendre `RegistrationConfirmed`, puis créer la clé MPS limitée au selling wallet (commande `key`).

#### B5. Déploiement complet

- `infra/docker-compose.yml`, services finaux :
  - `postgres` ;
  - `mps` ;
  - `reach-agent` (Dockerfile A6, réseau interne uniquement, `EVE_URL=http://reach-agent:3000` côté worker,
    authentification basic avec `ROUTE_AUTH_BASIC_USER` / `ROUTE_AUTH_BASIC_PASSWORD`) ;
  - `worker` (`node:24-bookworm`, CLI `@masumi_network/sokosumi@1.0.4` global, `node src/main.ts`, volume `/app/.local`) ;
  - `agent-api` (même image que le worker, `node src/agent-api.ts`) ;
  - `caddy`.
- `restart: unless-stopped` partout, aucun service serverless.
- Le worker local est **coupé** avant le démarrage du worker serveur. Un seul exécuteur est garanti par le verrou du journal.
- `infra/RUNBOOK.md` :
  - démarrage et arrêt ;
  - logs ;
  - inspection d'une Task `inspection-required` ;
  - rotation des cookies Twitter et Reddit ;
  - sauvegarde `pg_dump` avant toute opération sur la base MPS.
- Puis l'étape 5 du guide : connexion au Workspace TOKEN2049 (`--workspace-id 01a109d1-32a9-71a3-a0e3-658b2a7987cd`) et
  passage en `SOKOSUMI_SCOPE=org`, avec `SOKOSUMI_ORG_ID` = cet ID et `SOKOSUMI_ORG_SLUG=token2049-origins-hackathon-2026-nws2r7`
  (valeurs tirées de `docs/masumi/agent-guide.md`).

### Jalons communs (dans l'ordre)

| Jalon | Contenu | Qui | Condition de passage |
| --- | --- | --- | --- |
| M0 | Étape 0 mergée | Armand | `scripts/research.ts --text "Je cherche un usineur titane"` pose une question puis rend un rapport factice |
| M1 | Task gratuite via le worker, avec question | Coéquipier | voir Verification §2 |
| M2 | Task payée, collecte confirmée | Coéquipier | voir Verification §3 — **éliminatoire, prioritaire sur tout le reste** |
| M3 | Moteur + outils + 4 fiches | Armand | voir Verification §1, cas 1 à 7 relus |
| M4 | Déploiement serveur, ordinateurs éteints | Coéquipier | voir Verification §4 |
| M5 | Twitter / Reddit activés, golden complet vert, rapport poli | Armand | `npm run golden` exit 0 |
| M6 | Front, vidéo, slides | premier libre | — |

Armand et le coéquipier avancent en parallèle de M0 à M3. M4 attend M2 et M3.

## Critical files & anchors

- `~/dev/demo-agent-token2049/live-team-names-20261006/paid-task.mjs` : machine `stage` du paiement et appel modèle
  dans `awaiting-escrow`. C'est l'endroit où brancher `research-sent` en mode payé.
- `~/dev/demo-agent-token2049/live-team-names-20261006/worker.mjs` : boucle de polling, `--personal` en dur aux lignes 22 et 32.
- `~/.nvm/versions/node/v24.21.0/lib/node_modules/@masumi_network/sokosumi/dist/src/api/services/task-service.js` :
  `createTaskEvent(client, taskId, payload)`, qui envoie le payload tel quel sur `POST /v1/tasks/:id/events` (champs `status`, `comment`).
- `docs/masumi/agent-guide.md` : commandes officielles (Vendor, Coworker, clé runtime, MPS, Workspace TOKEN2049).
- `BRIEF.md` : sections 3.3, 3.4, 5 et 6.4, qui sont le contenu source de `agent/instructions.md`.

## Verification

Prérequis : Node 24 (`export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`), `OPENAI_API_KEY` dans
`apps/reach-agent/.env.local`, eve lancé avec `npm run dev` dans `apps/reach-agent`, `EVE_URL=http://127.0.0.1:21949`.

1. **Recherche (Armand, M3)** :
   - `cd apps/reach-agent && node --env-file-if-exists=.env.local scripts/bench-search.ts "titanium fasteners EN 9100 Europe"`
     (TS natif Node 24 : toutes les commandes `node scripts/*.ts` de ce plan tournent ainsi, sans `tsx`) :
     chaque canal actif répond en moins de 25 s au total, `web` rend au moins 5 hits, et une partie des hits est datée ;
   - `node scripts/research.ts --text "Je cherche un fournisseur de fixations titane certifié EN 9100, petites séries, Europe." --out /tmp/c1.md` :
     aucune question, `researchMs` sous 300 000 avec `REACH_MODEL=gpt-6.1-sol`, au moins 5 lignes et un lien par ligne,
     chaque lien ouvert à la main confirme sa ligne ;
   - `--text "Trouve-moi des partenaires." --answer "1" --answer "aéronautique, Europe"` : deux questions au plus,
     un `Brief` avec `mode: "sourcing"` et `niche: "aero-spatial"` ;
   - `npm run golden` exit 0.
2. **Intake via Sokosumi (coéquipier, M1)** :
   - `PAID_TASKS_ENABLED=false node src/main.ts` dans `apps/worker` ;
   - `sokosumi --preprod tasks create --personal --coworker-id $COWORKER_ID --name "Reach test" --description "Trouve-moi des partenaires." --status READY --json` ;
   - attendu : la Task passe en `INPUT_REQUIRED` avec le commentaire 1️⃣ / 2️⃣
     (`sokosumi --preprod tasks events <TASK_ID> --json`) ;
   - `sokosumi --preprod tasks comment <TASK_ID> --comment "1" --json` : la Task repasse en `RUNNING`, puis une deuxième
     question ou `COMPLETED` avec un rapport qui commence par `# Reach` ;
   - tuer le worker pendant `awaiting-human`, le relancer : pas de question en double.
3. **Paiement (coéquipier, M2)** :
   - `PAID_TASKS_ENABLED=true`, Task avec une description complète (cas 1) ;
   - `sokosumi --preprod runtime receipt <TASK_ID> --coworker-id $COWORKER_ID --json` finit par donner `settled: true`
     et un `txHash` ;
   - `settlement.ts` affiche `verified: true` et `netAtomicUnits` égal à 1000000 moins les frais ;
   - le hash est ouvert sur l'explorateur Preprod ;
   - redémarrer le worker après `awaiting-withdrawal` : aucun second paiement, aucune seconde collecte.
4. **Déploiement (coéquipier, M4)** :
   - ordinateurs fermés, Task créée depuis l'interface preprod.sokosumi.com d'un autre appareil ;
   - question, réponse, rapport, puis collecte confirmée ;
   - `docker compose restart worker` en pleine recherche : reprise sans doublon (`model-pending` relancé).

## Assumptions & contingencies

- **Exa via mcporter** (gratuit, sans clé) est la source web principale.
  Si le bench montre des erreurs de quota ou une latence supérieure à 12 s, le canal `web` passe sur la recherche native
  OpenAI : le canal appelle l'API Responses avec l'outil `web_search`, environ 0,01 $ par appel. `reach_search` ne change pas.
- **Twitter et Reddit** utilisent des comptes dédiés au projet, avec un proxy résidentiel si l'IP du VPS est bloquée.
  Ils ne sont activés dans `REACH_CHANNELS` qu'après un bench réussi sur le VPS. Si ça ne marche pas avant M5, ils restent
  désactivés et le pitch cite web, LinkedIn public, GitHub et YouTube.
- **LinkedIn** passe par les pages publiques (Exa `site:linkedin.com/company` + Jina), sans login.
- **Domaine** : `REACH_DOMAIN` est un sous-domaine d'Armand pointant vers le VPS.
  Sans domaine, `apiBaseUrl` vaut `http://<IP du VPS>:21950`, exposé directement, et Caddy est retiré.
- **Modèle** : `gpt-6-luna` pendant le développement, `gpt-6.1-sol` pour les golden finaux et la démo.
  Si un rapport dépasse 300 s avec sol, on passe à `reasoning: "low"` avant de toucher au reste.
- **Rejet de l'INPUT_REQUIRED** : si Core refuse `status: "INPUT_REQUIRED"` posté par le Coworker, on poste la question
  en commentaire seul (sans changer le statut) et on garde la même détection de réponse.
- **Front** : fait (PR #7) — Nuxt 4 + Tailwind 4 statique dans `front/`, DA tirée des illustrations fournies.
  Reste : déploiement statique et lien vers le Coworker.
