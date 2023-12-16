/**
 * @type {import('@remix-pwa/dev').WorkerConfig}
 */
module.exports = {
  //
  // Remix Settings
  //
  ignoredRouteFiles: ['**/.*'],
  serverDependenciesToBundle: [
    // Styling docs indicate this is needed, but I don't notice any difference?
    '@fontsource/source-sans-3',
    '@remix-pwa/cache',
    '@remix-pwa/strategy',
    '@remix-pwa/sw',
    'marked',
    'p-throttle',
  ],
  serverModuleFormat: 'cjs',
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
  },
  //
  // Remix PWA Settings
  //
  workerName: 'sw',
  workerMinify: true,
};
