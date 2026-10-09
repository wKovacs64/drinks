# base node image
FROM node:24-bookworm-slim AS base

# set for base and all layers that inherit from it
ENV NODE_ENV="production"

# set the working directory
WORKDIR /app

# Keep package-manager tooling out of the runtime image.
FROM base AS build-tools
RUN npm install -g pnpm@12.10.0

# Install all node_modules, including dev dependencies
FROM build-tools AS dev-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Install production-only node_modules
FROM build-tools AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build the app
FROM dev-deps AS build

COPY . .
RUN pnpm run build

# Finally, build the runtime image with minimal footprint
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

# run the app as the node (non-root) user
USER node

# accept some build arguments
ARG COMMIT_SHA="unknown"
ARG DEPLOYMENT_ENV="unknown"

# store the build arguments in runtime environment variables
ENV COMMIT_SHA="${COMMIT_SHA}"
ENV DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"

CMD [ "node", "--import", "remix/node-tsx", "server.ts" ]
