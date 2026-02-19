# base node image
FROM node:24-bullseye-slim AS base

# set for base and all layers that inherit from it
ENV NODE_ENV="production"

# set the working directory
WORKDIR /app

# install pnpm
RUN npm install -g pnpm@10.29.3

# Install all node_modules, including dev dependencies
FROM base AS dev-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Install production-only node_modules
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build the app
FROM base AS build

COPY --from=dev-deps /app/node_modules /app/node_modules
COPY . .
RUN pnpm run build

# Finally, build the runtime image with minimal footprint
FROM base AS runtime

ENV PORT="8080"

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/package.json /app/package.json

# run the app as the node (non-root) user
RUN chown -R node:node /app
USER node

# accept some build arguments
ARG COMMIT_SHA="unknown"
ARG DEPLOYMENT_ENV="unknown"

# store the build arguments in runtime environment variables
ENV COMMIT_SHA="${COMMIT_SHA}"
ENV DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"

ENTRYPOINT [ "pnpm", "run", "start" ]
