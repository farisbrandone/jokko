import { Migration } from '@mikro-orm/migrations';

export class Migration20260901000000_init extends Migration {
  override async up(): Promise<void> {
    // ── Catalogue ─────────────────────────────────────────────
    this.addSql(`
      create table "catalog_products" (
        "id" uuid not null,
        "shop_id" uuid not null,
        "slug" varchar(80) not null,
        "name" varchar(160) not null,
        "description" text not null default '',
        "category" varchar(120) not null,
        "price" jsonb not null,
        "compare_at_price" jsonb null,
        "stock" int not null default 0,
        "images" jsonb not null default '[]',
        "attributes" jsonb not null default '{}',
        "status" varchar(20) not null default 'draft',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "catalog_products_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create unique index "catalog_products_shop_slug_uq" on "catalog_products" ("shop_id", "slug");`,
    );
    this.addSql(
      `create index "catalog_products_shop_status_idx" on "catalog_products" ("shop_id", "status");`,
    );

    // ── Row-Level Security : isolation stricte par boutique ────
    this.addSql(`alter table "catalog_products" enable row level security;`);
    this.addSql(`alter table "catalog_products" force row level security;`);
    this.addSql(`
      create policy "catalog_products_tenant_isolation" on "catalog_products"
        using ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid)
        with check ("shop_id" = nullif(current_setting('app.current_shop_id', true), '')::uuid);
    `);

    // ── Transactional Outbox ──────────────────────────────────
    this.addSql(`
      create table "outbox_messages" (
        "id" uuid not null,
        "name" varchar(120) not null,
        "aggregate_id" uuid not null,
        "shop_id" uuid null,
        "payload" jsonb not null default '{}',
        "cache_tags" jsonb not null default '[]',
        "occurred_at" timestamptz not null default now(),
        "processed_at" timestamptz null,
        constraint "outbox_messages_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "outbox_unprocessed_idx" on "outbox_messages" ("occurred_at") where "processed_at" is null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "outbox_messages" cascade;`);
    this.addSql(`drop policy if exists "catalog_products_tenant_isolation" on "catalog_products";`);
    this.addSql(`drop table if exists "catalog_products" cascade;`);
  }
}
