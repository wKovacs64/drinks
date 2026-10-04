CREATE TABLE IF NOT EXISTS `drinks` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`image_url` text NOT NULL,
	`image_file_id` text NOT NULL,
	`calories` integer NOT NULL,
	`ingredients` text NOT NULL,
	`tags` text NOT NULL,
	`notes` text,
	`rank` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `drinks_slug_unique` ON `drinks` (`slug`);
CREATE INDEX IF NOT EXISTS `drinks_rank_idx` ON `drinks` (`rank`);
CREATE INDEX IF NOT EXISTS `drinks_created_at_idx` ON `drinks` (`created_at`);
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
CREATE INDEX IF NOT EXISTS `drinks_updated_at_idx` ON `drinks` (`updated_at`);