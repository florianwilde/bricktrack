CREATE TABLE `price_point` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`price_cents` integer NOT NULL,
	`condition` text DEFAULT 'new' NOT NULL,
	`source` text,
	`observed_at` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "price_point_positive" CHECK("price_point"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `price_point_set_idx` ON `price_point` (`set_id`,`observed_at`);