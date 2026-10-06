# Image de l'agent Reach. Contexte de build : racine du repo.
#   docker build -f apps/reach-agent/Dockerfile -t reach-agent .
# Variables runtime : OPENAI_API_KEY, REACH_MODEL, ROUTE_AUTH_BASIC_USER, ROUTE_AUTH_BASIC_PASSWORD (obligatoires au démarrage),
#   GH_TOKEN (gh search), REACH_CHANNELS, JINA_API_KEY (optionnel).
# Volumes : /app/.eve/.workflow-data (sessions durables), /app/.local/cache (cache de recherche),
#   puis ~/.config/rdt-cli et le fichier d'environnement Twitter quand ces canaux sont configurés.
FROM node:24-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 pipx gh ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin
RUN pipx install yt-dlp \
  && pipx install https://github.com/Panniantong/agent-reach/archive/main.zip \
  && npm install -g mcporter@0.14.2

USER node
RUN mcporter config add exa https://mcp.exa.ai/mcp --scope home

WORKDIR /app
COPY --chown=node:node packages/contract /packages/contract
COPY --chown=node:node apps/reach-agent/package.json apps/reach-agent/package-lock.json ./
RUN npm ci
COPY --chown=node:node apps/reach-agent/ ./
RUN npx eve build && mkdir -p .eve/.workflow-data .local/cache

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "scripts/launch.ts", "start"]
