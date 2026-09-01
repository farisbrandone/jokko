import { Migration } from '@mikro-orm/migrations';

export class Migration20260910000000_impersonation extends Migration {
  override async up(): Promise<void> {
    // Journal d'audit des usurpations d'identité support (qui, sur qui, quand).
    this.addSql(`
      create table "impersonation_events" (
        "id" uuid not null default gen_random_uuid(),
        "admin_user_id" uuid not null,
        "target_user_id" uuid not null,
        "created_at" timestamptz not null default now(),
        constraint "impersonation_events_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "impersonation_events_admin_idx" on "impersonation_events" ("admin_user_id", "created_at" desc);`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "impersonation_events" cascade;`);
  }
}
