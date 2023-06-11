import { mergeMeta } from '~/utils/meta.ts';
import NotFound from '~/core/not-found.tsx';

export const notFoundMeta = [
  { title: 'Not Found' },
  { name: 'description', content: "There's nothing of interest here." },
];

export const meta = mergeMeta(() => notFoundMeta);

export default NotFound;
