import { Migration } from '@mikro-orm/migrations';

export class Migration20260913000000_phone_otp extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "users" add column "phone" varchar(20) null;`);
    this.addSql(`create unique index "users_phone_uniq" on "users" ("phone") where "phone" is not null;`);
    this.addSql(`alter table "users" alter column "password_hash" drop not null;`);

    this.addSql(`
      create table "otp_challenges" (
        "id" uuid not null default gen_random_uuid(),
        "phone" varchar(20) not null,
        "code_hash" varchar(64) not null,
        "expires_at" timestamptz not null,
        "attempts" int not null default 0,
        "created_at" timestamptz not null default now(),
        constraint "otp_challenges_pkey" primary key ("id")
      );
    `);
    this.addSql(`create index "otp_challenges_phone_idx" on "otp_challenges" ("phone", "created_at" desc);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "otp_challenges" cascade;`);
    this.addSql(`drop index if exists "users_phone_uniq";`);
    this.addSql(`alter table "users" drop column "phone";`);
    this.addSql(`alter table "users" alter column "password_hash" set not null;`);
  }
}
