import { Migration } from '@mikro-orm/migrations';

export class Migration20260903000000_messaging extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "conversations" (
        "id" uuid not null,
        "shop_id" uuid not null,
        "buyer_name" varchar(80) not null,
        "buyer_phone" varchar(20) not null,
        "buyer_email" varchar(320) null,
        "product_id" uuid null,
        "product_name" varchar(160) null,
        "status" varchar(10) not null default 'open',
        "buyer_token_hash" varchar(64) not null,
        "last_message_at" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        constraint "conversations_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "conversations_shop_idx" on "conversations" ("shop_id", "status", "last_message_at" desc);`,
    );
    this.addSql(`alter table "conversations" enable row level security;`);
    this.addSql(`alter table "conversations" force row level security;`);
    this.addSql(`
      create policy "conversations_tenant_isolation" on "conversations"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);

    this.addSql(`
      create table "messages" (
        "id" uuid not null,
        "conversation_id" uuid not null references "conversations" ("id") on delete cascade,
        "shop_id" uuid not null,
        "sender" varchar(10) not null,
        "body" text not null,
        "created_at" timestamptz not null default now(),
        constraint "messages_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "messages_conversation_idx" on "messages" ("conversation_id", "created_at");`,
    );
    this.addSql(`alter table "messages" enable row level security;`);
    this.addSql(`alter table "messages" force row level security;`);
    this.addSql(`
      create policy "messages_tenant_isolation" on "messages"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "messages" cascade;`);
    this.addSql(`drop table if exists "conversations" cascade;`);
  }
}
