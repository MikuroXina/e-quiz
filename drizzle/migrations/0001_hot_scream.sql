PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content` (
	`id` text PRIMARY KEY NOT NULL,
	`container` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`container`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_content`("id", "container", "title", "content") SELECT "id", "container", "title", "content" FROM `content`;--> statement-breakpoint
DROP TABLE `content`;--> statement-breakpoint
ALTER TABLE `__new_content` RENAME TO `content`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_course` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `teacher`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_course`("id", "owner", "name") SELECT "id", "owner", "name" FROM `course`;--> statement-breakpoint
DROP TABLE `course`;--> statement-breakpoint
ALTER TABLE `__new_course` RENAME TO `course`;--> statement-breakpoint
CREATE TABLE `__new_enrollment` (
	`courseId` text NOT NULL,
	`studentId` text NOT NULL,
	FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_enrollment`("courseId", "studentId") SELECT "courseId", "studentId" FROM `enrollment`;--> statement-breakpoint
DROP TABLE `enrollment`;--> statement-breakpoint
ALTER TABLE `__new_enrollment` RENAME TO `enrollment`;--> statement-breakpoint
CREATE UNIQUE INDEX `course_student` ON `enrollment` (`courseId`,`studentId`);--> statement-breakpoint
CREATE TABLE `__new_quiz` (
	`id` text PRIMARY KEY NOT NULL,
	`container` text NOT NULL,
	`solution` integer NOT NULL,
	FOREIGN KEY (`container`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_quiz`("id", "container", "solution") SELECT "id", "container", "solution" FROM `quiz`;--> statement-breakpoint
DROP TABLE `quiz`;--> statement-breakpoint
ALTER TABLE `__new_quiz` RENAME TO `quiz`;--> statement-breakpoint
CREATE TABLE `__new_submission` (
	`createdBy` text NOT NULL,
	`sentTo` text NOT NULL,
	`createdAt` integer NOT NULL,
	`answer` integer NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sentTo`) REFERENCES `quiz`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_submission`("createdBy", "sentTo", "createdAt", "answer") SELECT "createdBy", "sentTo", "createdAt", "answer" FROM `submission`;--> statement-breakpoint
DROP TABLE `submission`;--> statement-breakpoint
ALTER TABLE `__new_submission` RENAME TO `submission`;