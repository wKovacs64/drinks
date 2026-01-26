import type { NewUser, NewDrink } from '#/app/db/schema';

export const TEST_ADMIN_USER: NewUser = {
  id: 'test-admin-id',
  email: 'admin@test.com',
  name: 'Test Admin',
  avatarUrl: null,
  role: 'admin',
};

export const TEST_DRINKS: Omit<NewDrink, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'test-drink-1',
    slug: 'test-margarita',
    title: 'Test Margarita',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Margarita',
    imageFileId: 'test-placeholder',
    calories: 200,
    ingredients: ['2 oz tequila', '1 oz lime juice', '1 oz triple sec'],
    tags: ['tequila', 'citrus'],
    notes: 'A classic test margarita',
    rank: 10,
  },
  {
    id: 'test-drink-2',
    slug: 'test-mojito',
    title: 'Test Mojito',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=Mojito',
    imageFileId: 'test-placeholder',
    calories: 150,
    ingredients: ['2 oz rum', '1 oz lime juice', 'mint leaves', 'soda water'],
    tags: ['rum', 'citrus', 'mint'],
    notes: 'A refreshing test mojito',
    rank: 5,
  },
  {
    id: 'test-drink-3',
    slug: 'test-old-fashioned',
    title: 'Test Old Fashioned',
    imageUrl: 'https://via.placeholder.com/400x400.png?text=OldFashioned',
    imageFileId: 'test-placeholder',
    calories: 180,
    ingredients: ['2 oz bourbon', '1 sugar cube', 'angostura bitters'],
    tags: ['bourbon', 'classic'],
    notes: null,
    rank: 0,
  },
];
