# base node image
FROM node:20-bullseye-slim AS base

# Install fuse3 and ca-certificates for litefs
RUN apt-get update && apt-get install -y fuse3 ca-certificates

ENV NODE_ENV="production"

# Install all node_modules, including dev dependencies
FROM base AS deps

RUN mkdir /app
WORKDIR /app

ADD package.json package-lock.json ./
RUN npm install --include=dev

# Setup production node_modules
FROM base AS production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json package-lock.json ./
RUN npm prune --omit=dev

# Build the app
FROM base AS build

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV="production"

WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build/server /app/build/server
COPY --from=build /app/build/client /app/build/client

# prepare litefs
ENV LITEFS_DIR="/litefs"
ENV DATABASE_FILE_PATH="$LITEFS_DIR/cache.db"
ENV INTERNAL_PORT="8080"
ENV PORT="8081"
COPY --from=flyio/litefs:0.5 /usr/local/bin/litefs /usr/local/bin/litefs
ADD litefs.yml /etc/litefs.yml
RUN mkdir -p /data ${LITEFS_DIR}

ADD . .

ENTRYPOINT [ "litefs", "mount" ]
