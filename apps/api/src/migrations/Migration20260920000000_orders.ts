import { Migration } from '@mikro-orm/migrations';

export class Migration20260920000000_orders extends Migration {
  override async up(): Promise<void> {
    // Pas de RLS : comme `subscriptions`/`billing_payments`, chaque requête filtre
    // explicitement `shop_id` ; l'accès acheteur est protégé par un jeton.
    this.addSql(`
      create table "orders" (
        "id" uuid not null default gen_random_uuid(),
        "shop_id" uuid not null,
        "buyer_name" varchar(80) not null,
        "buyer_phone" varchar(20) not null,
        "buyer_email" varchar(320) null,
        "note" varchar(500) null,
        "lines" jsonb not null default '[]',
        "subtotal" int not null,
        "currency" varchar(3) not null,
        "status" varchar(16) not null default 'pending_payment',
        "buyer_token_hash" varchar(64) not null,
        "tx_ref" varchar(80) null,
        "provider_tx_id" varchar(120) null,
        "created_at" timestamptz not null default now(),
        "paid_at" timestamptz null,
        "fulfilled_at" timestamptz null,
        constraint "orders_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `create index "orders_shop_idx" on "orders" ("shop_id", "status", "created_at" desc);`,
    );
    this.addSql(
      `create unique index "orders_tx_ref_uq" on "orders" ("tx_ref") where "tx_ref" is not null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "orders" cascade;`);
  }
}
