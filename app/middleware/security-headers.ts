import type { MiddlewareFunction } from 'react-router';

export const securityHeaders: MiddlewareFunction<Response> = async (_, next) => {
  const response = await next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Permissions-Policy',
    ['geolocation=()', 'camera=()', 'microphone=()', 'payment=()', 'usb=()'].join(', '),
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      `base-uri 'none'`,
      `frame-ancestors 'none'`,
      `form-action 'self'`,
      `default-src 'self'`,
      `connect-src 'self' https://images.ctfassets.net/`,
      `img-src 'self' data: https:`,
      `script-src 'self' 'unsafe-inline'`,
      `style-src 'self' 'unsafe-inline'`,
    ].join('; '),
  );

  return response;
};
