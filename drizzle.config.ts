// This config file is only used for drizzle-kit commands, AFAIK.
import 'dotenv/config';
import { resolve } from 'pathe';
import type { Config } from 'drizzle-kit';
import { getEnvVars } from '~/utils/env.server';

const { DATABASE_FILE_PATH } = getEnvVars();

export default {
  dialect: 'sqlite',
  out: './app/db.server',
  schema: [resolve('./app/db.server/schema.ts')],
  dbCredentials: { url: DATABASE_FILE_PATH },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
} satisfies Config;
