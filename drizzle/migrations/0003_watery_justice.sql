CREATE TABLE `first_view` (
	`whoId` text NOT NULL,
	`readId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`whoId`, `readId`),
	FOREIGN KEY (`whoId`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`readId`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_submission` (
	`createdById` text NOT NULL,
	`sentToId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`answer` integer NOT NULL,
	FOREIGN KEY (`createdById`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentToId`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_submission`("createdById", "sentToId", "createdAt", "answer") SELECT "createdById", "sentToId", "createdAt", "answer" FROM `submission`;--> statement-breakpoint
DROP TABLE `submission`;--> statement-breakpoint
ALTER TABLE `__new_submission` RENAME TO `submission`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `created_by__sent_to_id__created_at` ON `submission` (`createdById`,`sentToId`,`createdAt`);