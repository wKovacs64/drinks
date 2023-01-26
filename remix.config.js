/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  // I don't know why this is needed, but live reloads didn't work without it.
  devServerPort: 8002,
  ignoredRouteFiles: ['**/.*'],
  serverDependenciesToBundle: ['marked', 'p-throttle'],
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  future: {
    unstable_cssSideEffectImports: true,
  },
};
