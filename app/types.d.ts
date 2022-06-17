export interface DrinksResponse {
  errors?: ReadonlyArray<{
    message: string;
    extensions: {
      contentful: {
        code: string;
        requestId: string;
      };
    };
    locations: ReadonlyArray<{
      line: number;
      column: number;
    }>;
    path: ReadonlyArray<string>;
  }>;
  data: {
    drinkCollection: {
      drinks: ReadonlyArray<Drink>;
    } | null;
  };
}

export type DrinkTagsResponse = DrinksResponse & {
  data: {
    drinkCollection: {
      drinks: ReadonlyArray<Pick<Drink, 'tags'>>;
    } | null;
  };
};

export interface Drink {
  title: string;
  slug: string;
  image: {
    url: string;
  };
  ingredients: ReadonlyArray<string>;
  calories: number;
  notes?: string;
  tags?: ReadonlyArray<string>;
}

export interface EnhancedDrink extends Drink {
  image: Drink['image'] & {
    blurDataUrl: string;
  };
}
