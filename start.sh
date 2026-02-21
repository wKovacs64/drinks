#!/bin/sh
set -e

pnpm db:migrate
pnpm start
