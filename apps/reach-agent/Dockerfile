# Image de l'agent Reach. Contexte de build : racine du repo.
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
  && pipx install twitter-cli \
  && pipx install 'git+https://github.com/public-clis/rdt-cli.git@5e4fb3720d5c174e976cd425ccc3b879d52cac66' \
  && mkdir -p /app /packages \
  && chown node:node /app /packages

USER node

WORKDIR /app
COPY --chown=node:node packages/contract /packages/contract
COPY --chown=node:node apps/reach-agent/package.json apps/reach-agent/package-lock.json ./
RUN npm ci
COPY --chown=node:node apps/reach-agent/ ./
RUN npx eve build && mkdir -p .eve/.workflow-data .local/cache

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "scripts/launch.ts", "start"]
