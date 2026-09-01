import { Migration } from '@mikro-orm/migrations';

export class Migration20260914000000_oauth extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "oauth_identities" (
        "id" uuid not null default gen_random_uuid(),
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "provider" varchar(20) not null,
        "provider_account_id" varchar(255) not null,
        "email" varchar(320) null,
        "created_at" timestamptz not null default now(),
        constraint "oauth_identities_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "oauth_identities_provider_account_uq" on "oauth_identities" ("provider", "provider_account_id");`,
    );
    this.addSql(
      `create index "oauth_identities_user_idx" on "oauth_identities" ("user_id");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "oauth_identities" cascade;`);
  }
}
