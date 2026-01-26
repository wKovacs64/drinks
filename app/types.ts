import type { BreadcrumbHandle } from '#/app/navigation/breadcrumbs';

// Drink type used for display (with nullable fields for transformation from DB)
export type Drink = {
  title: string | null;
  slug: string;
  image: {
    url: string;
  } | null;
  ingredients: string[] | null;
  calories: number | null;
  notes?: string;
  tags?: string[];
};

export type EnhancedDrink = {
  title: NonNullable<Drink['title']>;
  slug: Drink['slug'];
  image: NonNullable<Drink['image']> & {
    blurDataUrl: string;
  };
  ingredients: NonNullable<Drink['ingredients']>;
  calories: NonNullable<Drink['calories']>;
  notes?: Drink['notes'];
  tags?: Drink['tags'];
};

// While this only includes BreadcrumbHandle at the moment, they are
// semantically different and it may end up an intersection of multiple types in
// the future.
export type AppRouteHandle = BreadcrumbHandle;
