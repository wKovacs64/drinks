import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { getDb } from '#/app/db/client.server';
import { drinks, type Drink, type NewDrink } from '#/app/db/schema';

export async function getAllDrinks(): Promise<Drink[]> {
  const db = getDb();
  return db.query.drinks.findMany({
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });
}

export async function getDrinkBySlug(slug: string): Promise<Drink | undefined> {
  const db = getDb();
  return db.query.drinks.findFirst({
    where: eq(drinks.slug, slug),
  });
}

export async function getDrinksByTag(tag: string): Promise<Drink[]> {
  const db = getDb();
  // Query drinks where tags JSON array contains the tag
  const allDrinks = await db.query.drinks.findMany({
    orderBy: [desc(drinks.rank), desc(drinks.createdAt)],
  });

  return allDrinks.filter((drink) => drink.tags.includes(tag));
}

export async function getAllTags(): Promise<string[]> {
  const db = getDb();
  const allDrinks = await db.query.drinks.findMany({
    columns: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const drink of allDrinks) {
    for (const tag of drink.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

export async function createDrink(
  data: Omit<NewDrink, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Drink> {
  const db = getDb();
  const [drink] = await db
    .insert(drinks)
    .values({
      id: createId(),
      ...data,
    })
    .returning();

  return drink;
}

export async function updateDrink(
  id: string,
  data: Partial<Omit<NewDrink, 'id' | 'createdAt'>>,
): Promise<Drink> {
  const db = getDb();
  const [drink] = await db
    .update(drinks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(drinks.id, id))
    .returning();

  return drink;
}

export async function deleteDrink(id: string): Promise<void> {
  const db = getDb();
  await db.delete(drinks).where(eq(drinks.id, id));
}
