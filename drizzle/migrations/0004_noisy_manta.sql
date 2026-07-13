PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_publish_state` (
	`contentId` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'UNPUBLISHED' NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_publish_state`("contentId", "state", "updatedAt") SELECT "contentId", "state", "updatedAt" FROM `publish_state`;--> statement-breakpoint
DROP TABLE `publish_state`;--> statement-breakpoint
ALTER TABLE `__new_publish_state` RENAME TO `publish_state`;--> statement-breakpoint
PRAGMA foreign_keys=ON;