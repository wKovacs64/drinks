/**
 * @type {import('@remix-run/dev').AppConfig}
 */
const remixConfig = {
  ignoredRouteFiles: ['**/.*'],
  postcss: true,
  serverDependenciesToBundle: ['marked', 'p-throttle'],
  serverModuleFormat: 'esm',
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  future: {
    unstable_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};

export default remixConfig;
