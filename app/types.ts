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

/**
 * Extracts the narrowed type from a type guard function.
 *
 * @see https://stackoverflow.com/a/75638165
 */
export type GuardType<TypeGuardFn> = TypeGuardFn extends (x: any, ...rest: any) => x is infer U
  ? U
  : never;
