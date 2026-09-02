import { Migration } from '@mikro-orm/migrations';

export class Migration20260916000000_team extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "shop_invitations" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null references "shops" ("id") on delete cascade,
        "email" citext not null,
        "role" varchar(20) not null,
        "token_hash" varchar(64) not null,
        "invited_by" uuid null references "users" ("id") on delete set null,
        "expires_at" timestamptz not null,
        "accepted_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        constraint "shop_invitations_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "shop_invitations_token_uq" on "shop_invitations" ("token_hash");`,
    );
    this.addSql(
      `create unique index "shop_invitations_pending_uq" on "shop_invitations" ("shop_id", "email") where "accepted_at" is null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shop_invitations" cascade;`);
  }
}
