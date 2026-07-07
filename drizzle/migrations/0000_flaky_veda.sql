CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`containerId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`containerId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `teacher`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrollment` (
	`courseId` text NOT NULL,
	`studentId` text NOT NULL,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_student` ON `enrollment` (`courseId`,`studentId`);--> statement-breakpoint
CREATE TABLE `quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`containerId` text NOT NULL,
	`order` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`solution` integer NOT NULL,
	`choices` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`containerId`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `id_order` ON `quiz` (`id`,`order`);--> statement-breakpoint
CREATE TABLE `student` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`createdById` text NOT NULL,
	`sentToId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`answer` integer NOT NULL,
	FOREIGN KEY (`createdById`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentToId`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teacher` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
