CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`container` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`container`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text,
	`name` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `teacher`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrollment` (
	`courseId` text,
	`studentId` text,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_student` ON `enrollment` (`courseId`,`studentId`);--> statement-breakpoint
CREATE TABLE `quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`container` text,
	`solution` integer NOT NULL,
	FOREIGN KEY (`container`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `student` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`createdBy` text,
	`sentTo` text,
	`createdAt` integer NOT NULL,
	`answer` integer NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentTo`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teacher` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
