CREATE TABLE `collector` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT 'blue' NOT NULL,
	`birthday` integer,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collector_sort_idx` ON `collector` (`sort_order`,`name`);--> statement-breakpoint
ALTER TABLE `collection_item` ADD `collector_id` text REFERENCES collector(id);--> statement-breakpoint
CREATE INDEX `collection_item_collector_idx` ON `collection_item` (`collector_id`);--> statement-breakpoint
ALTER TABLE `wishlist` ADD `collector_id` text REFERENCES collector(id);--> statement-breakpoint
-- Von Hand ergaenzt: Bestandsdaten nachziehen.
-- Vor dieser Migration gab es genau eine Sammlung. Sie bekommt einen Sammler,
-- damit alles Vorhandene zugeordnet bleibt; umbenennen laesst er sich unter
-- Verwaltung -> Sammler.
INSERT INTO `collector` (`id`, `name`, `color`, `sort_order`, `created_at`, `updated_at`)
SELECT 'c0000000-0000-4000-8000-000000000001', 'Sammlung', 'blue', 0, unixepoch(), unixepoch()
WHERE NOT EXISTS (SELECT 1 FROM `collector`);--> statement-breakpoint
UPDATE `collection_item`
SET `collector_id` = (SELECT `id` FROM `collector` ORDER BY `sort_order`, `name` LIMIT 1)
WHERE `collector_id` IS NULL;--> statement-breakpoint
UPDATE `wishlist`
SET `collector_id` = (SELECT `id` FROM `collector` ORDER BY `sort_order`, `name` LIMIT 1)
WHERE `collector_id` IS NULL;
