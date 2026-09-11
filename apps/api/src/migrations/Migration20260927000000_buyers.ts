import { Migration } from '@mikro-orm/migrations';

export class Migration20260927000000_buyers extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "buyers" (
        "id" uuid not null,
        "phone" varchar(20) not null,
        "name" varchar(80) null,
        "addresses" jsonb not null default '[]',
        "created_at" timestamptz not null,
        constraint "buyers_pkey" primary key ("id")
      );
    `);
    this.addSql(`alter table "buyers" add constraint "buyers_phone_unique" unique ("phone");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "buyers";`);
  }
}
