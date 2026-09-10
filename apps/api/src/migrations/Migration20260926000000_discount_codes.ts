import { Migration } from '@mikro-orm/migrations';

export class Migration20260926000000_discount_codes extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "discount_codes" (
        "id" uuid not null,
        "shop_id" uuid not null,
        "code" varchar(24) not null,
        "kind" varchar(12) not null default 'percent',
        "value" integer not null,
        "min_subtotal" integer null,
        "max_redemptions" integer null,
        "redeemed_count" integer not null default 0,
        "expires_at" timestamptz null,
        "active" boolean not null default true,
        "created_at" timestamptz not null,
        constraint "discount_codes_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `alter table "discount_codes" add constraint "discount_codes_shop_id_code_unique" unique ("shop_id", "code");`,
    );
    this.addSql(`create index "discount_codes_shop_id_index" on "discount_codes" ("shop_id");`);

    this.addSql(`alter table "orders" add column "discount_code" varchar(24) null;`);
    this.addSql(
      `alter table "orders" add column "discount_amount" integer not null default 0;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop column "discount_amount";`);
    this.addSql(`alter table "orders" drop column "discount_code";`);
    this.addSql(`drop table if exists "discount_codes";`);
  }
}
