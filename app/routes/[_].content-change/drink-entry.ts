import { z } from 'zod';

// Reusable sys link schema
const sysLinkSchema = z.object({
  sys: z.object({
    type: z.literal('Link'),
    linkType: z.string(), // e.g., "Asset", "Space", "Environment", "ContentType", "User"
    id: z.string(),
  }),
});

// Asset link specifically
const assetLinkSchema = z.object({
  sys: z.object({
    type: z.literal('Link'),
    linkType: z.literal('Asset'),
    id: z.string(),
  }),
});

// Locale wrapper for common en-US usage
const localeString = z.object({
  'en-US': z.string(),
});

const localeNumber = z.object({
  'en-US': z.number(),
});

const localeStringArray = z.object({
  'en-US': z.array(z.string()),
});

const localeAssetLink = z.object({
  'en-US': assetLinkSchema,
});

// metadata
const metadataSchema = z.object({
  tags: z.array(z.unknown()), // Contentful tags often objects; empty array here
  concepts: z.array(z.unknown()), // same note as tags
});

// fields specific to this "drink" content type
const drinkFieldsSchema = z.object({
  title: localeString,
  slug: localeString,
  ingredients: localeStringArray,
  tags: localeStringArray,
  calories: localeNumber,
  image: localeAssetLink,
  notes: localeString,
  rank: localeNumber,
});

// sys for the entry
const entrySysSchema = z.object({
  type: z.literal('Entry'),
  id: z.string(),
  space: sysLinkSchema.extend({
    sys: sysLinkSchema.shape.sys.extend({
      linkType: z.literal('Space'),
    }),
  }),
  environment: sysLinkSchema.extend({
    sys: sysLinkSchema.shape.sys.extend({
      linkType: z.literal('Environment'),
      id: z.string(),
    }),
  }),
  contentType: sysLinkSchema.extend({
    sys: sysLinkSchema.shape.sys.extend({
      linkType: z.literal('ContentType'),
      id: z.literal('drink'),
    }),
  }),
  createdBy: sysLinkSchema.extend({
    sys: sysLinkSchema.shape.sys.extend({
      linkType: z.literal('User'),
    }),
  }),
  updatedBy: sysLinkSchema.extend({
    sys: sysLinkSchema.shape.sys.extend({
      linkType: z.literal('User'),
    }),
  }),
  revision: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  publishedVersion: z.number().int().nonnegative().optional(),
});

// Full entry schema
export const drinkEntrySchema = z.object({
  metadata: metadataSchema,
  fields: drinkFieldsSchema,
  sys: entrySysSchema,
});

export type DrinkEntry = z.infer<typeof drinkEntrySchema>;
