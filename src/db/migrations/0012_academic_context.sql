ALTER TABLE `classes` ADD `academic_year_id` text REFERENCES academic_years(id);--> statement-breakpoint
CREATE INDEX `classes_school_year_id_idx` ON `classes` (`school_id`,`academic_year_id`);--> statement-breakpoint
ALTER TABLE `terms` ADD `closed_at` integer;--> statement-breakpoint
-- Backfill from the label, same school only. A label with no academic_years row stays NULL:
-- scripts/check-teaching-integrity.ts reports those classes for a reviewed fix.
UPDATE `classes` SET `academic_year_id` = (
  SELECT `academic_years`.`id` FROM `academic_years`
  WHERE `academic_years`.`school_id` = `classes`.`school_id` AND `academic_years`.`name` = `classes`.`academic_year`
);
