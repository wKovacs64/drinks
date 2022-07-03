#!/bin/sh

# This file is how Fly (Docker, actually) starts the server (configured at the
# end of the Dockerfile). Before starting the server though, we need to run any
# Prisma migrations that haven't yet been run, which is why this file exists in
# the first place.
# Learn more: https://community.fly.io/t/sqlite-not-getting-setup-properly/4386

set -ex
npx prisma migrate deploy
npm run start
