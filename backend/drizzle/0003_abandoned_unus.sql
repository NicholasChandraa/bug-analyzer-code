ALTER TABLE "repositories" DROP COLUMN "source_type";--> statement-breakpoint
ALTER TABLE "repositories" DROP COLUMN "repo_url";--> statement-breakpoint
ALTER TABLE "repositories" DROP COLUMN "default_branch";--> statement-breakpoint
DROP TYPE "public"."repository_source_type";