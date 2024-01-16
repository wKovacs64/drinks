import { json } from '@remix-run/node';
import icon192Url from '~/images/icon-192x192.png';
import icon512Url from '~/images/icon-512x512.png';
import iconMaskable192Url from '~/images/icon-maskable-192x192.png';
import iconMaskable512Url from '~/images/icon-maskable-512x512.png';

export async function loader() {
  return json(
    {
      name: 'drinks.fyi',
      short_name: 'Drinks',
      lang: 'en-US',
      start_url: '/',
      display: 'minimal-ui',
      background_color: '#137752',
      theme_color: '#137752',
      icons: [
        {
          src: icon192Url,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: icon512Url,
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: iconMaskable192Url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: iconMaskable512Url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Content-Type': 'application/manifest+json',
      },
    },
  );
}
