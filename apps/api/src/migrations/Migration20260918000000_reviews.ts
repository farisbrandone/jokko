import { Migration } from '@mikro-orm/migrations';

export class Migration20260918000000_reviews extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "product_reviews" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null,
        "product_id" uuid not null,
        "rating" smallint not null,
        "title" varchar(120) null,
        "body" text not null,
        "author_name" varchar(80) not null,
        "status" varchar(12) not null default 'pending',
        "created_at" timestamptz not null default now(),
        constraint "product_reviews_pkey" primary key ("id"),
        constraint "product_reviews_rating_ck" check ("rating" between 1 and 5)
      );
    `);
    this.addSql(
      `create index "product_reviews_product_idx" on "product_reviews" ("product_id", "status");`,
    );
    this.addSql(
      `create index "product_reviews_shop_status_idx" on "product_reviews" ("shop_id", "status", "created_at" desc);`,
    );
    this.addSql(`alter table "product_reviews" enable row level security;`);
    this.addSql(`alter table "product_reviews" force row level security;`);
    this.addSql(`
      create policy "product_reviews_tenant_isolation" on "product_reviews"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_reviews" cascade;`);
  }
}
