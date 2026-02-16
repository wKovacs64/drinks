import type { BreadcrumbHandle } from '#/app/navigation/breadcrumbs';

export type EnhancedDrink = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
  notes: string | null;
  tags: string[];
};

// While this only includes BreadcrumbHandle at the moment, they are
// semantically different and it may end up an intersection of multiple types in
// the future.
export type AppRouteHandle = BreadcrumbHandle;
