export type EnhancedDrink = {
  title: string;
  slug: string;
  image: { url: string; blurDataUrl: string };
  ingredients: string[];
  calories: number;
  notes: string | null;
  tags: string[];
};
