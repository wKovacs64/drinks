import { redirect, href } from 'react-router';

export function loader() {
  throw redirect(href('/admin/drinks'));
}
