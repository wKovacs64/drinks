# base node image
FROM node:24-bullseye-slim AS base

# set for base and all layers that inherit from it
ENV NODE_ENV="production"

# install pnpm
RUN npm install -g pnpm

# set the working directory
WORKDIR /myapp

# Install all node_modules, including dev dependencies
FROM base AS dev-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Install production-only node_modules
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-optional

# Build the app
FROM base AS build

COPY --from=dev-deps /myapp/node_modules /myapp/node_modules
COPY . .
RUN pnpm run build

# Finally, build the runtime image with minimal footprint
FROM base AS runtime

ENV PORT="8080"

COPY --from=prod-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
COPY --from=build /myapp/package.json /myapp/package.json

# run the app as the node (non-root) user
RUN chown -R node:node /myapp
USER node

# accept some build arguments
ARG COMMIT_SHA="unknown"
ARG DEPLOYMENT_ENV="unknown"

# store the build arguments in environment variables
ENV COMMIT_SHA="${COMMIT_SHA}"
ENV DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"

ENTRYPOINT [ "pnpm", "run", "start" ]
