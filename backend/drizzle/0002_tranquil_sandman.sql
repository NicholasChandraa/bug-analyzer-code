CREATE TYPE "public"."repository_source_type" AS ENUM('remote', 'local');--> statement-breakpoint
ALTER TABLE "repositories" ALTER COLUMN "repo_url" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "source_type" "repository_source_type" DEFAULT 'remote' NOT NULL;