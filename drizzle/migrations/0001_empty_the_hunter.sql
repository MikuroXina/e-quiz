CREATE TABLE `publish_state` (
	`content_id` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'UNPUBLISHED' NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
