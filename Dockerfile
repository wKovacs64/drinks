FROM node:26-bookworm-slim AS base

ENV NODE_ENV="production"

WORKDIR /app

FROM base AS build-tools
RUN npm install -g pnpm@12.21.0

FROM build-tools AS dev-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM build-tools AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM dev-deps AS build

COPY . .
RUN pnpm run build

FROM base AS runtime

ENV PORT="8080"

# Preserve a writable working directory for local SQLite and asset output.
RUN chown node:node /app

COPY --from=prod-deps --chown=node:node /app/node_modules /app/node_modules
COPY --from=build --chown=node:node /app/app /app/app
COPY --from=build --chown=node:node /app/scripts /app/scripts
COPY --from=build --chown=node:node /app/server.ts /app/server.ts
COPY --from=build --chown=node:node /app/tsconfig.json /app/tsconfig.json
COPY --from=build --chown=node:node /app/public /app/public
COPY --from=build --chown=node:node /app/package.json /app/package.json
COPY --from=build --chown=node:node /app/remix.json /app/remix.json

USER node

ARG COMMIT_SHA="unknown"
ARG DEPLOYMENT_ENV="unknown"

ENV COMMIT_SHA="${COMMIT_SHA}"
ENV DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"

CMD [ "node", "--import", "remix/node-tsx", "server.ts" ]
