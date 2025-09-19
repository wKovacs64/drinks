import type { Config } from '@react-router/dev/config';

export default {
  future: {
    unstable_optimizeDeps: true,
    v8_middleware: true,
  },
  ssr: true,
} satisfies Config;
