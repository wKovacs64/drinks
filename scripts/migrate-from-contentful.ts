/**
 * Migration script to move drinks from Contentful to SQLite/ImageKit
 *
 * This script:
 * 1. Fetches all drinks from Contentful GraphQL API
 * 2. For each drink: downloads image from Contentful CDN, uploads to ImageKit, inserts into SQLite
 * 3. Logs progress throughout
 * 4. Is idempotent (skips drinks that already exist by slug)
 *
 * Usage: pnpm migrate:contentful
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { ImageKit } from '@imagekit/nodejs';
import pc from 'picocolors';
import { drinks } from '../app/db/schema';

// Environment variables (loaded directly since we're outside the app)
const CONTENTFUL_URL = process.env.CONTENTFUL_URL;
const CONTENTFUL_ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const DATABASE_URL = process.env.DATABASE_URL ?? './data/drinks.db';

// Validate required env vars
if (!CONTENTFUL_URL) {
  console.error(pc.red('Missing CONTENTFUL_URL environment variable'));
  process.exit(1);
}
if (!CONTENTFUL_ACCESS_TOKEN) {
  console.error(pc.red('Missing CONTENTFUL_ACCESS_TOKEN environment variable'));
  process.exit(1);
}
if (!IMAGEKIT_PRIVATE_KEY) {
  console.error(pc.red('Missing IMAGEKIT_PRIVATE_KEY environment variable'));
  process.exit(1);
}

// Types for Contentful response
type ContentfulDrink = {
  title: string;
  slug: string;
  image: {
    url: string;
  } | null;
  ingredients: string[] | null;
  calories: number | null;
  notes: string | null;
  tags: string[] | null;
  rank: number | null;
};

type ContentfulResponse = {
  data: {
    drinkCollection: {
      items: ContentfulDrink[];
    };
  };
};

// GraphQL query to fetch all drinks
const DRINKS_QUERY = `
  query GetAllDrinks {
    drinkCollection(limit: 200) {
      items {
        title
        slug
        image {
          url
        }
        ingredients
        calories
        notes
        tags
        rank
      }
    }
  }
`;

async function fetchDrinksFromContentful(): Promise<ContentfulDrink[]> {
  console.log(pc.blue('Fetching drinks from Contentful...'));

  const response = await fetch(CONTENTFUL_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONTENTFUL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: DRINKS_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Contentful API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as ContentfulResponse;
  const items = json.data?.drinkCollection?.items ?? [];

  console.log(pc.green(`Found ${items.length} drinks in Contentful`));
  return items;
}

async function downloadImage(url: string): Promise<Buffer> {
  // Contentful image URLs may not have protocol
  const fullUrl = url.startsWith('//') ? `https:${url}` : url;

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToImageKit(
  imagekit: ImageKit,
  imageBuffer: Buffer,
  fileName: string,
): Promise<{ url: string; fileId: string }> {
  // Convert Buffer to base64 data URL for the ImageKit SDK
  const base64File = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  const response = await imagekit.files.upload({
    file: base64File,
    fileName,
    folder: '/drinks',
  });

  if (!response.url || !response.fileId) {
    throw new Error('ImageKit upload failed: missing url or fileId in response');
  }

  return {
    url: response.url,
    fileId: response.fileId,
  };
}

async function migrate() {
  console.log(pc.cyan('\n========================================'));
  console.log(pc.cyan('  Contentful to SQLite Migration'));
  console.log(pc.cyan('========================================\n'));

  // Initialize database
  console.log(pc.blue(`Connecting to database: ${DATABASE_URL}`));
  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema: { drinks } });

  // Initialize ImageKit
  console.log(pc.blue('Initializing ImageKit client...'));
  const imagekit = new ImageKit({
    privateKey: IMAGEKIT_PRIVATE_KEY!,
  });

  // Fetch drinks from Contentful
  const contentfulDrinks = await fetchDrinksFromContentful();

  let skipped = 0;
  let migrated = 0;
  let failed = 0;

  for (const contentfulDrink of contentfulDrinks) {
    const { slug, title } = contentfulDrink;

    // Skip if drink already exists (idempotency)
    const existing = db
      .select({ slug: drinks.slug })
      .from(drinks)
      .where(eq(drinks.slug, slug))
      .get();

    if (existing) {
      console.log(pc.yellow(`  [SKIP] ${title} (${slug}) - already exists`));
      skipped++;
      continue;
    }

    try {
      console.log(pc.blue(`  [MIGRATING] ${title} (${slug})...`));

      // Download and upload image
      let imageUrl: string;
      let imageFileId: string;

      if (contentfulDrink.image?.url) {
        console.log(pc.gray(`    Downloading image from Contentful...`));
        const imageBuffer = await downloadImage(contentfulDrink.image.url);

        console.log(pc.gray(`    Uploading image to ImageKit...`));
        const uploadResult = await uploadToImageKit(imagekit, imageBuffer, `${slug}.jpg`);
        imageUrl = uploadResult.url;
        imageFileId = uploadResult.fileId;
      } else {
        console.log(pc.yellow(`    No image found, using placeholder`));
        imageUrl = `https://via.placeholder.com/400x400.png?text=${encodeURIComponent(slug)}`;
        imageFileId = 'placeholder';
      }

      // Insert into SQLite
      console.log(pc.gray(`    Inserting into database...`));
      db.insert(drinks)
        .values({
          id: createId(),
          slug,
          title,
          imageUrl,
          imageFileId,
          calories: contentfulDrink.calories ?? 0,
          ingredients: contentfulDrink.ingredients ?? [],
          tags: contentfulDrink.tags ?? [],
          notes: contentfulDrink.notes ?? null,
          rank: contentfulDrink.rank ?? 0,
        })
        .run();

      console.log(pc.green(`  [OK] ${title} (${slug})`));
      migrated++;
    } catch (error) {
      console.error(
        pc.red(
          `  [FAILED] ${title} (${slug}): ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      failed++;
    }
  }

  // Close database connection
  sqlite.close();

  // Summary
  console.log(pc.cyan('\n========================================'));
  console.log(pc.cyan('  Migration Summary'));
  console.log(pc.cyan('========================================'));
  console.log(pc.green(`  Migrated: ${migrated}`));
  console.log(pc.yellow(`  Skipped:  ${skipped}`));
  console.log(pc.red(`  Failed:   ${failed}`));
  console.log(pc.cyan('========================================\n'));

  if (failed > 0) {
    process.exit(1);
  }
}

migrate().catch((error) => {
  console.error(pc.red('Migration failed:'), error);
  process.exit(1);
});
