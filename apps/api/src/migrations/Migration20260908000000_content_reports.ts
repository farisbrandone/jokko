import { Migration } from '@mikro-orm/migrations';

export class Migration20260908000000_content_reports extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "content_reports" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null,
        "target_type" varchar(10) not null,
        "target_id" uuid not null,
        "reason" varchar(16) not null,
        "note" text null,
        "reporter_key" varchar(120) not null default '',
        "status" varchar(10) not null default 'pending',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "content_reports_pkey" primary key ("id")
      );
    `);
    // Un même auteur ne peut pas empiler des signalements « pending » sur la même cible.
    this.addSql(`
      create unique index "content_reports_dedup"
        on "content_reports" ("shop_id", "target_type", "target_id", "reporter_key")
        where status = 'pending';
    `);
    this.addSql(
      `create index "content_reports_status_idx" on "content_reports" ("status", "created_at" desc);`,
    );
    this.addSql(`alter table "content_reports" enable row level security;`);
    this.addSql(`alter table "content_reports" force row level security;`);
    this.addSql(`
      create policy "content_reports_tenant_isolation" on "content_reports"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_reports" cascade;`);
  }
}
