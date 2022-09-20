import type { MetaFunction } from '@remix-run/node';
import NotFound from '~/core/not-found';

export const meta: MetaFunction = () => {
  return {
    title: 'Not Found',
    description: `There's nothing of interest here.`,
  };
};

export default NotFound;
