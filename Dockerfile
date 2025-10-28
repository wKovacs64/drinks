# base node image
FROM node:24-bullseye-slim AS base

# set for base and all layers that inherit from it
ENV NODE_ENV="production"

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /myapp

ADD package.json package-lock.json ./
RUN npm install --include=dev

# Setup production node_modules
FROM base AS production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json package-lock.json ./
RUN npm prune --omit=dev

# Build the app
FROM base AS build

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV PORT="8080"

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
COPY --from=build /myapp/package.json /myapp/package.json

# accept some build arguments
ARG COMMIT_SHA="unknown"
ARG DEPLOYMENT_ENV="unknown"

# store the build arguments in environment variables
ENV COMMIT_SHA="${COMMIT_SHA}"
ENV DEPLOYMENT_ENV="${DEPLOYMENT_ENV}"

ENTRYPOINT [ "npm", "run", "start" ]
