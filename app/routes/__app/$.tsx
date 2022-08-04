import type { MetaFunction } from '@remix-run/node';
import NotFoundPage from '~/core/not-found-page';

export const meta: MetaFunction = () => ({
  title: 'Not Found',
  description: `There's nothing of interest here.`,
});

export default NotFoundPage;
