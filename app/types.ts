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
      drinks: Array<Drink>;
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

export interface Drink {
  title: string;
  slug: string;
  image: {
    url: string;
  };
  ingredients: Array<string>;
  calories: number;
  notes?: string;
  tags?: Array<string>;
}

export interface EnhancedDrink extends Drink {
  image: Drink['image'] & {
    blurDataUrl: string;
  };
}
