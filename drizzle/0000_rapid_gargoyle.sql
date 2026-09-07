CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `invite` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text,
	`role` text DEFAULT 'member' NOT NULL,
	`created_by_user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`used_by_user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_hash_unique` ON `invite` (`token_hash`);--> statement-breakpoint
CREATE TABLE `passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`aaguid` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passkey_credential_id_unique` ON `passkey` (`credential_id`);--> statement-breakpoint
CREATE INDEX `passkey_user_idx` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text,
	`count` integer,
	`last_request` integer
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `instruction` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`kind` text NOT NULL,
	`file_path` text,
	`url` text,
	`label` text,
	`page_count` integer,
	`file_size_bytes` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "instruction_source" CHECK(("instruction"."kind" = 'pdf_upload' AND "instruction"."file_path" IS NOT NULL AND "instruction"."url" IS NULL)
          OR ("instruction"."kind" = 'external_url' AND "instruction"."url" IS NOT NULL AND "instruction"."file_path" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `instruction_set_idx` ON `instruction` (`set_id`);--> statement-breakpoint
CREATE TABLE `manufacturer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`website` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `manufacturer_slug_unique` ON `manufacturer` (`slug`);--> statement-breakpoint
CREATE TABLE `set` (
	`id` text PRIMARY KEY NOT NULL,
	`manufacturer_id` text NOT NULL,
	`theme_id` text,
	`set_number` text NOT NULL,
	`name` text NOT NULL,
	`year` integer,
	`piece_count` integer,
	`minifig_count` integer,
	`ean` text,
	`age_range` text,
	`image_url` text,
	`image_path` text,
	`retail_price_cents` integer,
	`external_ids` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturer`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`theme_id`) REFERENCES `theme`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `set_manufacturer_number_unique` ON `set` (`manufacturer_id`,`set_number`);--> statement-breakpoint
CREATE INDEX `set_name_idx` ON `set` (`name`);--> statement-breakpoint
CREATE INDEX `set_ean_idx` ON `set` (`ean`);--> statement-breakpoint
CREATE INDEX `set_theme_idx` ON `set` (`theme_id`);--> statement-breakpoint
CREATE INDEX `set_year_idx` ON `set` (`year`);--> statement-breakpoint
CREATE TABLE `set_tag` (
	`set_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`set_id`, `tag_id`),
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_slug_unique` ON `tag` (`slug`);--> statement-breakpoint
CREATE TABLE `theme` (
	`id` text PRIMARY KEY NOT NULL,
	`manufacturer_id` text NOT NULL,
	`parent_theme_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`manufacturer_id`) REFERENCES `manufacturer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_theme_id`) REFERENCES `theme`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `theme_manufacturer_idx` ON `theme` (`manufacturer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `theme_unique_name` ON `theme` (`manufacturer_id`,`name`);--> statement-breakpoint
CREATE TABLE `collection_item` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`status` text DEFAULT 'owned' NOT NULL,
	`completeness` text DEFAULT 'unknown' NOT NULL,
	`condition` text,
	`location_id` text,
	`acquired_at` integer,
	`acquired_price_cents` integer,
	`acquired_from` text,
	`gifted_by` text,
	`lent_out_to` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `collection_item_set_idx` ON `collection_item` (`set_id`);--> statement-breakpoint
CREATE INDEX `collection_item_status_idx` ON `collection_item` (`status`);--> statement-breakpoint
CREATE INDEX `collection_item_location_idx` ON `collection_item` (`location_id`);--> statement-breakpoint
CREATE TABLE `location` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_location_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `missing_part` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_item_id` text NOT NULL,
	`part_number` text,
	`color_name` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`collection_item_id`) REFERENCES `collection_item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `missing_part_item_idx` ON `missing_part` (`collection_item_id`);--> statement-breakpoint
CREATE TABLE `photo` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text,
	`collection_item_id` text,
	`file_path` text NOT NULL,
	`thumbnail_path` text,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_item_id`) REFERENCES `collection_item`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "photo_single_owner" CHECK(("photo"."set_id" IS NOT NULL) <> ("photo"."collection_item_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `photo_set_idx` ON `photo` (`set_id`);--> statement-breakpoint
CREATE INDEX `photo_item_idx` ON `photo` (`collection_item_id`);--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`occasion` text DEFAULT 'other' NOT NULL,
	`event_date` integer,
	`share_token` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`surprise_mode` integer DEFAULT false NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_share_token_unique` ON `wishlist` (`share_token`);--> statement-breakpoint
CREATE INDEX `wishlist_owner_idx` ON `wishlist` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `wishlist_item` (
	`id` text PRIMARY KEY NOT NULL,
	`wishlist_id` text NOT NULL,
	`set_id` text NOT NULL,
	`priority` integer DEFAULT 2 NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`reserved_by_name` text,
	`reserved_at` integer,
	`reservation_token_hash` text,
	`fulfilled_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`wishlist_id`) REFERENCES `wishlist`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`set_id`) REFERENCES `set`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "wishlist_item_priority" CHECK("wishlist_item"."priority" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_item_unique` ON `wishlist_item` (`wishlist_id`,`set_id`);--> statement-breakpoint
CREATE INDEX `wishlist_item_list_idx` ON `wishlist_item` (`wishlist_id`,`sort_order`);