CREATE TABLE "contractors" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"committed" integer NOT NULL,
	"sr_no" integer DEFAULT 1 NOT NULL,
	"site" text
);
--> statement-breakpoint
CREATE TABLE "display_order" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"sr_no" integer NOT NULL,
	CONSTRAINT "display_order_scope_key_pk" PRIMARY KEY("scope","key")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"date" date NOT NULL,
	"contractor_id" text NOT NULL,
	"actual" integer NOT NULL,
	CONSTRAINT "entries_date_contractor_id_pk" PRIMARY KEY("date","contractor_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"username" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"contractor_id" text,
	"category" text,
	"salt" text NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_username_users_username_fk" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "contractors_category_idx" ON "contractors" USING btree ("category","type");--> statement-breakpoint
CREATE INDEX "entries_date_idx" ON "entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "sessions_username_idx" ON "sessions" USING btree ("username");