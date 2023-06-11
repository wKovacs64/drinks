import { mergeMeta } from '~/utils/meta';
import NotFound from '~/core/not-found';

export const notFoundMeta = [
  { title: 'Not Found' },
  { name: 'description', content: "There's nothing of interest here." },
];

export const meta = mergeMeta(() => notFoundMeta);

export default NotFound;
