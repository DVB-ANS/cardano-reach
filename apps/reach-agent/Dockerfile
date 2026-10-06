# Image de l'agent Richard. Contexte de build : racine du repo.
#   docker build -f apps/reach-agent/Dockerfile -t reach-agent .
# Variables runtime : OPENAI_API_KEY, REACH_MODEL, ROUTE_AUTH_BASIC_USER, ROUTE_AUTH_BASIC_PASSWORD (obligatoires au démarrage),
#   EXA_API_KEY (canaux web / linkedin et lecture de pages), GH_TOKEN (gh search), REACH_CHANNELS,
#   TWITTER_AUTH_TOKEN + TWITTER_CT0 (canal twitter, compte X dédié).
# Volumes : /app/.eve/.workflow-data (sessions durables), /app/.local/cache (cache de recherche),
#   /home/node/.config/rdt-cli/credential.json (canal reddit, compte dédié) quand il est configuré.
FROM node:24-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 pipx gh ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin
RUN pipx install yt-dlp \
  && pipx install https://github.com/Panniantong/agent-reach/archive/main.zip \
  && pipx install twitter-cli==0.8.5 \
  && pipx install 'git+https://github.com/public-clis/rdt-cli.git@5e4fb3720d5c174e976cd425ccc3b879d52cac66' \
  && mkdir -p /app /packages \
  && chown node:node /app /packages

# twitter-cli 0.8.5 initialise x-client-transaction-id sur x.com sans cookies : X sert désormais une page
# déconnectée sans `ondemand.s`, l'init échoue et `search` répond 404 (public-clis/twitter-cli#78, non corrigé).
# Avec les cookies du compte, x.com sert encore l'ancienne page. Le build échoue si la ligne patchée disparaît.
RUN python3 - <<'PY'
import pathlib
path = pathlib.Path("/opt/pipx/venvs/twitter-cli/lib/python3.11/site-packages/twitter_cli/client.py")
source = path.read_text()
target = "ct_headers = _gen_ct_headers()\n"
assert source.count(target) == 1, "twitter-cli patch target not found"
cookie = '            ct_headers["Cookie"] = self._cookie_string or "auth_token=%s; ct0=%s" % (self._auth_token, self._ct0)\n'
path.write_text(source.replace(target, target + cookie))
PY

USER node

WORKDIR /app
COPY --chown=node:node tsconfig.base.json /tsconfig.base.json
COPY --chown=node:node packages/contract /packages/contract
COPY --chown=node:node apps/reach-agent/package.json apps/reach-agent/package-lock.json ./
RUN npm ci
COPY --chown=node:node apps/reach-agent/ ./
RUN npx eve build && mkdir -p .eve/.workflow-data .local/cache

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "scripts/launch.ts", "start"]
