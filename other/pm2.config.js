const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  // ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES ?? true,
  // RUNNING_E2E: process.env.RUNNING_E2E,
  FORCE_COLOR: '1',
};

module.exports = {
  apps: [
    {
      name: 'Remix',
      script: './other/pm2-remix.js',
      ignore_watch: ['.'],
      env,
    },
    {
      name: 'Server',
      script: './other/pm2-server.js',
      // TODO: why doesn't this restart if .env is changed? 🤔
      watch: ['./mocks/**/*.ts', './server/**/*.ts', './.env'],
      env,
    },
    {
      name: 'Worker',
      script: './other/pm2-worker.js',
      watch: ['./app/entry.worker.ts'],
      env,
    },
  ],
};
