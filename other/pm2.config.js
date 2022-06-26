const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  // ENABLE_TEST_ROUTES: process.env.ENABLE_TEST_ROUTES ?? true,
  // RUNNING_E2E: process.env.RUNNING_E2E,
  FORCE_COLOR: '1',
};

module.exports = {
  apps: [
    {
      name: 'Tailwind',
      script: './other/pm2-tailwind.js',
      autorestart: false,
      watch: ['./tailwind.config.js'],
      env,
    },
    {
      name: 'Remix',
      script: './other/pm2-remix.js',
      ignore_watch: ['.'],
      env,
    },
    {
      name: 'Server',
      script: './other/pm2-server.js',
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
