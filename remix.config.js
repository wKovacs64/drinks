/**
 * @type {import('@remix-pwa/dev').WorkerConfig}
 */
export default {
  //
  // Remix Settings
  //
  ignoredRouteFiles: ['**/.*'],
  serverModuleFormat: 'esm',
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // publicPath: "/build/",
  // serverBuildPath: "build/index.js",
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
