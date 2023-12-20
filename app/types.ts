import type { BreadcrumbHandle } from '~/navigation/breadcrumbs';

export interface DrinksResponse {
  errors?: Array<{
    message: string;
    extensions: {
      contentful: {
        code: string;
        requestId: string;
      };
    };
    locations: Array<{
      line: number;
      column: number;
    }>;
    path: Array<string>;
  }>;
  data: {
    drinkCollection: {
      drinks: Array<Drink | null>;
    } | null;
  };
}

export type DrinkTagsResponse = DrinksResponse & {
  data: {
    drinkCollection: {
      drinks: Array<Pick<Drink, 'tags'>>;
    } | null;
  };
};

// Most of the fields will be null if you start to create a new Drink in
// Contentful without finishing it.
export interface Drink {
  title: string | null;
  slug: string;
  image: {
    url: string;
  } | null;
  ingredients: Array<string> | null;
  calories: number | null;
  notes?: string;
  tags?: Array<string>;
}

export interface EnhancedDrink {
  title: NonNullable<Drink['title']>;
  slug: Drink['slug'];
  image: NonNullable<Drink['image']> & {
    blurDataUrl: string;
  };
  ingredients: NonNullable<Drink['ingredients']>;
  calories: NonNullable<Drink['calories']>;
  notes?: Drink['notes'];
  tags?: Drink['tags'];
}

// While this only includes BreadcrumbHandle at the moment, they are
// semantically different and it may end up an intersection of multiple types in
// the future.
export type AppRouteHandle = BreadcrumbHandle;
