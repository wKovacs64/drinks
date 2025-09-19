import { createHonoServer } from 'react-router-hono-server/node';

// This custom Hono server exists to remove compression as the origin server should not have
// compression enabled when served behind a CDN that does its own compression (and in our case, so
// does Fly's proxy). The default HTTP server provided by react-router-serve has compression enabled
// and there's no way to disable it, so we use a custom server here instead.

export default await createHonoServer({
  // We're doing our own logging via React Router middleware
  defaultLogger: false,
});
