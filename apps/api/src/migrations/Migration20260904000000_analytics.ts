import { Migration } from '@mikro-orm/migrations';

export class Migration20260904000000_analytics extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "analytics_events" (
        "id" uuid not null,
        "shop_id" uuid not null,
        "name" varchar(30) not null,
        "props" jsonb not null default '{}',
        "session_id" varchar(64) null,
        "created_at" timestamptz not null default now(),
        constraint "analytics_events_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "analytics_events_shop_name_time_idx" on "analytics_events" ("shop_id", "name", "created_at");`,
    );
    this.addSql(`alter table "analytics_events" enable row level security;`);
    this.addSql(`alter table "analytics_events" force row level security;`);
    this.addSql(`
      create policy "analytics_events_tenant_isolation" on "analytics_events"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "analytics_events" cascade;`);
  }
}
