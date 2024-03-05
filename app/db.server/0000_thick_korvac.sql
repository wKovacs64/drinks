-- Migrating from Prisma
DROP TABLE IF EXISTS `_prisma_migrations`;
--> statement-breakpoint
DROP TABLE IF EXISTS `CacheEntry`;
--> statement-breakpoint
CREATE TABLE `cacheEntry` (
	`id` integer PRIMARY KEY NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cacheEntry_key_unique` ON `cacheEntry` (`key`);
