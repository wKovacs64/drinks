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
      script: './other/tailwind.js',
      autorestart: false,
      watch: ['./tailwind.config.js', './app/styles/app.css'],
      env,
    },
    {
      name: 'Remix',
      script: './other/remix.js',
      ignore_watch: ['.'],
      env,
    },
    {
      name: 'Server',
      script: './other/server.js',
      watch: ['./mocks/**/*.ts', './server.ts', './.env'],
      env,
    },
  ],
};
